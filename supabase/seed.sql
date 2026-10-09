-- Optional requested-name catalog. All labels and retailer availability are
-- explicitly UNVERIFIED; unknown nutrients are null, not zero. No artwork.
begin;
insert into public.stores(id,name,status) values
 ('a1000000-0000-4000-8000-000000000001','Lidl','published'),
 ('a1000000-0000-4000-8000-000000000002','Metro','published'),
 ('a1000000-0000-4000-8000-000000000003','Kaufland','published')
on conflict (id) do nothing;
insert into public.shelves(id,store_id,name,slot,status) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Produse solicitate — etichete de verificat',0,'published'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Produse solicitate — etichete de verificat',0,'published'),
 ('a2000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003','Produse solicitate — etichete de verificat',0,'published')
on conflict (id) do nothing;
insert into public.products(id,shelf_id,name,group_name,color,shape,package_amount,package_unit,units_per_pack,portion,source,status) values
 ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','GOLFERA Piept Curcan Feliat 80 g','Carne','clay','tray',80,'g',1,40,'Denumire furnizată la cerere; eticheta și disponibilitatea în magazin nu sunt verificate.','published'),
 ('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','REGGIA Tortellini cu Carne 500 g','Paste','grain','pasta',500,'g',1,150,'Denumire furnizată la cerere; eticheta și disponibilitatea în magazin nu sunt verificate.','published'),
 ('a3000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000002','COCA-COLA Zero Cofeina Doza SGR 4 x 0,33 L','Băuturi','clay','can',330,'ml',4,250,'Denumire furnizată la cerere; eticheta și disponibilitatea în magazin nu sunt verificate.','published'),
 ('a3000000-0000-4000-8000-000000000004','a2000000-0000-4000-8000-000000000002','COCA-COLA ZERO ZAHAR Doza SGR 12 x 0,25 L','Băuturi','clay','can',250,'ml',12,250,'Denumire furnizată la cerere; eticheta și disponibilitatea în magazin nu sunt verificate.','published'),
 ('a3000000-0000-4000-8000-000000000005','a2000000-0000-4000-8000-000000000001','Biscuiți de Crăciun cocos/migdale','Biscuiți','grain','box',null,'g',1,30,'Denumire furnizată la cerere; varianta, cantitatea, eticheta și disponibilitatea sunt de verificat.','published'),
 ('a3000000-0000-4000-8000-000000000006','a2000000-0000-4000-8000-000000000001','Ulei de măsline extravirgin / rafinat și virgin','Ulei','leaf','bottle',null,'ml',1,10,'Denumire furnizată la cerere; varianta, cantitatea, eticheta și disponibilitatea sunt de verificat.','published'),
 ('a3000000-0000-4000-8000-000000000007','a2000000-0000-4000-8000-000000000003','Napolitana cu crema cu cacao Sly, fara zahar, 20 g','Napolitane','clay','wafer',20,'g',1,20,'Denumire furnizată la cerere; eticheta și disponibilitatea în magazin nu sunt verificate.','published'),
 ('a3000000-0000-4000-8000-000000000008','a2000000-0000-4000-8000-000000000003','Napolitana cu crema cu vanilie Sly, fara zahar, 20 g','Napolitane','milk','wafer',20,'g',1,20,'Denumire furnizată la cerere; eticheta și disponibilitatea în magazin nu sunt verificate.','published')
on conflict (id) do nothing;
commit;
