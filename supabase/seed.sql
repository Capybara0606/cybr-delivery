-- Explicit fictitious catalog. No auth accounts, shared passwords, real photos or real coordinates of customers.
begin;
insert into public.restaurants(id,name,slug,pickup_address,location,is_demo) values
('a0000000-0000-4000-8000-000000000001','Café Aurora','cafe-aurora','Ubicación ficticia de demostración, San Salvador',extensions.st_setsrid(extensions.st_makepoint(-89.2182,13.6929),4326)::extensions.geography,true)
on conflict(id) do update set name=excluded.name,pickup_address=excluded.pickup_address,location=excluded.location,is_demo=true;
insert into public.restaurant_settings(restaurant_id,delivery_fee_cents,delivery_radius_m,is_accepting_orders,opening_hours)
values('a0000000-0000-4000-8000-000000000001',200,3000,false,'{"monday":[["07:00","19:00"]],"tuesday":[["07:00","19:00"]],"wednesday":[["07:00","19:00"]],"thursday":[["07:00","19:00"]],"friday":[["07:00","19:00"]],"saturday":[["08:00","17:00"]],"sunday":[]}'::jsonb)
on conflict(restaurant_id) do nothing;
insert into public.categories(id,restaurant_id,name,sort_order) values
('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Cafés calientes',1),
('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Bebidas frías',2),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','Repostería',3),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','Desayunos',4)
on conflict(id) do update set name=excluded.name,sort_order=excluded.sort_order;
insert into public.products(id,restaurant_id,category_id,name,description,price_cents,is_demo)
select ('c0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'a0000000-0000-4000-8000-000000000001'::uuid,
('b0000000-0000-4000-8000-'||lpad(category::text,12,'0'))::uuid,name,'Producto ficticio de demostración. Sin fotografía comercial.',price,true
from (values
(1,1,'Capuchino',350),(2,1,'Americano',250),(3,1,'Latte',375),
(4,2,'Cold brew',400),(5,2,'Té frío',275),(6,2,'Limonada',250),
(7,3,'Croissant',275),(8,3,'Brownie',300),(9,3,'Muffin de arándanos',250),
(10,4,'Desayuno típico',650),(11,4,'Tostada de aguacate',550),(12,4,'Sándwich de desayuno',500)
) as v(n,category,name,price)
on conflict(id) do update set name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,is_demo=true;
insert into public.product_options(id,restaurant_id,product_id,name,min_choices,max_choices) values
('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Tipo de leche',0,1)
on conflict(id) do nothing;
insert into public.product_option_values(id,restaurant_id,option_id,name,extra_price_cents) values
('e0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','Leche entera',0),
('e0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','Leche de avena',75)
on conflict(id) do nothing;
insert into public.drivers(id,restaurant_id,full_name,is_demo) values
('f0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Carlos',true),
('f0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Andrea',true)
on conflict(id) do nothing;
commit;
