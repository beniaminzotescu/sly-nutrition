-- psql -v ON_ERROR_STOP=1 ... -f supabase/tests/rls.sql
-- Transactional regression tests. Requires migration and three disposable users.
begin;
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003');
insert into private.admin_users(user_id) values ('00000000-0000-4000-8000-000000000003');

create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function public.test_denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then return;
  end;
  raise exception 'Unexpectedly accepted: %',statement;
end $$;
grant execute on function public.test_assert(boolean,text),public.test_denied(text) to anon,authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select public.test_assert(public.is_admin(),'operator admin role');
insert into public.stores(id,name,status) values ('10000000-0000-4000-8000-000000000001','Published store','published'),
 ('10000000-0000-4000-8000-000000000002','Draft store','draft');
insert into public.shelves(id,store_id,name,slot,status) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Shelf',0,'published'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Hidden shelf',0,'published');
insert into public.products(id,shelf_id,name,group_name,status,source,image_path) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Pending label','Legume','published','Pending source','40000000-0000-4000-8000-000000000001.webp'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Hidden product','Legume','published','Pending source','40000000-0000-4000-8000-000000000002.webp');
insert into storage.objects(bucket_id,name,owner,owner_id) values
 ('product-images','40000000-0000-4000-8000-000000000001.webp','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003'),
 ('product-images','40000000-0000-4000-8000-000000000002.webp','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003');
select public.test_assert((select count(*) = 6 from public.catalog_audit),'catalog-only admin audit');
select public.test_denied($q$insert into public.catalog_audit(actor_id,table_name,record_id,action) values ('00000000-0000-4000-8000-000000000003','stores','10000000-0000-4000-8000-000000000001','INSERT')$q$);
select public.test_denied($q$update public.catalog_audit set action='DELETE'$q$);
select public.test_denied($q$delete from public.catalog_audit$q$);
select public.test_denied($q$insert into public.shelves(store_id,name,slot) values ('10000000-0000-4000-8000-000000000001','Collision',0)$q$);
select public.test_denied($q$insert into public.shelves(store_id,name,slot) values ('10000000-0000-4000-8000-000000000001','Out of bounds',9)$q$);
select public.test_denied($q$insert into public.products(shelf_id,name,group_name) values ('20000000-0000-4000-8000-000000000099','Orphan','Legume')$q$);
select public.test_denied($q$delete from public.stores where id='10000000-0000-4000-8000-000000000001'$q$);
select public.test_denied($q$update public.products set nutrition='{"calories":-2,"protein":null,"fibre":null,"sugar":null}'$q$);
select public.test_denied($q$update public.products set nutrition='{"calories":null}'$q$);
select public.test_denied($q$update public.products set nutrition='[]'$q$);
select public.test_denied($q$update public.products set label_verified=true$q$);
select public.test_denied($q$update public.products set label_verified=true, package_amount=100, nutrition='{"calories":100,"protein":1,"fibre":1,"sugar":1}', ingredients='',allergens=''$q$);
select public.test_denied($q$update public.products set source='' where status='published'$q$);
select public.test_denied($q$update public.products set portion=501$q$);
select public.test_denied($q$update public.products set portion=6$q$);
select public.test_denied($q$update public.products set package_amount=0.01$q$);
select public.test_denied($q$update public.products set package_amount=10000.1$q$);
select public.test_denied($q$update public.products set units_per_pack=101$q$);
select public.test_denied($q$insert into storage.objects(bucket_id,name) values ('product-images','bad.svg')$q$);
select public.test_denied($q$select public.release_account_image_ownership('00000000-0000-4000-8000-000000000003')$q$);

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.test_assert(not public.is_admin(),'player role');
select public.test_assert((select count(*)=1 from public.stores),'only published stores');
select public.test_assert((select count(*)=1 from public.shelves),'shelf publication inherited from store');
select public.test_assert((select count(*)=1 from public.products),'product publication inherited from store');
select public.test_assert((select count(*)=1 from storage.objects),'private images inherit product/store publication');
select public.test_assert((select count(*)=1 from storage.objects where name='40000000-0000-4000-8000-000000000001.webp'),'published image matched by outer object name');
select public.test_assert((select count(*)=0 from storage.objects where name='40000000-0000-4000-8000-000000000002.webp'),'draft-store image is private');
select public.test_assert((select count(*)=0 from public.catalog_audit),'players cannot view audit');
select public.test_denied($q$select * from private.admin_users$q$);
select public.test_denied($q$insert into private.admin_users(user_id) values ('00000000-0000-4000-8000-000000000001')$q$);
select public.test_denied($q$insert into public.stores(name) values ('Player store')$q$);
select public.test_denied($q$insert into public.shelves(store_id,name,slot) values ('10000000-0000-4000-8000-000000000001','Player shelf',1)$q$);
select public.test_denied($q$insert into public.products(shelf_id,name,group_name) values ('20000000-0000-4000-8000-000000000001','Player product','Legume')$q$);
with modified as (update public.products set name='Changed' returning id) select public.test_assert((select count(*)=0 from modified),'player update blocked');
with removed as (delete from public.stores returning id) select public.test_assert((select count(*)=0 from removed),'player delete blocked');
select public.test_denied($q$insert into storage.objects(bucket_id,name) values ('product-images','40000000-0000-4000-8000-000000000003.webp')$q$);
with changed as (update storage.objects set name='overwrite.webp' returning id) select public.test_assert((select count(*)=0 from changed),'images immutable');
with removed as (delete from storage.objects returning id) select public.test_assert((select count(*)=0 from removed),'player image delete blocked');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
update public.products set status='draft' where id='30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.test_assert((select count(*)=0 from storage.objects),'draft product image is private even under published shelf/store');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
update public.products set status='published' where id='30000000-0000-4000-8000-000000000001';
update public.shelves set status='draft' where id='20000000-0000-4000-8000-000000000001';
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.test_assert((select count(*)=0 from storage.objects),'draft shelf image is private even under published store');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
update public.shelves set status='published' where id='20000000-0000-4000-8000-000000000001';
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.profiles(user_id,body_profile,body_consent_at) values
 ('00000000-0000-4000-8000-000000000001','{"age":30,"height":170,"weight":70,"coefficient":5,"activity":1.2}',now());
