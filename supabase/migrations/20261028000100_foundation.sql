begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.member_role as enum ('owner','staff','driver');
create type public.order_status as enum ('pending','accepted','preparing','ready_for_pickup','assigned','picked_up','on_the_way','delivered','cancelled');
create type public.assignment_status as enum ('offered','accepted','rejected','expired','completed','cancelled');

create table public.restaurants (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9-]+$'), currency text not null default 'USD' check(currency='USD'),
 time_zone text not null default 'America/El_Salvador' check(time_zone='America/El_Salvador'),
 pickup_address text not null, location extensions.geography(Point,4326) not null,
 is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.restaurant_settings (
 restaurant_id uuid primary key references public.restaurants(id), delivery_fee_cents integer not null default 200 check(delivery_fee_cents between 0 and 100000),
 delivery_radius_m integer not null default 3000 check(delivery_radius_m between 1 and 50000),
 is_accepting_orders boolean not null default false, opening_hours jsonb not null default '{}' check(jsonb_typeof(opening_hours)='object'),
 updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(full_name) between 1 and 120), created_at timestamptz not null default now()
);
create table public.restaurant_members (
 restaurant_id uuid not null references public.restaurants(id), user_id uuid not null references public.profiles(id) on delete cascade,
 role public.member_role not null, primary key(restaurant_id,user_id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 name text not null check(length(name) between 1 and 100), sort_order integer not null default 0, is_active boolean not null default true,
 unique(restaurant_id,id), unique(restaurant_id,name)
);
create table public.products (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id), category_id uuid not null,
 name text not null check(length(name) between 1 and 120), description text not null default '',
 price_cents integer not null check(price_cents between 0 and 1000000), is_available boolean not null default true,
 image_path text, is_demo boolean not null default false, updated_at timestamptz not null default now(),
 unique(restaurant_id,id), foreign key(restaurant_id,category_id) references public.categories(restaurant_id,id)
);
create table public.product_options (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, product_id uuid not null,
 name text not null, min_choices integer not null default 0 check(min_choices>=0), max_choices integer not null default 1 check(max_choices>=min_choices and max_choices<=20),
 unique(restaurant_id,id), foreign key(restaurant_id,product_id) references public.products(restaurant_id,id) on delete cascade
);
create table public.product_option_values (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, option_id uuid not null,
 name text not null, extra_price_cents integer not null default 0 check(extra_price_cents between 0 and 1000000), is_available boolean not null default true,
 unique(restaurant_id,id), foreign key(restaurant_id,option_id) references public.product_options(restaurant_id,id) on delete cascade
);
create table public.delivery_addresses (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 address text not null check(length(address) between 5 and 500), instructions text not null default '' check(length(instructions)<=1000),
 location extensions.geography(Point,4326) not null, unique(restaurant_id,id), created_at timestamptz not null default now()
);
create sequence public.order_number_seq;
create table public.orders (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id), address_id uuid not null,
 order_number bigint not null default nextval('public.order_number_seq'), customer_name text not null check(length(customer_name) between 1 and 120),
 customer_phone text not null check(customer_phone ~ '^\+?[0-9 ()-]{8,25}$'), status public.order_status not null default 'pending',
 subtotal_cents integer not null check(subtotal_cents between 0 and 100000000), delivery_fee_cents integer not null check(delivery_fee_cents between 0 and 100000),
 total_cents integer generated always as (subtotal_cents + delivery_fee_cents) stored,
 idempotency_key uuid not null, request_hash text not null check(length(request_hash)=64), tracking_token_hash text not null unique check(length(tracking_token_hash)=64),
 delivery_code_hash text not null, delivery_code_attempts integer not null default 0 check(delivery_code_attempts>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(restaurant_id,id), unique(restaurant_id,idempotency_key), unique(restaurant_id,order_number),
 foreign key(restaurant_id,address_id) references public.delivery_addresses(restaurant_id,id)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, order_id uuid not null, product_id uuid not null,
 product_name text not null, unit_price_cents integer not null check(unit_price_cents between 0 and 1000000),
 quantity integer not null check(quantity between 1 and 99), line_total_cents integer not null check(line_total_cents between 0 and 100000000),
 unique(restaurant_id,id), foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id) on delete cascade,
 foreign key(restaurant_id,product_id) references public.products(restaurant_id,id)
);
create table public.order_item_options (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, order_item_id uuid not null,
 option_name text not null, value_name text not null, extra_price_cents integer not null check(extra_price_cents between 0 and 1000000),
 foreign key(restaurant_id,order_item_id) references public.order_items(restaurant_id,id) on delete cascade
);
create table public.order_status_history (
 id bigint generated always as identity primary key, restaurant_id uuid not null, order_id uuid not null,
 actor_id uuid references auth.users(id), previous_status public.order_status, new_status public.order_status not null,
 event text not null default 'status_changed', created_at timestamptz not null default now(),
 foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id)
);
create table public.drivers (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
 user_id uuid references public.profiles(id), full_name text not null check(length(full_name) between 1 and 120),
 is_available boolean not null default false, is_demo boolean not null default false,
 unique(restaurant_id,id), unique(user_id),
 foreign key(restaurant_id,user_id) references public.restaurant_members(restaurant_id,user_id)
);
create table public.driver_assignments (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, order_id uuid not null, driver_id uuid not null,
 status public.assignment_status not null default 'offered', assigned_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), accepted_at timestamptz, ended_at timestamptz,
 unique(restaurant_id,id), foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id),
 foreign key(restaurant_id,driver_id) references public.drivers(restaurant_id,id)
);
create unique index one_active_assignment_per_order on public.driver_assignments(order_id) where status in ('offered','accepted');
create unique index one_active_assignment_per_driver on public.driver_assignments(driver_id) where status in ('offered','accepted');
create table public.driver_locations (
 assignment_id uuid primary key, restaurant_id uuid not null, location extensions.geography(Point,4326) not null,
 accuracy_m numeric not null check(accuracy_m between 0 and 1000), recorded_at timestamptz not null,
 received_at timestamptz not null default now(),
 foreign key(restaurant_id,assignment_id) references public.driver_assignments(restaurant_id,id) on delete cascade
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, order_id uuid not null unique,
 method text not null default 'cash' check(method='cash'), status text not null default 'pending' check(status in ('pending','collected','cancelled')),
 amount_cents integer not null check(amount_cents between 0 and 100100000), collected_at timestamptz,
 foreign key(restaurant_id,order_id) references public.orders(restaurant_id,id)
);

