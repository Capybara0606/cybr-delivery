begin;
-- History must describe this driver assignment, not credit a rejected order delivered by somebody else.
create or replace function public.driver_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 'history',(select coalesce(jsonb_agg(x order by x.ended_at desc),'[]') from (select o.order_number,o.status,a.status as assignment_status,o.total_cents,a.ended_at from public.driver_assignments a join public.orders o on o.id=a.order_id where a.driver_id=d.id and a.status in ('completed','rejected','cancelled','expired') order by a.ended_at desc limit 30) x));
end $$;
commit;
