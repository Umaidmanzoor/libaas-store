-- Run AFTER schema.sql. Safe to run again. Only service_role may call these RPCs.
begin;
alter table public.orders add column if not exists gateway_claimed_at timestamptz;
alter table public.orders add column if not exists customer_email_sent boolean not null default false;
alter table public.orders add column if not exists owner_email_sent boolean not null default false;
alter table public.orders add column if not exists refund_claimed_at timestamptz;

create or replace function public.quote_order(p_items jsonb, p_code text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record; subtotal bigint := 0; discount bigint := 0; shipping integer; cfg public.settings;
  d public.discount_codes; lines jsonb := '[]'; reserved integer; n integer; pending integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid selection'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'qty')::integer not between 1 and 10) then raise exception 'Invalid quantity'; end if;
  if (select count(distinct x->>'variant_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then raise exception 'Duplicate variant'; end if;
  select * into cfg from public.settings where id=1;
  if not found then raise exception 'Store not configured'; end if;
  for r in select v.id,v.size,v.colour,v.stock,v.active,p.name,p.status,
    coalesce(v.price_override_paise,p.price_paise) price, p.id product_id,p.images,
    (x->>'qty')::integer qty from jsonb_array_elements(p_items) x
    join public.variants v on v.id=(x->>'variant_id')::uuid join public.products p on p.id=v.product_id order by v.id
  loop
    if not r.active or r.status <> 'published' then raise exception 'Selection unavailable'; end if;
    select coalesce(sum(qty),0) into reserved from public.stock_reservations where variant_id=r.id and expires_at>now();
    if r.stock-reserved < r.qty then raise exception 'Stock changed'; end if;
    subtotal := subtotal + r.price::bigint*r.qty;
    lines := lines || jsonb_build_object('variant_id',r.id,'product_id',r.product_id,'name',r.name,'size',r.size,'colour',r.colour,'unit_price_paise',r.price,'qty',r.qty,'available',greatest(r.stock-reserved,0),'image',r.images->0->>'src');
  end loop;
  n:=jsonb_array_length(lines);
  if n <> jsonb_array_length(p_items) then raise exception 'Selection unavailable'; end if;
  if coalesce(p_code,'') <> '' then
    select * into d from public.discount_codes where code=upper(trim(p_code));
    if not found or not d.active or (d.starts_at is not null and d.starts_at>now()) or (d.expires_at is not null and d.expires_at<=now()) or subtotal<d.min_subtotal_paise then raise exception 'Discount unavailable'; end if;
    select count(*) into pending from public.orders o where o.discount_code=d.code and o.status='pending_payment'
      and exists(select 1 from public.stock_reservations s where s.order_id=o.id and s.expires_at>now());
    if d.max_uses is not null and d.used_count+pending>=d.max_uses then raise exception 'Discount unavailable'; end if;
    discount:=least(subtotal,case when d.kind='percent' then subtotal*d.value/100 else d.value end);
  end if;
  shipping:=case when subtotal>=cfg.free_shipping_threshold_paise then 0 else cfg.shipping_fee_paise end;
  if subtotal-discount+shipping<100 or subtotal+shipping>2147483647 then raise exception 'Order total unavailable'; end if;
  return jsonb_build_object('items',lines,'subtotal_paise',subtotal,'discount_paise',discount,'shipping_paise',shipping,'total_paise',subtotal-discount+shipping);
end $$;

create or replace function public.create_order(p_token uuid,p_items jsonb,p_customer jsonb,p_code text,p_expected_total integer,p_is_test boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.orders; q jsonb; oid uuid; num text; chars text:='23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; b bytea; i integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_token::text,0));
  select * into existing from public.orders where checkout_token=p_token;
  if found then
    if existing.status <> 'pending_payment' or not exists(select 1 from public.stock_reservations where order_id=existing.id and expires_at>now()) then raise exception 'Checkout expired'; end if;
    if existing.total_paise<>p_expected_total then raise exception 'Total changed'; end if;
    return to_jsonb(existing);
  end if;
  perform v.id from public.variants v join jsonb_array_elements(p_items) x on v.id=(x->>'variant_id')::uuid order by v.id for update of v;
  if coalesce(p_code,'')<>'' then perform id from public.discount_codes where code=upper(trim(p_code)) for update; end if;
  q:=public.quote_order(p_items,p_code);
  if (q->>'total_paise')::integer<>p_expected_total then raise exception 'Total changed'; end if;
  -- A random UUID contributes 128 bits; rejection sampling avoids sequential numbers.
  loop
    b:=decode(replace(gen_random_uuid()::text,'-',''),'hex'); num:='LB-';
    for i in 0..7 loop num:=num||substr(chars,(get_byte(b,i)%length(chars))+1,1); end loop;
    exit when not exists(select 1 from public.orders where number=num);
  end loop;
  insert into public.orders(number,checkout_token,customer_name,email,phone,address,subtotal_paise,discount_paise,shipping_paise,total_paise,discount_code,consent_marketing,is_test)
    values(num,p_token,p_customer->>'name',lower(p_customer->>'email'),p_customer->>'mobile',p_customer->'address',
      (q->>'subtotal_paise')::integer,(q->>'discount_paise')::integer,(q->>'shipping_paise')::integer,(q->>'total_paise')::integer,
      nullif(upper(trim(p_code)),''),coalesce((p_customer->>'consent_marketing')::boolean,false),p_is_test) returning id into oid;
  insert into public.order_items(order_id,product_id,variant_id,name,size,colour,unit_price_paise,qty,image)
    select oid,(x->>'product_id')::uuid,(x->>'variant_id')::uuid,x->>'name',x->>'size',x->>'colour',(x->>'unit_price_paise')::integer,(x->>'qty')::integer,x->>'image' from jsonb_array_elements(q->'items') x;
  insert into public.stock_reservations(order_id,variant_id,qty,expires_at)
    select oid,(x->>'variant_id')::uuid,(x->>'qty')::integer,now()+interval '20 minutes' from jsonb_array_elements(q->'items') x;
  select * into existing from public.orders where id=oid;
  return to_jsonb(existing);
end $$;

create or replace function public.mark_order_paid(p_order uuid,p_payment text,p_amount integer,p_event text default null,p_event_type text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders; r record; available integer; attention boolean:=false; note text:='';
begin
  select * into o from public.orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if p_event is not null then
    insert into public.payment_events(event_id,type,razorpay_order_id,razorpay_payment_id) values(p_event,p_event_type,o.razorpay_order_id,p_payment) on conflict do nothing;
    if not found then return false; end if;
  end if;
  if o.paid_at is not null then
    if o.razorpay_payment_id is distinct from p_payment then update public.orders set needs_attention=true,attention_note=concat_ws('; ',attention_note,'Additional payment received') where id=o.id; end if;
    return false;
  end if;
  if p_amount<>o.total_paise then attention:=true;note:='Captured amount differs from order total. '; end if;
  if o.status in ('cancelled','refunded') then attention:=true;note:=note||'Payment received after cancellation. '; end if;
  if not exists(select 1 from public.stock_reservations where order_id=o.id and expires_at>now()) then attention:=true;note:=note||'Payment arrived after reservation expiry. '; end if;
  for r in select variant_id,sum(qty)::integer qty from public.order_items where order_id=o.id group by variant_id order by variant_id loop
    select stock into available from public.variants where id=r.variant_id for update;
    if not found or available<r.qty then attention:=true;note:=note||'Stock requires review. '; end if;
    update public.variants set stock=greatest(0,stock-r.qty) where id=r.variant_id;
  end loop;
  update public.orders set status='paid',paid_at=now(),razorpay_payment_id=p_payment,needs_attention=needs_attention or attention,
    attention_note=case when attention then concat_ws('; ',attention_note,note) else attention_note end where id=o.id;
  delete from public.stock_reservations where order_id=o.id;
  update public.discount_codes set used_count=used_count+1 where code=o.discount_code;
  return true;
end $$;

create or replace function public.mark_order_failed(p_order uuid,p_event text default null)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
  select * into o from public.orders where id=p_order for update;
  if not found then return; end if;
  if p_event is not null then
    insert into public.payment_events(event_id,type,razorpay_order_id) values(p_event,'payment.failed',o.razorpay_order_id) on conflict do nothing;
    if not found then return; end if;
  end if;
  if o.status='pending_payment' and o.paid_at is null then
    update public.orders set status='payment_failed' where id=o.id;
    delete from public.stock_reservations where order_id=o.id;
  end if;
end $$;

create or replace function public.cancel_order(p_order uuid,p_restock boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders; r record;
begin
  select * into o from public.orders where id=p_order for update;
  if not found or o.status in ('cancelled','refunded') then return false; end if;
  if p_restock and o.paid_at is not null then
    for r in select variant_id,sum(qty)::integer qty from public.order_items where order_id=o.id group by variant_id order by variant_id loop
      update public.variants set stock=stock+r.qty where id=r.variant_id;
    end loop;
  end if;
  update public.orders set status='cancelled' where id=o.id;
  delete from public.stock_reservations where order_id=o.id;
  return true;
end $$;

create or replace function public.storefront_variants()
returns table(id uuid,product_id uuid,size text,colour text,available integer,price_paise integer,sort_order integer)
language sql security definer set search_path='' as $$
select v.id,v.product_id,v.size,v.colour,greatest(0,v.stock-coalesce((select sum(s.qty)::integer from public.stock_reservations s where s.variant_id=v.id and s.expires_at>now()),0)),coalesce(v.price_override_paise,p.price_paise),v.sort_order
from public.variants v join public.products p on p.id=v.product_id where v.active and p.status='published'; $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('quote_order','create_order','mark_order_paid','mark_order_failed','cancel_order','storefront_variants') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
