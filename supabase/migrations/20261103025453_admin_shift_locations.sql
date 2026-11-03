-- Narrow staff-only view of active shifts; never grant browser SELECT on the
-- private position table or publish it to Realtime/customer channels.
create function public.staff_shift_locations(p_restaurant uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_role(p_restaurant,array['owner','staff']::public.member_role[]) then
  raise exception 'Staff access required' using errcode='42501';
 end if;
 return (
  select coalesce(jsonb_agg(jsonb_build_object(
   'driver_id',d.id,'driver_name',d.full_name,
   'lat',case when l.received_at>now()-interval '90 seconds' then extensions.st_y(l.location::extensions.geometry) else null end,
   'lng',case when l.received_at>now()-interval '90 seconds' then extensions.st_x(l.location::extensions.geometry) else null end,
   'accuracy_m',case when l.received_at>now()-interval '90 seconds' then l.accuracy_m else null end,
   'received_at',l.received_at,'recorded_at',l.recorded_at,
   'age_seconds',case when l.received_at is not null then greatest(0,extract(epoch from now()-l.received_at)) else null end,
   'order_number',trip.order_number,'order_status',trip.status
  ) order by d.full_name,d.id),'[]'::jsonb)
  from public.drivers d
  join public.restaurant_members member on member.user_id=d.user_id and member.restaurant_id=d.restaurant_id and member.role='driver'
  left join private.driver_shift_locations l on l.driver_id=d.id and l.restaurant_id=d.restaurant_id
  left join lateral (
   select o.order_number,o.status from public.driver_assignments a join public.orders o on o.id=a.order_id
   where a.driver_id=d.id and a.restaurant_id=p_restaurant and a.status in ('offered','accepted')
   order by a.created_at desc limit 1
  ) trip on true
  where d.restaurant_id=p_restaurant and d.is_available
 );
end $$;
revoke all on function public.staff_shift_locations(uuid) from public,anon,authenticated;
grant execute on function public.staff_shift_locations(uuid) to authenticated;
