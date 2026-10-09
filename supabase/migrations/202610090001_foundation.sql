begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admin_users from public, anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.admin_users where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function public.valid_json_number(value jsonb, minimum numeric, maximum numeric, step numeric) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'number' then
    (value #>> '{}')::numeric between minimum and maximum and mod((value #>> '{}')::numeric,step) = 0
  else false end;
$$;
create function public.valid_json_text(value jsonb, maximum integer) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'string' then
    length(btrim(value #>> '{}')) > 0 and length(value #>> '{}') <= maximum and (value #>> '{}') !~ '[[:cntrl:]]'
  else false end;
$$;
create function public.valid_nutrition(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; n jsonb;
begin
  if value is null or jsonb_typeof(value) <> 'object' or
     not value ?& array['calories','protein','fibre','sugar'] or
     value - array['calories','protein','fibre','sugar'] <> '{}'::jsonb then return false; end if;
  foreach k in array array['calories','protein','fibre','sugar'] loop
    n := value -> k;
    if n <> 'null'::jsonb then
      if not public.valid_json_number(n,0,case when k = 'calories' then 1000 else 100 end,0.1) then return false; end if;
    end if;
  end loop;
  return true;
end $$;

create function public.valid_progress(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if value is null or jsonb_typeof(value) <> 'object' or not value ?& array['level','completed'] or
     value - array['level','completed'] <> '{}'::jsonb or
     jsonb_typeof(value->'level') <> 'number' or jsonb_typeof(value->'completed') <> 'array' then return false; end if;
  if (value->>'level')::numeric not between 1 and 4 or trunc((value->>'level')::numeric) <> (value->>'level')::numeric or
     jsonb_array_length(value->'completed') > 100 then return false; end if;
  for item in select * from jsonb_array_elements(value->'completed') loop
    if jsonb_typeof(item) <> 'string' or length(item #>> '{}') not between 1 and 100 then return false; end if;
  end loop;
  return true;
end $$;

create function public.valid_body(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' or not value ?& array['age','height','weight','coefficient','activity'] or
     value - array['age','height','weight','coefficient','activity'] <> '{}'::jsonb then return false; end if;
  foreach k in array array['age','height','weight','coefficient','activity'] loop
    if jsonb_typeof(value->k) <> 'number' then return false; end if;
  end loop;
  return (value->>'age')::numeric between 18 and 100 and
    trunc((value->>'age')::numeric) = (value->>'age')::numeric and
    public.valid_json_number(value->'height',120,230,0.1) and
    public.valid_json_number(value->'weight',35,300,0.1) and
    (value->>'coefficient')::numeric in (5,-161) and
    (value->>'activity')::numeric in (1.2,1.375,1.55,1.725);
end $$;

create function public.valid_list_entries(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare entry jsonb; product jsonb; k text; field jsonb; total numeric := 0; expected_source text;
begin
  if value is null or jsonb_typeof(value) <> 'array' or octet_length(value::text) > 1000000 then return false; end if;
  if jsonb_array_length(value) > 30 then return false; end if;
  for entry in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(entry) <> 'object' or not entry ?& array['key','product','packageAmount','packageUnit','unitsPerPack','amountSource','nutrition','nutritionSources','quantity'] or
       entry - array['key','product','packageAmount','packageUnit','unitsPerPack','amountSource','nutrition','nutritionSources','quantity'] <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(entry->'key') <> 'string' or length(entry->>'key') not between 1 and 16000 or
       coalesce(entry->>'packageUnit','') not in ('g','ml') or coalesce(entry->>'amountSource','') not in ('unknown','manual','demo','requested','verified') then return false; end if;
    if not public.valid_nutrition(entry->'nutrition') or jsonb_typeof(entry->'nutritionSources') <> 'object' or
       not (entry->'nutritionSources') ?& array['calories','protein','fibre','sugar'] or
       (entry->'nutritionSources') - array['calories','protein','fibre','sugar'] <> '{}'::jsonb then return false; end if;
    foreach k in array array['calories','protein','fibre','sugar'] loop
      if coalesce(entry->'nutritionSources'->>k,'') not in ('unknown','manual','demo','requested','verified') then return false; end if;
      if (entry->'nutrition'->k = 'null'::jsonb) <> (entry->'nutritionSources'->>k = 'unknown') then return false; end if;
    end loop;
    if not public.valid_json_number(entry->'quantity',1,99,1) or not public.valid_json_number(entry->'unitsPerPack',1,100,1) then return false; end if;
    total := total + (entry->>'quantity')::numeric;
    if total > 999 then return false; end if;
    field := entry->'packageAmount';
    if field <> 'null'::jsonb then
      if not public.valid_json_number(field,0.1,10000,0.1) then return false; end if;
    end if;
    if (field = 'null'::jsonb) <> (entry->>'amountSource' = 'unknown') then return false; end if;
    product := entry->'product';
    if jsonb_typeof(product) <> 'object' or not product ?& array['id','name','department','group','color','portion','packageAmount','packageUnit','unitsPerPack','nutrition','readiness','provenance'] then return false; end if;
    if product - array['id','name','department','departmentName','imagePath','ingredients','allergens','group','color','shape','portion','packageAmount','packageUnit','unitsPerPack','nutrition','readiness','provenance'] <> '{}'::jsonb then return false; end if;
    foreach k in array array['id','name','department','group','color'] loop
      if not public.valid_json_text(product->k,case when k = 'name' then 200 else 100 end) then return false; end if;
    end loop;
    if product->>'id' !~ '^[A-Za-z0-9_-]+$' or product->>'department' !~ '^[A-Za-z0-9_-]+$' or
       product->>'color' not in ('grain','leaf','clay','milk') then return false; end if;
    foreach k in array array['departmentName','ingredients','allergens'] loop
      if product ? k and not public.valid_json_text(product->k,case when k = 'departmentName' then 240 when k = 'ingredients' then 4000 else 2000 end) then return false; end if;
    end loop;
    if product ? 'shape' and coalesce(product->>'shape','') not in ('box','can','bottle','tray','wafer','pasta') then return false; end if;
    if product ? 'imagePath' and (jsonb_typeof(product->'imagePath') <> 'string' or
      coalesce(product->>'imagePath','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg|jpeg)$') then return false; end if;
    if coalesce(product->>'readiness','') not in ('illustrative','approved','requested') or coalesce(product->>'packageUnit','') not in ('g','ml') or
       not public.valid_nutrition(product->'nutrition') or jsonb_typeof(product->'provenance') <> 'object' or
       not (product->'provenance') ?& array['status','source'] or
       (product->'provenance') - array['status','source'] <> '{}'::jsonb or
       coalesce(product->'provenance'->>'status','') not in ('illustrative','verified-label','pending-label') or
       not public.valid_json_text(product->'provenance'->'source',1000) then return false; end if;
    expected_source := case product->>'readiness' when 'illustrative' then 'illustrative' when 'approved' then 'verified-label' else 'pending-label' end;
    if product->'provenance'->>'status' <> expected_source then return false; end if;
    if not public.valid_json_number(product->'portion',5,500,5) or not public.valid_json_number(product->'unitsPerPack',1,100,1) then return false; end if;
    if entry->>'packageUnit' <> product->>'packageUnit' or entry->'unitsPerPack' <> product->'unitsPerPack' then return false; end if;
    field := product->'packageAmount';
    if field <> 'null'::jsonb then
      if not public.valid_json_number(field,0.1,10000,0.1) then return false; end if;
    end if;
  end loop;
  return true;
end $$;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120 and name !~ '[[:cntrl:]]'),
  status text not null default 'draft' check (status in ('draft','published','archived'))
);
create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120 and name !~ '[[:cntrl:]]'),
  slot integer not null check (slot between 0 and 8),
  status text not null default 'draft' check (status in ('draft','published','archived'))
);
create unique index shelves_active_slot on public.shelves(store_id,slot) where status <> 'archived';
create table public.products (
  id uuid primary key default gen_random_uuid(),
  shelf_id uuid not null references public.shelves(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 200 and name !~ '[[:cntrl:]]'),
  group_name text not null check (length(btrim(group_name)) between 1 and 80 and group_name !~ '[[:cntrl:]]'),
  color text not null default 'grain' check (color in ('grain','leaf','clay','milk')),
  shape text not null default 'box' check (shape in ('box','can','bottle','tray','wafer','pasta')),
  package_amount numeric check (package_amount between 0.1 and 10000 and mod(package_amount,0.1) = 0),
  package_unit text not null default 'g' check (package_unit in ('g','ml')),
  units_per_pack integer not null default 1 check (units_per_pack between 1 and 100),
  portion numeric not null default 100 check (portion between 5 and 500 and mod(portion,5) = 0),
  nutrition jsonb not null default '{"calories":null,"protein":null,"fibre":null,"sugar":null}' check (public.valid_nutrition(nutrition)),
  image_path text check (image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg|jpeg)$'),
  ingredients text check (length(ingredients) <= 4000 and ingredients !~ '[[:cntrl:]]'),
  allergens text check (length(allergens) <= 2000 and allergens !~ '[[:cntrl:]]'),
  source text not null default '' check (length(source) <= 1000 and source !~ '[[:cntrl:]]'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  label_verified boolean not null default false,
  check (status <> 'published' or length(btrim(source)) > 0),
  check (not label_verified or (
    length(btrim(source)) > 0 and package_amount is not null and ingredients is not null and allergens is not null and
    length(btrim(ingredients)) > 0 and length(btrim(allergens)) > 0 and
    nutrition->'calories' <> 'null'::jsonb and nutrition->'protein' <> 'null'::jsonb and
    nutrition->'fibre' <> 'null'::jsonb and nutrition->'sugar' <> 'null'::jsonb))
);
create index products_shelf on public.products(shelf_id);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Explorator' check (length(btrim(display_name)) between 1 and 80),
  avatar_color text not null default 'leaf' check (avatar_color in ('grain','leaf','clay','milk')),
  progress jsonb not null default '{"level":1,"completed":[]}' check (public.valid_progress(progress)),
  body_profile jsonb check (public.valid_body(body_profile)),
  body_consent_at timestamptz,
  check ((body_profile is null) = (body_consent_at is null))
);
create table public.saved_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  entries jsonb not null check (public.valid_list_entries(entries)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_lists_user on public.saved_lists(user_id);
create table public.catalog_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null check (table_name in ('stores','shelves','products')),
  record_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create function private.catalog_audit_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    if not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
    insert into public.catalog_audit(actor_id,table_name,record_id,action,old_data,new_data)
    values(auth.uid(),tg_table_name,coalesce(new.id,old.id),tg_op,
      case when tg_op <> 'INSERT' then to_jsonb(old) end,
      case when tg_op <> 'DELETE' then to_jsonb(new) end);
  end if;
  return coalesce(new,old);
end $$;
revoke all on function private.catalog_audit_trigger() from public;
create trigger stores_audit after insert or update or delete on public.stores for each row execute function private.catalog_audit_trigger();
create trigger shelves_audit after insert or update or delete on public.shelves for each row execute function private.catalog_audit_trigger();
create trigger products_audit after insert or update or delete on public.products for each row execute function private.catalog_audit_trigger();

create function private.profile_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.body_consent_at is null or new.body_profile is null then
    new.body_profile := null;
    new.body_consent_at := null;
  elsif tg_op = 'INSERT' or old.body_consent_at is null or new.body_profile is distinct from old.body_profile then
    new.body_consent_at := now();
  end if;
  return new;
end $$;
create trigger profile_consent before insert or update on public.profiles for each row execute function private.profile_consent();
create function private.list_timestamps() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.created_at := old.created_at; else new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger list_timestamps before insert or update on public.saved_lists for each row execute function private.list_timestamps();
revoke all on function private.profile_consent(), private.list_timestamps() from public;

alter table public.stores enable row level security;
alter table public.shelves enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.saved_lists enable row level security;
alter table public.catalog_audit enable row level security;
alter table private.admin_users enable row level security;

revoke all on public.stores,public.shelves,public.products,public.profiles,public.saved_lists,public.catalog_audit from anon,authenticated;
grant select on public.stores,public.shelves,public.products to anon,authenticated;
grant insert,update,delete on public.stores,public.shelves,public.products to authenticated;
grant select,insert,update,delete on public.profiles,public.saved_lists to authenticated;
grant select on public.catalog_audit to authenticated;

create policy stores_read on public.stores for select to anon,authenticated using (public.is_admin() or status = 'published');
create policy shelves_read on public.shelves for select to anon,authenticated using (
  public.is_admin() or (status = 'published' and exists(select 1 from public.stores s where s.id = store_id and s.status = 'published')));
create policy products_read on public.products for select to anon,authenticated using (
  public.is_admin() or (status = 'published' and exists(
    select 1 from public.shelves sh join public.stores s on s.id = sh.store_id
    where sh.id = shelf_id and sh.status = 'published' and s.status = 'published')));
create policy stores_admin_insert on public.stores for insert to authenticated with check (public.is_admin());
create policy stores_admin_update on public.stores for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy stores_admin_delete on public.stores for delete to authenticated using (public.is_admin());
create policy shelves_admin_insert on public.shelves for insert to authenticated with check (public.is_admin());
create policy shelves_admin_update on public.shelves for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy shelves_admin_delete on public.shelves for delete to authenticated using (public.is_admin());
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());
create policy own_profile on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_lists on public.saved_lists for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy audit_read on public.catalog_audit for select to authenticated using (public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy product_images_read on storage.objects for select to anon,authenticated using (
  bucket_id = 'product-images' and (public.is_admin() or exists(
    select 1 from public.products p join public.shelves sh on sh.id = p.shelf_id join public.stores s on s.id = sh.store_id
    where p.image_path = storage.objects.name and p.status = 'published' and sh.status = 'published' and s.status = 'published')));
create policy product_images_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images' and public.is_admin() and
  name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg|jpeg)$');
create policy product_images_delete on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and public.is_admin() and not exists(select 1 from public.products p where p.image_path = storage.objects.name));
-- No UPDATE policy: image objects are immutable, and replacement uses a fresh UUID.

-- Shared catalog artwork must survive deletion of its uploader's account.
-- Supabase Auth otherwise rejects deleting users who still own Storage objects.
-- This operation changes ownership metadata only, never object paths or bytes.
create function public.release_account_image_ownership(target_user uuid) returns void
language sql security definer set search_path = '' as $$
  update storage.objects set owner = null, owner_id = null
  where bucket_id = 'product-images' and (owner = target_user or owner_id = target_user::text);
$$;
revoke all on function public.release_account_image_ownership(uuid) from public, anon, authenticated;
grant execute on function public.release_account_image_ownership(uuid) to service_role;
commit;