create index orders_restaurant_status_created on public.orders(restaurant_id,status,created_at desc);
create index order_items_order on public.order_items(order_id);
create index order_history_order on public.order_status_history(order_id,created_at);
create index assignments_driver on public.driver_assignments(driver_id,status);
create index products_category on public.products(restaurant_id,category_id);
create index members_user on public.restaurant_members(user_id);
create index addresses_location on public.delivery_addresses using gist(location);

create function private.has_role(p_restaurant uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.restaurant_members m where m.restaurant_id=p_restaurant and m.user_id=(select auth.uid()) and m.role=any(p_roles));
$$;
create function private.is_assigned(p_order uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.driver_assignments a join public.drivers d on d.id=a.driver_id
 where a.order_id=p_order and d.user_id=(select auth.uid()) and a.status in ('offered','accepted'));
$$;

-- No direct order mutation: transactions added through narrowly scoped functions.
do $$ declare t text; begin
 foreach t in array array['restaurants','restaurant_settings','profiles','restaurant_members','categories','products','product_options','product_option_values','delivery_addresses','orders','order_items','order_item_options','order_status_history','drivers','driver_assignments','driver_locations','payments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
grant select on public.restaurants, public.restaurant_settings, public.categories, public.products, public.product_options, public.product_option_values to anon,authenticated;
create policy restaurant_read on public.restaurants for select using(true);
create policy settings_read on public.restaurant_settings for select using(true);
create policy categories_read on public.categories for select using(is_active or private.has_role(restaurant_id,array['owner','staff']::public.member_role[]));
create policy products_read on public.products for select using(
 (is_available and exists(select 1 from public.categories c where c.id=category_id and c.is_active))
 or private.has_role(restaurant_id,array['owner','staff']::public.member_role[]));
create policy options_read on public.product_options for select using(exists(select 1 from public.products p where p.id=product_id));
create policy values_read on public.product_option_values for select using(exists(select 1 from public.product_options o where o.id=option_id));
-- anon needs execute but helper only answers roles for its own auth.uid(), never arbitrary users.
grant usage on schema private to anon;
grant execute on function private.has_role(uuid, public.member_role[]) to anon,authenticated;
grant execute on function private.is_assigned(uuid) to authenticated;

grant select on public.profiles,public.restaurant_members,public.orders,public.delivery_addresses,public.order_items,public.order_item_options,public.order_status_history,public.drivers,public.driver_assignments,public.driver_locations,public.payments to authenticated;
create policy profiles_read on public.profiles for select using(id=(select auth.uid()) or exists(select 1 from public.restaurant_members m where m.user_id=id and private.has_role(m.restaurant_id,array['owner','staff']::public.member_role[])));
create policy members_read on public.restaurant_members for select using(user_id=(select auth.uid()) or private.has_role(restaurant_id,array['owner']::public.member_role[]));
create policy orders_read on public.orders for select using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]) or private.is_assigned(id));
create policy addresses_read on public.delivery_addresses for select using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]) or exists(select 1 from public.orders o where o.address_id=delivery_addresses.id and private.is_assigned(o.id)));
create policy items_read on public.order_items for select using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]) or private.is_assigned(order_id));
create policy item_options_read on public.order_item_options for select using(exists(select 1 from public.order_items i where i.id=order_item_id));
create policy history_read on public.order_status_history for select using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]) or private.is_assigned(order_id));
create policy drivers_read on public.drivers for select using(user_id=(select auth.uid()) or private.has_role(restaurant_id,array['owner','staff']::public.member_role[]));
create policy assignments_read on public.driver_assignments for select using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]) or exists(select 1 from public.drivers d where d.id=driver_id and d.user_id=(select auth.uid())));
create policy locations_read on public.driver_locations for select using(exists(select 1 from public.driver_assignments a where a.id=assignment_id and a.status='accepted' and (private.has_role(a.restaurant_id,array['owner','staff']::public.member_role[]) or exists(select 1 from public.drivers d where d.id=a.driver_id and d.user_id=(select auth.uid())))));
create policy payments_read on public.payments for select using(private.has_role(restaurant_id,array['owner','staff']::public.member_role[]));

