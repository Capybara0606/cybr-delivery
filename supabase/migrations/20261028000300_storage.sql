begin;
-- Product imagery only. Customer addresses/receipts/GPS must never be stored here.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy product_images_read on storage.objects for select using(bucket_id='product-images');
create function private.can_manage_product_image(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare restaurant uuid;
begin
 begin restaurant:=split_part(p_name,'/',1)::uuid; exception when invalid_text_representation then return false; end;
 return private.has_role(restaurant,array['owner','staff']::public.member_role[]);
end $$;
revoke all on function private.can_manage_product_image(text) from public;
grant execute on function private.can_manage_product_image(text) to authenticated;
create policy product_images_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and private.can_manage_product_image(name));
create policy product_images_update on storage.objects for update to authenticated using(bucket_id='product-images' and private.can_manage_product_image(name)) with check(bucket_id='product-images' and private.can_manage_product_image(name));
create policy product_images_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and private.can_manage_product_image(name));
commit;