insert into public.profiles(user_id,display_name) values ('00000000-0000-4000-8000-000000000001','Updated nickname')
on conflict(user_id) do update set display_name=excluded.display_name;
select public.test_assert((select body_profile->>'weight'='70' and body_consent_at is not null from public.profiles),'partial nickname upsert preserves body and consent');
insert into public.profiles(user_id,progress) values ('00000000-0000-4000-8000-000000000001','{"level":2,"completed":["intro"]}')
on conflict(user_id) do update set progress=excluded.progress;
select public.test_assert((select body_profile->>'weight'='70' and display_name='Updated nickname' from public.profiles),'partial progress upsert preserves body and nickname');
select public.test_denied($q$update public.profiles set body_profile='{"age":17,"height":170,"weight":70,"coefficient":5,"activity":1.2}'$q$);
select public.test_denied($q$update public.profiles set progress='{"admin":true}'$q$);
select public.test_assert(public.valid_progress('{"level":1,"completed":[]}'),'new player level one accepted');
select public.test_assert(public.valid_progress('{"level":3,"completed":["inspect","compare"]}'),'intermediate mission level accepted');
select public.test_assert(public.valid_progress('{"level":4,"completed":["inspect","compare","review"]}'),'all mission progress accepted');
select public.test_assert(public.valid_progress('{"level":5,"completed":[]}') is false,'unsupported progress level rejected');
select public.test_denied($q$insert into public.profiles(user_id) values ('00000000-0000-4000-8000-000000000002')$q$);
insert into public.saved_lists(id,user_id,name,entries) values
 ('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','My snapshot',
 '[{"key":"test-snapshot","product":{"id":"30000000-0000-4000-8000-000000000001","name":"Pending label","department":"10000000-0000-4000-8000-000000000001","group":"Legume","color":"grain","portion":100,"packageAmount":null,"packageUnit":"g","unitsPerPack":1,"nutrition":{"calories":null,"protein":null,"fibre":null,"sugar":null},"readiness":"requested","provenance":{"status":"pending-label","source":"Unverified"}},"packageAmount":null,"packageUnit":"g","unitsPerPack":1,"amountSource":"unknown","nutrition":{"calories":null,"protein":null,"fibre":null,"sugar":null},"nutritionSources":{"calories":"unknown","protein":"unknown","fibre":"unknown","sugar":"unknown"},"quantity":2}]');
