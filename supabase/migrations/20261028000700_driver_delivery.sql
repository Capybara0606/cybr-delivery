begin;
alter table public.driver_locations add column is_simulated boolean not null default false;
create function public.driver_progress(p_order uuid,p_action text,p_code_hash text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders; a public.driver_assignments;
begin
 select * into o from public.orders where id=p_order for update;
 select x.* into a from public.driver_assignments x join public.drivers d on d.id=x.driver_id
 where x.order_id=p_order and x.status='accepted' and d.user_id=auth.uid() and private.has_role(d.restaurant_id,array['driver']::public.member_role[]) for update of x;
 if not found then raise exception 'Assignment access denied' using errcode='42501'; end if;
 if p_action='picked_up' and o.status='assigned' then update public.orders set status='picked_up' where id=p_order;
 elsif p_action='on_the_way' and o.status='picked_up' then update public.orders set status='on_the_way' where id=p_order;
 elsif p_action='arrived' and o.status='on_the_way' then
  if not exists(select 1 from public.order_status_history where order_id=p_order and event='driver_arrived') then
   insert into public.order_status_history(restaurant_id,order_id,actor_id,previous_status,new_status,event) values(o.restaurant_id,o.id,auth.uid(),o.status,o.status,'driver_arrived');
  end if;
 elsif p_action='delivered' and o.status='on_the_way' then
  if o.delivery_code_attempts>=5 then return jsonb_build_object('ok',false,'error','Código bloqueado. Contacta al restaurante.'); end if;
  if p_code_hash is null or p_code_hash<>o.delivery_code_hash then
   update public.orders set delivery_code_attempts=delivery_code_attempts+1 where id=p_order;
   -- Return instead of RAISE: wrong attempts must commit, not roll back.
   return jsonb_build_object('ok',false,'error','Código incorrecto. Verifica con el cliente.','remaining',4-o.delivery_code_attempts);
  end if;
  update public.orders set status='delivered' where id=p_order;
  update public.driver_assignments set status='completed',ended_at=now() where id=a.id;
  update public.payments set status='collected',collected_at=now() where order_id=p_order and status='pending';
  delete from public.driver_locations where assignment_id=a.id;
 else raise exception 'Invalid driver transition' using errcode='23514'; end if;
 return jsonb_build_object('ok',true);
end $$;
create function public.publish_driver_location(p_assignment uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_recorded_at timestamptz,p_simulated boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a public.driver_assignments; o public.orders;
begin
 select order_id into a.order_id from public.driver_assignments where id=p_assignment;
 -- Hold order first; cancellation/delivery cannot race and leave a location behind.
 select * into o from public.orders where id=a.order_id for share;
 select x.* into a from public.driver_assignments x join public.drivers d on d.id=x.driver_id
 where x.id=p_assignment and x.status='accepted' and d.user_id=auth.uid() and private.has_role(d.restaurant_id,array['driver']::public.member_role[]) for share of x;
 if not found or o.status<>'on_the_way' then raise exception 'Active delivery required' using errcode='42501'; end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180) or p_accuracy is null or not(p_accuracy between 0 and 1000)
 or p_recorded_at is null or p_recorded_at<now()-interval '30 seconds' or p_recorded_at>now()+interval '10 seconds' then raise exception 'Invalid or stale GPS position' using errcode='22023'; end if;
 if p_simulated and not exists(select 1 from public.restaurants where id=o.restaurant_id and is_demo) then raise exception 'Simulation disabled for real restaurants' using errcode='42501'; end if;
 insert into public.driver_locations as l(assignment_id,restaurant_id,location,accuracy_m,recorded_at,received_at,is_simulated)
 values(a.id,a.restaurant_id,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,p_accuracy,p_recorded_at,now(),p_simulated)
 on conflict(assignment_id) do update set location=excluded.location,accuracy_m=excluded.accuracy_m,recorded_at=excluded.recorded_at,received_at=now(),is_simulated=excluded.is_simulated where excluded.recorded_at>l.recorded_at;
 if not found then raise exception 'Position is older than last known GPS' using errcode='22023'; end if;
end $$;
create function public.driver_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.drivers; active jsonb;
begin
 select * into d from public.drivers where user_id=auth.uid() and private.has_role(restaurant_id,array['driver']::public.member_role[]);
 if not found then raise exception 'Driver required' using errcode='42501'; end if;
 select jsonb_build_object('assignment_id',a.id,'assignment_status',a.status,'id',o.id,'order_number',o.order_number,'status',o.status,'customer_name',o.customer_name,'customer_phone',o.customer_phone,
 'total_cents',o.total_cents,'address',ad.address,'instructions',ad.instructions,'destination',jsonb_build_object('lat',extensions.st_y(ad.location::extensions.geometry),'lng',extensions.st_x(ad.location::extensions.geometry)),
 'pickup_address',r.pickup_address,'pickup',jsonb_build_object('lat',extensions.st_y(r.location::extensions.geometry),'lng',extensions.st_x(r.location::extensions.geometry)),
 'is_demo',r.is_demo,'items',(select coalesce(jsonb_agg(jsonb_build_object('name',i.product_name,'quantity',i.quantity)),'[]') from public.order_items i where i.order_id=o.id))
 into active from public.driver_assignments a join public.orders o on o.id=a.order_id join public.delivery_addresses ad on ad.id=o.address_id join public.restaurants r on r.id=o.restaurant_id
 where a.driver_id=d.id and a.status in ('offered','accepted');
 return jsonb_build_object('driver',jsonb_build_object('id',d.id,'full_name',d.full_name,'is_available',d.is_available),'active',active,
 'history',(select coalesce(jsonb_agg(x order by x.ended_at desc),'[]') from (select o.order_number,o.status,o.total_cents,a.ended_at from public.driver_assignments a join public.orders o on o.id=a.order_id where a.driver_id=d.id and a.status in ('completed','rejected','cancelled','expired') order by a.ended_at desc limit 30) x));
end $$;
create function public.staff_active_locations(p_restaurant uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_role(p_restaurant,array['owner','staff']::public.member_role[]) then raise exception 'Staff required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('driver_name',d.full_name,'order_number',o.order_number,'lat',extensions.st_y(l.location::extensions.geometry),'lng',extensions.st_x(l.location::extensions.geometry),
 'recorded_at',l.recorded_at,'is_stale',l.received_at<now()-interval '30 seconds','is_simulated',l.is_simulated)),'[]')
 from public.driver_locations l join public.driver_assignments a on a.id=l.assignment_id join public.drivers d on d.id=a.driver_id join public.orders o on o.id=a.order_id
 where a.restaurant_id=p_restaurant and a.status='accepted' and o.status='on_the_way');