-- Catalog CRUD and settings only; ownership/membership provisioned through trusted server/admin.
do $$ declare t text; begin
 foreach t in array array['categories','products','product_options','product_option_values'] loop
 execute format('grant insert,update,delete on public.%I to authenticated',t);
 execute format('create policy staff_write on public.%I for all to authenticated using(private.has_role(restaurant_id,array[''owner'',''staff'']::public.member_role[])) with check(private.has_role(restaurant_id,array[''owner'',''staff'']::public.member_role[]))',t);
 end loop;
end $$;
grant update(delivery_fee_cents,delivery_radius_m,is_accepting_orders,opening_hours) on public.restaurant_settings to authenticated;
create policy settings_write on public.restaurant_settings for update to authenticated using(private.has_role(restaurant_id,array['owner']::public.member_role[])) with check(private.has_role(restaurant_id,array['owner']::public.member_role[]));
-- Never expose token/code hashes via normal client table reads.
revoke select on public.orders from authenticated;
grant select(id,restaurant_id,address_id,order_number,customer_name,customer_phone,status,subtotal_cents,delivery_fee_cents,total_cents,created_at,updated_at) on public.orders to authenticated;
revoke all on all sequences in schema public from anon,authenticated;
revoke all on function private.has_role(uuid,public.member_role[]) from public;
revoke all on function private.is_assigned(uuid) from public;
-- public defaults must not grant execute to future mutation RPCs.
alter default privileges in schema public revoke execute on functions from public;
commit;