select public.test_denied($q$insert into public.saved_lists(user_id,name,entries) values ('00000000-0000-4000-8000-000000000002','Other user','[]')$q$);
select public.test_denied($q$update public.saved_lists set entries='[{"body_profile":{"weight":70}}]'$q$);
select public.test_denied($q$update public.saved_lists set entries='{}'$q$);
select public.test_denied($q$update public.saved_lists set entries=jsonb_set(entries,'{0,quantity}','-1')$q$);
select public.test_denied($q$update public.saved_lists set entries=jsonb_set(entries,'{0,packageUnit}','null')$q$);
select public.test_denied($q$update public.saved_lists set entries=jsonb_set(entries,'{0,product,provenance}','{}')$q$);
do $$
declare sample jsonb; k text; bad jsonb;
begin
  select entries into sample from public.saved_lists;
  foreach k in array array['key','product','packageUnit','unitsPerPack','amountSource','nutrition','nutritionSources','quantity'] loop
    perform public.test_assert(public.valid_list_entries(jsonb_set(sample,array['0',k],'null')) is false,'null entry field '||k);
    perform public.test_assert(public.valid_list_entries(sample #- array['0',k]) is false,'missing entry field '||k);
  end loop;
  foreach k in array array['id','name','department','group','color','portion','packageUnit','unitsPerPack','nutrition','readiness','provenance'] loop
    perform public.test_assert(public.valid_list_entries(jsonb_set(sample,array['0','product',k],'null')) is false,'null product field '||k);
    perform public.test_assert(public.valid_list_entries(sample #- array['0','product',k]) is false,'missing product field '||k);
  end loop;
  foreach k in array array['departmentName','ingredients','allergens','shape','imagePath'] loop
    perform public.test_assert(public.valid_list_entries(jsonb_set(sample,array['0','product',k],'{}')) is false,'object optional product field '||k);
    perform public.test_assert(public.valid_list_entries(jsonb_set(sample,array['0','product',k],'null')) is false,'null optional product field '||k);
  end loop;
  perform public.test_assert(public.valid_list_entries(null) is false,'SQL NULL list rejected');
  perform public.test_assert(public.valid_list_entries('null') is false,'JSON null list rejected');
  perform public.test_assert(public.valid_list_entries('{}') is false,'object list rejected');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,quantity}','100')) is false,'quantity upper bound');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,packageAmount}','0.01')) is false,'package precision');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,product,portion}','6')) is false,'portion five unit steps');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,product,imageUrl}','"https://example.test/signed?token=transient"')) is false,'signed URLs never persisted');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,product,imagePath}','"../other/image.webp"')) is false,'image traversal rejected');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,product,imagePath}','"40000000-0000-4000-8000-000000000001.webp"')) is true,'controlled image path accepted');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,product,departmentName}','"A\nB"')) is false,'control characters rejected');
  perform public.test_assert(public.valid_list_entries(jsonb_set(sample,'{0,product,name}',to_jsonb(repeat('a',201)))) is false,'bounded product text');
  select jsonb_agg(sample->0) into bad from generate_series(1,31);
  perform public.test_assert(public.valid_list_entries(bad) is false,'maximum thirty variants');
  select jsonb_agg(jsonb_set(sample->0,'{quantity}','99')) into bad from generate_series(1,11);
  perform public.test_assert(public.valid_list_entries(bad) is false,'maximum 999 packages');
end $$;
update public.profiles set body_consent_at=null;
select public.test_assert((select body_profile is null from public.profiles),'consent removal clears body');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.test_assert((select count(*)=0 from public.profiles),'other player profile isolation');
select public.test_assert((select count(*)=0 from public.saved_lists),'other player list isolation');
with changed as (update public.profiles set display_name='Intruder' returning user_id) select public.test_assert((select count(*)=0 from changed),'other profile update blocked');
with removed as (delete from public.saved_lists returning id) select public.test_assert((select count(*)=0 from removed),'other list delete blocked');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select public.test_assert((select count(*)=0 from public.profiles),'admin cannot read player profile/body');
select public.test_assert((select count(*)=0 from public.saved_lists),'admin cannot read player lists');
with modified as (update public.profiles set display_name='Admin change' returning user_id) select public.test_assert((select count(*)=0 from modified),'admin cannot update player body/profile');
with removed as (delete from storage.objects where name='40000000-0000-4000-8000-000000000001.webp' returning id) select public.test_assert((select count(*)=0 from removed),'referenced image cannot be deleted');
update public.stores set status='archived' where id='10000000-0000-4000-8000-000000000001';

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.test_assert((select count(*)=0 from public.products),'archiving store hides descendants');
select public.test_assert((select count(*)=0 from storage.objects),'archiving store hides images');
select public.test_assert((select count(*)=1 from public.saved_lists),'archive preserves saved snapshots');
select public.test_assert((select entries->0->'product'->>'name' = 'Pending label' and entries->0->>'quantity' = '2' from public.saved_lists),'archived catalog keeps full purchase snapshot');

set local role anon;
set local request.jwt.claim.sub = '';
select public.test_assert(not public.is_admin(),'anonymous not admin');
select public.test_denied('select * from public.profiles');
select public.test_denied('select * from public.saved_lists');
select public.test_denied($q$insert into public.stores(name) values ('Anon')$q$);
reset role;
set local role service_role;
select public.release_account_image_ownership('00000000-0000-4000-8000-000000000003');
reset role;
select public.test_assert((select count(*)=2 and bool_and(owner is null and owner_id is null) from storage.objects),'account deletion preserves shared artwork without uploader ownership');
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
select public.test_assert((select count(*)=0 from public.profiles),'account delete cascades profile');
select public.test_assert((select count(*)=0 from public.saved_lists),'account delete cascades lists');
delete from auth.users where id='00000000-0000-4000-8000-000000000003';
select public.test_assert((select count(*)=0 from private.admin_users),'account delete cascades admin assignment');
select public.test_assert((select count(*)=11 from public.catalog_audit),'account deletion preserves catalog history');
select public.test_assert((select bool_and(actor_id is null) from public.catalog_audit),'account deletion anonymizes audit actor');
rollback;
