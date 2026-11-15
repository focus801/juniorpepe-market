-- Run in Supabase SQL Editor. Do not add a public INSERT policy for admins.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
-- SECURITY DEFINER bypasses RLS; function only returns whether caller is an admin.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create table if not exists public.items (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 100),
 server text not null default '' check(length(server)<=50),
 category text not null check(category in ('무기','방어구','장신구','기타')),
 price bigint check(price >= 0),
 status text not null default '판매 중' check(status in ('판매 중','예약 중','판매 완료')),
 contact_url text check(contact_url is null or (length(contact_url)<=2000 and contact_url ~ '^https://[^[:space:]]+$')),
 description text not null default '' check(length(description)<=2000),
 image_path text,
 created_at timestamptz not null default now()
);
alter table public.items enable row level security;
create policy "Public read items" on public.items for select to anon, authenticated using (true);
create policy "Admin insert items" on public.items for insert to authenticated with check ((select public.is_admin()));
create policy "Admin update items" on public.items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admin delete items" on public.items for delete to authenticated using ((select public.is_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('item-images','item-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "Public view images" on storage.objects for select to anon, authenticated using (bucket_id='item-images');
create policy "Admin upload images" on storage.objects for insert to authenticated with check(bucket_id='item-images' and (select public.is_admin()));
create policy "Admin delete images" on storage.objects for delete to authenticated using(bucket_id='item-images' and (select public.is_admin()));
-- Enable realtime for item changes (run once on new project):
alter publication supabase_realtime add table public.items;
-- After creating your user in Authentication > Users, replace UUID and run separately:
-- insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');
