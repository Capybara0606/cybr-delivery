begin;
-- Public access to an abandoned last-known position expires before the next scheduled cleanup.
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
  from public.driver_locations l join public.driver_assignments a on a.id=l.assignment_id where a.order_id=o.id and a.status='accepted' and l.received_at>now()-interval '24 hours'));
 end if;
 return result;
end $$;
commit;
