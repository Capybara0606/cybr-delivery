begin;
-- Realtime emits only identifiers/status, never order secrets or customer details.
create table public.order_events (
 id bigint generated always as identity primary key, restaurant_id uuid not null references public.restaurants(id),
 order_id uuid not null references public.orders(id), status public.order_status not null, created_at timestamptz not null default now()
);
alter table public.order_events enable row level security;
revoke all on public.order_events from public,anon,authenticated;
grant select on public.order_events to authenticated;
grant all on public.order_events to service_role;
grant usage,select on sequence public.order_events_id_seq to service_role;
create policy events_read on public.order_events for select to authenticated using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]) or private.is_assigned(order_id));
create function private.publish_order_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.order_events(restaurant_id,order_id,status) values(new.restaurant_id,new.id,new.status);
 return new;
end $$;
revoke all on function private.publish_order_event() from public,anon,authenticated;
create trigger order_event after insert or update of status on public.orders for each row execute function private.publish_order_event();
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.order_events;
  alter publication supabase_realtime add table public.driver_locations;
 end if;
end $$;
create function public.staff_dashboard(p_restaurant uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_role(p_restaurant,array['owner','staff']::public.member_role[]) then raise exception 'Staff required' using errcode='42501'; end if;
 return (select jsonb_build_object('orders',count(*),'active',count(*) filter(where status not in ('delivered','cancelled')),'delivered',count(*) filter(where status='delivered'),
 'revenue_cents',coalesce(sum(total_cents) filter(where status='delivered'),0)) from public.orders where restaurant_id=p_restaurant);
end $$;
revoke all on function public.staff_dashboard(uuid) from public,anon;
grant execute on function public.staff_dashboard(uuid) to authenticated,service_role;
commit;
