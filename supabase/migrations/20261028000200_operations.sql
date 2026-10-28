begin;
create function private.audit_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.status <> 'pending' then raise exception 'Orders must start pending' using errcode='23514'; end if;
  insert into public.order_status_history(restaurant_id,order_id,actor_id,new_status,event) values(new.restaurant_id,new.id,auth.uid(),new.status,'order_created');
 elsif new.status is distinct from old.status then
  if not (
   (old.status='pending' and new.status in ('accepted','cancelled')) or
   (old.status='accepted' and new.status in ('preparing','cancelled')) or
   (old.status='preparing' and new.status in ('ready_for_pickup','cancelled')) or
   (old.status='ready_for_pickup' and new.status in ('assigned','cancelled')) or
   (old.status='assigned' and new.status in ('ready_for_pickup','picked_up','cancelled')) or
   (old.status='picked_up' and new.status in ('on_the_way','cancelled')) or
   (old.status='on_the_way' and new.status in ('delivered','cancelled'))
  ) then raise exception 'Invalid order transition: % -> %',old.status,new.status using errcode='23514'; end if;
  insert into public.order_status_history(restaurant_id,order_id,actor_id,previous_status,new_status) values(new.restaurant_id,new.id,auth.uid(),old.status,new.status);
 end if;
 return new;
end $$;
create trigger audit_order after insert or update of status on public.orders for each row execute function private.audit_order();
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger order_updated before update on public.orders for each row execute function private.touch_updated_at();
create trigger product_updated before update on public.products for each row execute function private.touch_updated_at();
create trigger settings_updated before update on public.restaurant_settings for each row execute function private.touch_updated_at();

create function public.set_driver_availability(p_available boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.drivers d set is_available=p_available where d.user_id=auth.uid()
 and private.has_role(d.restaurant_id,array['driver']::public.member_role[]);
 if not found then raise exception 'Driver access required' using errcode='42501'; end if;
end $$;
create function public.advance_order(p_order uuid,p_status public.order_status) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or not private.has_role(o.restaurant_id,array['owner','staff']::public.member_role[]) then raise exception 'Order access denied' using errcode='42501'; end if;
 if not ((o.status='pending' and p_status='accepted') or (o.status='accepted' and p_status='preparing') or (o.status='preparing' and p_status='ready_for_pickup')) then
 raise exception 'Transition not allowed for this operation' using errcode='23514'; end if;
 update public.orders set status=p_status where id=p_order;
end $$;
create function public.offer_assignment(p_order uuid,p_driver uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare o public.orders; d public.drivers; assignment uuid;
begin
 -- Consistent lock order: order first, then driver. Unique partial indexes enforce exclusivity.
 select * into o from public.orders where id=p_order for update;
 if not found or not private.has_role(o.restaurant_id,array['owner','staff']::public.member_role[]) then raise exception 'Order access denied' using errcode='42501'; end if;
 if o.status<>'ready_for_pickup' then raise exception 'Order is not ready' using errcode='23514'; end if;
 select * into d from public.drivers where id=p_driver and restaurant_id=o.restaurant_id for update;
 if not found or not d.is_available or d.user_id is null or not exists(select 1 from public.restaurant_members m where m.user_id=d.user_id and m.restaurant_id=o.restaurant_id and m.role='driver') then
 raise exception 'Driver unavailable or not provisioned' using errcode='23514'; end if;
 insert into public.driver_assignments(restaurant_id,order_id,driver_id,assigned_by) values(o.restaurant_id,o.id,d.id,auth.uid()) returning id into assignment;
 update public.orders set status='assigned' where id=o.id;
 return assignment;
end $$;
create function public.respond_assignment(p_assignment uuid,p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare a public.driver_assignments; order_ref uuid;
begin
 select order_id into order_ref from public.driver_assignments where id=p_assignment;
 -- Same ordering as offer/cancel to avoid lock inversion.
 perform 1 from public.orders where id=order_ref for update;
 select * into a from public.driver_assignments where id=p_assignment for update;
 if not found or not exists(select 1 from public.drivers d where d.id=a.driver_id and d.user_id=auth.uid() and private.has_role(d.restaurant_id,array['driver']::public.member_role[])) then raise exception 'Assignment access denied' using errcode='42501'; end if;
 if a.status<>'offered' or not exists(select 1 from public.orders where id=a.order_id and status='assigned') then raise exception 'Assignment is no longer offered' using errcode='23514'; end if;
 update public.driver_assignments set status=case when p_accept then 'accepted'::public.assignment_status else 'rejected'::public.assignment_status end,
 accepted_at=case when p_accept then now() end,ended_at=case when not p_accept then now() end where id=a.id;
 if not p_accept then update public.orders set status='ready_for_pickup' where id=a.order_id; end if;
 insert into public.order_status_history(restaurant_id,order_id,actor_id,previous_status,new_status,event)
 values(a.restaurant_id,a.order_id,auth.uid(),'assigned',case when p_accept then 'assigned'::public.order_status else 'ready_for_pickup'::public.order_status end,case when p_accept then 'assignment_accepted' else 'assignment_rejected' end);
end $$;
create function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or not private.has_role(o.restaurant_id,array['owner','staff']::public.member_role[]) then raise exception 'Order access denied' using errcode='42501'; end if;
 if o.status in ('delivered','cancelled') then raise exception 'Order already terminal' using errcode='23514'; end if;
 if o.status in ('picked_up','on_the_way') and not private.has_role(o.restaurant_id,array['owner']::public.member_role[]) then raise exception 'Owner required after pickup' using errcode='42501'; end if;
 update public.orders set status='cancelled' where id=p_order;
 update public.driver_assignments set status='cancelled',ended_at=now() where order_id=p_order and status in ('offered','accepted');
 delete from public.driver_locations where assignment_id in (select id from public.driver_assignments where order_id=p_order);
 update public.payments set status='cancelled' where order_id=p_order and status='pending';
end $$;
-- Small public response; coordinates/prices are not accepted from browsers as final order data.
create function public.check_delivery_coverage(p_lat double precision,p_lng double precision)
returns table(restaurant_id uuid,is_covered boolean,delivery_fee_cents integer)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_lat is null or p_lng is null or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then raise exception 'Invalid coordinates' using errcode='22023'; end if;
 return query select r.id,extensions.st_dwithin(r.location,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,s.delivery_radius_m),s.delivery_fee_cents
 from public.restaurants r join public.restaurant_settings s on s.restaurant_id=r.id;
end $$;
-- Profiles contain display data only. Metadata cannot grant roles or restaurant membership.
create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Usuario'),120)) on conflict(id) do nothing;
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();

revoke all on all functions in schema private from public;
-- Restore only policy helpers; no client can invoke trigger helpers through exposed public RPC.
grant execute on function private.has_role(uuid,public.member_role[]) to anon,authenticated;
grant execute on function private.is_assigned(uuid) to authenticated;
revoke all on function public.set_driver_availability(boolean),public.advance_order(uuid,public.order_status),public.offer_assignment(uuid,uuid),public.respond_assignment(uuid,boolean),public.cancel_order(uuid) from public,anon;
grant execute on function public.set_driver_availability(boolean),public.advance_order(uuid,public.order_status),public.offer_assignment(uuid,uuid),public.respond_assignment(uuid,boolean),public.cancel_order(uuid) to authenticated;
revoke all on function public.check_delivery_coverage(double precision,double precision) from public;
grant execute on function public.check_delivery_coverage(double precision,double precision) to anon,authenticated;
-- Supabase migration role should retain service_role access; browsers never receive it.
grant usage on schema public,extensions to anon,authenticated,service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
commit;