end $$;
-- Limited history retention and dormant offers are maintenance operations, not public endpoints.
create function public.cleanup_delivery_data() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.driver_locations where received_at<now()-interval '24 hours';
 delete from private.request_limits where window_start<now()-interval '2 days';
end $$;
revoke all on function public.driver_progress(uuid,text,text),public.publish_driver_location(uuid,double precision,double precision,double precision,timestamptz,boolean),public.driver_workspace(),public.staff_active_locations(uuid),public.cleanup_delivery_data() from public,anon,authenticated;
grant execute on function public.driver_progress(uuid,text,text),public.publish_driver_location(uuid,double precision,double precision,double precision,timestamptz,boolean),public.driver_workspace(),public.staff_active_locations(uuid) to authenticated;
grant execute on function public.cleanup_delivery_data() to service_role;
-- Surface demo provenance; never mislabel a simulated position as real.
create or replace function public.guest_order_tracking(p_token_hash text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare o public.orders; address_row public.delivery_addresses; result jsonb;
begin
 select * into o from public.orders where tracking_token_hash=p_token_hash and created_at>now()-interval '7 days';
 if not found then return null; end if;
 select * into address_row from public.delivery_addresses where id=o.address_id;
 result:=jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'total_cents',o.total_cents,'customer_name',o.customer_name,'address',address_row.address,
 'destination',jsonb_build_object('lat',extensions.st_y(address_row.location::extensions.geometry),'lng',extensions.st_x(address_row.location::extensions.geometry)),
 'created_at',o.created_at,'_idempotency',o.idempotency_key,'_request_hash',o.request_hash,
 'items',(select coalesce(jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity,'line_total_cents',line_total_cents)),'[]') from public.order_items where order_id=o.id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('status',new_status,'event',event,'created_at',created_at) order by id),'[]') from public.order_status_history where order_id=o.id));
 if o.status='on_the_way' then
  result:=result||jsonb_build_object('location',(select jsonb_build_object('lat',extensions.st_y(l.location::extensions.geometry),'lng',extensions.st_x(l.location::extensions.geometry),'accuracy_m',l.accuracy_m,'recorded_at',l.recorded_at,'is_stale',l.received_at<now()-interval '30 seconds','is_simulated',l.is_simulated)
  from public.driver_locations l join public.driver_assignments a on a.id=l.assignment_id where a.order_id=o.id and a.status='accepted'));
 end if;
 return result;
end $$;
commit;
