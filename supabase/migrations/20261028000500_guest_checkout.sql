begin;
create table private.request_limits (
 key text primary key, window_start timestamptz not null default now(), requests integer not null default 0
);
revoke all on private.request_limits from public,anon,authenticated;
create function public.consume_request_limit(p_key text,p_max integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if length(p_key)>150 or p_max<1 or p_seconds<1 then raise exception 'Invalid limit' using errcode='22023'; end if;
 insert into private.request_limits as l(key,window_start,requests) values(p_key,now(),1)
 on conflict(key) do update set requests=case when l.window_start<now()-make_interval(secs=>p_seconds) then 1 else l.requests+1 end,
 window_start=case when l.window_start<now()-make_interval(secs=>p_seconds) then now() else l.window_start end returning requests into n;
 delete from private.request_limits where window_start<now()-interval '2 days';
 return n<=p_max;
end $$;

create function public.create_guest_order(
 p_restaurant uuid,p_name text,p_phone text,p_address text,p_instructions text,p_lat double precision,p_lng double precision,
 p_items jsonb,p_idempotency uuid,p_request_hash text,p_token_hash text,p_code_hash text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.restaurant_settings; r public.restaurants; existing public.orders; cart jsonb; item jsonb; prod public.products;
 choice jsonb; option_row record; option_group record; unit_cents integer; subtotal integer:=0; qty integer; address_id uuid; order_id uuid; line_id uuid;
 local_time timestamp; periods jsonb; period jsonb; weekday text; is_open boolean:=false;
begin
 -- Serialize retries across connections; scope includes the restaurant, without trusting browser prices.
 perform pg_advisory_xact_lock(hashtextextended(p_restaurant::text||p_idempotency::text,0));
 select * into existing from public.orders where restaurant_id=p_restaurant and idempotency_key=p_idempotency;
 if found then
  if existing.request_hash<>p_request_hash or existing.tracking_token_hash<>p_token_hash then raise exception 'Idempotency key reused with different request' using errcode='23505'; end if;
  return jsonb_build_object('id',existing.id,'order_number',existing.order_number,'total_cents',existing.total_cents,'status',existing.status);
 end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180) then raise exception 'Invalid coordinates' using errcode='22023'; end if;
 if length(trim(p_name)) not between 1 and 120 or p_phone !~ '^\+?[0-9 ()-]{8,25}$' or length(p_address) not between 5 and 500 or length(p_instructions)>1000 then raise exception 'Invalid customer details' using errcode='22023'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid basket' using errcode='22023'; end if;
 select * into r from public.restaurants where id=p_restaurant;
 select * into s from public.restaurant_settings where restaurant_id=p_restaurant for share;
 if not found or not s.is_accepting_orders then raise exception 'Restaurant is not accepting orders' using errcode='23514'; end if;
 local_time:=now() at time zone r.time_zone;
 weekday:=(array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])[extract(dow from local_time)::integer+1];
 periods:=coalesce(s.opening_hours->weekday,'[]'::jsonb);
 for period in select value from jsonb_array_elements(periods) loop
  if local_time::time >= (period->>0)::time and local_time::time < (period->>1)::time then is_open:=true; end if;
 end loop;
 if not is_open then raise exception 'Restaurant is closed' using errcode='23514'; end if;
 if not extensions.st_dwithin(r.location,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,s.delivery_radius_m) then raise exception 'Outside delivery area' using errcode='23514'; end if;
 cart:='[]'::jsonb;
 for item in select value from jsonb_array_elements(p_items) loop
  qty:=(item->>'quantity')::integer;
  if qty is null or qty not between 1 and 99 then raise exception 'Invalid quantity' using errcode='23514'; end if;
  select p.* into prod from public.products p join public.categories c on c.id=p.category_id
  where p.id=(item->>'product_id')::uuid and p.restaurant_id=p_restaurant and p.is_available and c.is_active for share of p,c;
  if not found then raise exception 'Product unavailable' using errcode='23514'; end if;
  if jsonb_typeof(coalesce(item->'options','[]'::jsonb))<>'array' then raise exception 'Invalid options' using errcode='22023'; end if;
  if (select count(*) from jsonb_array_elements_text(coalesce(item->'options','[]'::jsonb)))<>(select count(distinct value) from jsonb_array_elements_text(coalesce(item->'options','[]'::jsonb))) then raise exception 'Duplicate option' using errcode='23514'; end if;
  unit_cents:=prod.price_cents;
  for choice in select value from jsonb_array_elements(coalesce(item->'options','[]'::jsonb)) loop
   select v.*,o.name as option_name into option_row from public.product_option_values v join public.product_options o on o.id=v.option_id
   where v.id=(choice#>>'{}')::uuid and v.restaurant_id=p_restaurant and o.product_id=prod.id and v.is_available for share of v,o;
   if not found then raise exception 'Option unavailable' using errcode='23514'; end if;
   unit_cents:=unit_cents+option_row.extra_price_cents;
  end loop;
  for option_group in select * from public.product_options where product_id=prod.id loop
   if (select count(*) from jsonb_array_elements_text(coalesce(item->'options','[]'::jsonb)) x join public.product_option_values v on v.id=x.value::uuid where v.option_id=option_group.id) not between option_group.min_choices and option_group.max_choices then raise exception 'Invalid option selection' using errcode='23514'; end if;
  end loop;
  subtotal:=subtotal+unit_cents*qty;
  cart:=cart||jsonb_build_array(item||jsonb_build_object('name',prod.name,'unit_cents',unit_cents,'quantity',qty));
 end loop;
 insert into public.delivery_addresses(restaurant_id,address,instructions,location)
 values(p_restaurant,p_address,coalesce(p_instructions,''),extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography) returning id into address_id;
 insert into public.orders(restaurant_id,address_id,customer_name,customer_phone,subtotal_cents,delivery_fee_cents,idempotency_key,request_hash,tracking_token_hash,delivery_code_hash)
 values(p_restaurant,address_id,trim(p_name),p_phone,subtotal,s.delivery_fee_cents,p_idempotency,p_request_hash,p_token_hash,p_code_hash) returning id into order_id;
 for item in select value from jsonb_array_elements(cart) loop
  insert into public.order_items(restaurant_id,order_id,product_id,product_name,unit_price_cents,quantity,line_total_cents)
  values(p_restaurant,order_id,(item->>'product_id')::uuid,item->>'name',(item->>'unit_cents')::integer,(item->>'quantity')::integer,(item->>'unit_cents')::integer*(item->>'quantity')::integer) returning id into line_id;
  for choice in select value from jsonb_array_elements(coalesce(item->'options','[]'::jsonb)) loop
   select v.*,o.name as option_name into option_row from public.product_option_values v join public.product_options o on o.id=v.option_id where v.id=(choice#>>'{}')::uuid;
   insert into public.order_item_options(restaurant_id,order_item_id,option_name,value_name,extra_price_cents) values(p_restaurant,line_id,option_row.option_name,option_row.name,option_row.extra_price_cents);
  end loop;
 end loop;
 insert into public.payments(restaurant_id,order_id,amount_cents) values(p_restaurant,order_id,subtotal+s.delivery_fee_cents);
 return (select jsonb_build_object('id',id,'order_number',order_number,'total_cents',total_cents,'status',status) from public.orders where id=order_id);
end $$;

create function public.guest_order_tracking(p_token_hash text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare o public.orders; address_row public.delivery_addresses; result jsonb;
begin
 select * into o from public.orders where tracking_token_hash=p_token_hash and created_at>now()-interval '7 days';
 if not found then return null; end if;
 select * into address_row from public.delivery_addresses where id=o.address_id;
 result:=jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'total_cents',o.total_cents,'customer_name',o.customer_name,'address',address_row.address,
 'destination',jsonb_build_object('lat',extensions.st_y(address_row.location::extensions.geometry),'lng',extensions.st_x(address_row.location::extensions.geometry)),'created_at',o.created_at,'_idempotency',o.idempotency_key,'_request_hash',o.request_hash,
 'items',(select coalesce(jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity,'line_total_cents',line_total_cents)),'[]') from public.order_items where order_id=o.id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('status',new_status,'event',event,'created_at',created_at) order by id),'[]') from public.order_status_history where order_id=o.id));
 if o.status='on_the_way' then
  result:=result||jsonb_build_object('location',(select jsonb_build_object('lat',extensions.st_y(l.location::extensions.geometry),'lng',extensions.st_x(l.location::extensions.geometry),'accuracy_m',l.accuracy_m,'recorded_at',l.recorded_at,'is_stale',l.received_at<now()-interval '30 seconds')
  from public.driver_locations l join public.driver_assignments a on a.id=l.assignment_id where a.order_id=o.id and a.status='accepted'));
 end if;
 return result;
end $$;
revoke all on function public.consume_request_limit(text,integer,integer),public.create_guest_order(uuid,text,text,text,text,double precision,double precision,jsonb,uuid,text,text,text),public.guest_order_tracking(text) from public,anon,authenticated;
grant execute on function public.consume_request_limit(text,integer,integer),public.create_guest_order(uuid,text,text,text,text,double precision,double precision,jsonb,uuid,text,text,text),public.guest_order_tracking(text) to service_role;
create function public.restaurant_public_location(p_restaurant uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('lat',extensions.st_y(location::extensions.geometry),'lng',extensions.st_x(location::extensions.geometry)) from public.restaurants where id=p_restaurant;
$$;
revoke all on function public.restaurant_public_location(uuid) from public;
grant execute on function public.restaurant_public_location(uuid) to anon,authenticated,service_role;

commit;
