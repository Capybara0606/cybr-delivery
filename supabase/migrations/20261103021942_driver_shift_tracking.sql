-- Last known shift location is private. It is never part of guest tracking,
-- catalog, Realtime or a route history; admin access will be designed separately.
create table private.driver_shift_locations (
 driver_id uuid primary key references public.drivers(id) on delete cascade,
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 location extensions.geography(Point,4326) not null,
 accuracy_m double precision not null check(accuracy_m between 0 and 1000),
 recorded_at timestamptz not null,
 received_at timestamptz not null default now()
);
alter table private.driver_shift_locations enable row level security;
revoke all on private.driver_shift_locations from public,anon,authenticated;

create function public.publish_shift_location(p_lat double precision,p_lng double precision,p_accuracy double precision,p_recorded_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare d public.drivers;
begin
 select * into d from public.drivers where user_id=auth.uid() and is_available
 and private.has_role(restaurant_id,array['driver']::public.member_role[]) for share;
 if not found then raise exception 'Active driver shift required' using errcode='42501'; end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180)
 or p_accuracy is null or not(p_accuracy between 0 and 1000) or p_recorded_at is null
 or p_recorded_at<now()-interval '30 seconds' or p_recorded_at>now()+interval '10 seconds'
 then raise exception 'Invalid or stale GPS position' using errcode='22023'; end if;
 insert into private.driver_shift_locations as l(driver_id,restaurant_id,location,accuracy_m,recorded_at,received_at)
 values(d.id,d.restaurant_id,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,p_accuracy,p_recorded_at,now())
 on conflict(driver_id) do update set location=excluded.location,accuracy_m=excluded.accuracy_m,
 recorded_at=excluded.recorded_at,received_at=now() where excluded.recorded_at>l.recorded_at;
 if not found then raise exception 'Position is older than last known GPS' using errcode='22023'; end if;
end $$;
revoke all on function public.publish_shift_location(double precision,double precision,double precision,timestamptz) from public,anon,authenticated;
grant execute on function public.publish_shift_location(double precision,double precision,double precision,timestamptz) to authenticated;

create function private.clear_closed_shift_location() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not new.is_available then
  delete from private.driver_shift_locations where driver_id=new.id;
  delete from public.driver_locations l using public.driver_assignments a where l.assignment_id=a.id and a.driver_id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.clear_closed_shift_location() from public,anon,authenticated;
create trigger clear_closed_shift_location after update of is_available on public.drivers
for each row execute function private.clear_closed_shift_location();

-- Closing a shift and publishing an order location synchronize on the driver row.
-- Order/assignment locks are always acquired first to preserve dispatch lock order.
create or replace function public.publish_driver_location(p_assignment uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_recorded_at timestamptz,p_simulated boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a public.driver_assignments; o public.orders;
begin
 select order_id into a.order_id from public.driver_assignments where id=p_assignment;
 -- Hold order first; cancellation/delivery cannot race and leave a location behind.
 select * into o from public.orders where id=a.order_id for share;
 select x.* into a from public.driver_assignments x join public.drivers d on d.id=x.driver_id
 where x.id=p_assignment and x.status='accepted' and d.user_id=auth.uid() and d.is_available and private.has_role(d.restaurant_id,array['driver']::public.member_role[]) for share of x,d;
 if not found or o.status<>'on_the_way' then raise exception 'Active delivery required' using errcode='42501'; end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180) or p_accuracy is null or not(p_accuracy between 0 and 1000)
 or p_recorded_at is null or p_recorded_at<now()-interval '30 seconds' or p_recorded_at>now()+interval '10 seconds' then raise exception 'Invalid or stale GPS position' using errcode='22023'; end if;
 if p_simulated and not exists(select 1 from public.restaurants where id=o.restaurant_id and is_demo) then raise exception 'Simulation disabled for real restaurants' using errcode='42501'; end if;
 insert into public.driver_locations as l(assignment_id,restaurant_id,location,accuracy_m,recorded_at,received_at,is_simulated)
 values(a.id,a.restaurant_id,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,p_accuracy,p_recorded_at,now(),p_simulated)
 on conflict(assignment_id) do update set location=excluded.location,accuracy_m=excluded.accuracy_m,recorded_at=excluded.recorded_at,received_at=now(),is_simulated=excluded.is_simulated where excluded.recorded_at>l.recorded_at;
 if not found then raise exception 'Position is older than last known GPS' using errcode='22023'; end if;
end $$;

create or replace function public.cleanup_delivery_data() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.driver_locations where received_at<now()-interval '24 hours';
 delete from private.driver_shift_locations where received_at<now()-interval '24 hours';
 delete from private.request_limits where window_start<now()-interval '2 days';
end $$;
