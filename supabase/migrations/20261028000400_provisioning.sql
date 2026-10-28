begin;
-- Trusted setup operation only. Public sign-up never grants membership.
create function public.provision_member(p_restaurant uuid,p_user uuid,p_role public.member_role,p_driver uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare d public.drivers;
begin
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'Auth user must exist first' using errcode='23503'; end if;
 if p_role='driver' then
  if p_driver is null then raise exception 'Driver profile required' using errcode='23514'; end if;
  select * into d from public.drivers where id=p_driver and restaurant_id=p_restaurant for update;
  if not found or (d.user_id is not null and d.user_id<>p_user) then raise exception 'Driver profile unavailable' using errcode='23514'; end if;
 elsif p_driver is not null then raise exception 'Driver profile only valid for driver role' using errcode='23514';
 end if;
 if exists(select 1 from public.drivers where user_id=p_user and (restaurant_id<>p_restaurant or p_role<>'driver' or id<>p_driver)) then raise exception 'User already linked to another driver role' using errcode='23514'; end if;
 insert into public.profiles(id,full_name) select id,'Usuario' from auth.users where id=p_user on conflict(id) do nothing;
 insert into public.restaurant_members(restaurant_id,user_id,role) values(p_restaurant,p_user,p_role)
 on conflict(restaurant_id,user_id) do update set role=excluded.role;
 if p_role='driver' then update public.drivers set user_id=p_user,is_available=false where id=p_driver; end if;
end $$;
revoke all on function public.provision_member(uuid,uuid,public.member_role,uuid) from public,anon,authenticated;
grant execute on function public.provision_member(uuid,uuid,public.member_role,uuid) to service_role;
commit;
