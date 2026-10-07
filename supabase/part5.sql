-- Admin query indexes and dashboard aggregates. Safe to run more than once.
begin;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
set local search_path = public, extensions;
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_paid_at_idx on public.orders(paid_at desc) where status in ('paid','packed','shipped','delivered');
-- The existing unique constraints already index orders.number and products.slug.
create index if not exists orders_number_search_idx on public.orders using gin(number gin_trgm_ops);
create index if not exists orders_email_search_idx on public.orders using gin(email gin_trgm_ops);
create index if not exists orders_phone_search_idx on public.orders using gin(phone gin_trgm_ops);
create index if not exists products_category_status_idx on public.products(category_id,status,sort_order);
create index if not exists products_status_updated_idx on public.products(status,updated_at desc);
create index if not exists products_updated_idx on public.products(updated_at desc);
create index if not exists products_name_search_idx on public.products using gin(name gin_trgm_ops);
create index if not exists variants_product_idx on public.variants(product_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists reservations_variant_expiry_idx on public.stock_reservations(variant_id,expires_at);
create index if not exists reservations_expiry_idx on public.stock_reservations(expires_at);
create index if not exists messages_status_created_idx on public.messages(status,created_at desc);
create index if not exists subscribers_created_idx on public.subscribers(created_at desc);

create or replace function public.admin_dashboard()
returns jsonb language sql stable security definer set search_path = '' as $$
with bounds as (
  select (date_trunc('day',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as today
), paid as materialized (
  select o.id,o.total_paise,o.paid_at from public.orders o,bounds b
  where o.status in ('paid','packed','shipped','delivered') and o.paid_at >= b.today-interval '29 days'
), days as (
  select generate_series(0,29) as n
), top_products as (
  select i.name,sum(i.qty) as qty from public.order_items i join paid p on p.id=i.order_id
  group by i.name order by sum(i.qty) desc,i.name limit 5
)
select jsonb_build_object(
  'sums',jsonb_build_array(
    coalesce((select sum(total_paise) from paid,bounds where paid_at>=today),0),
    coalesce((select sum(total_paise) from paid,bounds where paid_at>=today-interval '6 days'),0),
    coalesce((select sum(total_paise) from paid),0)),
  'paid_count',(select count(*) from paid),
  'chart',(select jsonb_agg(jsonb_build_object(
    'day',to_char((b.today-(29-d.n)*interval '1 day') at time zone 'Asia/Kolkata','YYYY-MM-DD'),
    'amount',coalesce((select sum(p.total_paise) from paid p where p.paid_at>=b.today-(29-d.n)*interval '1 day' and p.paid_at<b.today-(28-d.n)*interval '1 day'),0)) order by d.n) from days d cross join bounds b),
  'waiting',(select count(*) from public.orders where status='paid'),
  'flagged',(select count(*) from public.orders where needs_attention),
  'unread',(select count(*) from public.messages where status='new'),
  'top',coalesce((select jsonb_agg(jsonb_build_object('name',name,'qty',qty)) from top_products),'[]'::jsonb)
);
$$;
revoke all on function public.admin_dashboard() from public,anon,authenticated;
grant execute on function public.admin_dashboard() to service_role;
commit;
