-- Database foundation. Run in the Supabase SQL Editor as the project owner.
begin;
create extension if not exists pgcrypto;
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, caption text not null default '', sort_order integer not null default 0,
  image_path text not null default ''
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  category_id uuid references public.categories(id), technique text not null default '', description text not null default '',
  details jsonb not null default '{}' check(jsonb_typeof(details) = 'object'),
  price_paise integer not null check(price_paise > 0), compare_at_paise integer check(compare_at_paise > 0),
  featured boolean not null default false, status text not null default 'draft' check(status in ('draft','published','archived')),
  sort_order integer not null default 0, images jsonb not null default '[]' check(jsonb_typeof(images) = 'array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique, size text not null, colour text not null, stock integer not null default 0 check(stock >= 0),
  price_override_paise integer check(price_override_paise > 0), active boolean not null default true, sort_order integer not null default 0,
  unique(product_id, size, colour)
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique check(number ~ '^LB-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'),
  checkout_token uuid not null unique,
  status text not null default 'pending_payment' check(status in ('pending_payment','paid','packed','shipped','delivered','cancelled','payment_failed','refunded')),
  needs_attention boolean not null default false, attention_note text,
  customer_name text not null, email text not null, phone text not null check(phone ~ '^[0-9]{10}$'),
  address jsonb not null check(jsonb_typeof(address) = 'object'),
  subtotal_paise integer not null check(subtotal_paise >= 0), discount_paise integer not null default 0 check(discount_paise >= 0),
  shipping_paise integer not null default 0 check(shipping_paise >= 0), total_paise integer not null check(total_paise >= 0),
  discount_code text, razorpay_order_id text unique, razorpay_payment_id text unique, razorpay_refund_id text,
  paid_at timestamptz, shipped_at timestamptz, delivered_at timestamptz, courier text, tracking_id text, admin_note text,
  consent_marketing boolean not null default false, is_test boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(total_paise = subtotal_paise - discount_paise + shipping_paise)
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null, variant_id uuid references public.variants(id) on delete set null,
  name text not null, size text not null, colour text not null, unit_price_paise integer not null check(unit_price_paise > 0),
  qty integer not null check(qty > 0), image text
);
create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.variants(id), qty integer not null check(qty > 0), expires_at timestamptz not null,
  unique(order_id, variant_id)
);
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(), code text not null unique check(code = upper(code)),
  kind text not null check(kind in ('percent','fixed')), value integer not null check(value > 0),
  min_subtotal_paise integer not null default 0 check(min_subtotal_paise >= 0), max_uses integer check(max_uses > 0),
  used_count integer not null default 0 check(used_count >= 0), starts_at timestamptz, expires_at timestamptz,
  active boolean not null default true, check(kind <> 'percent' or value <= 100),
  check(expires_at is null or starts_at is null or expires_at > starts_at)
);
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(), email text not null unique check(email = lower(email)),
  consent_text text not null, source text not null, created_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text,
  message text not null, status text not null default 'new' check(status in ('new','read','archived')),
  created_at timestamptz not null default now()
);
create table if not exists public.settings (
  id integer primary key default 1 check(id = 1), announcement_text text not null default '',
  announcement_enabled boolean not null default false, announcement_link text not null default '',
  shipping_fee_paise integer not null default 25000 check(shipping_fee_paise >= 0),
  free_shipping_threshold_paise integer not null default 500000 check(free_shipping_threshold_paise >= 0),
  whatsapp_number text not null default '', store_phone text not null default '', store_email text not null default '',
  store_address text not null default '', store_hours text not null default ''
);
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade, email text not null unique
);
create table if not exists public.payment_events (
  event_id text primary key, type text not null, razorpay_order_id text, razorpay_payment_id text,
  received_at timestamptz not null default now()
);
create table if not exists public.rate_limits (
  key text primary key, window_start timestamptz not null, count integer not null check(count >= 0)
);
create index if not exists products_category_status_idx on public.products(category_id, status, sort_order);
create index if not exists variants_product_idx on public.variants(product_id);
create index if not exists reservations_variant_expiry_idx on public.stock_reservations(variant_id, expires_at);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.touch_updated_at();

-- Atomic fixed-window limiter. Server callers must hash sensitive identifiers.
create or replace function public.hit_rate_limit(key text, "limit" integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
  if "limit" < 1 or window_seconds < 1 or length(key) > 256 then return false; end if;
  insert into public.rate_limits as r(key, window_start, count) values(key, clock_timestamp(), 1)
  on conflict on constraint rate_limits_pkey do update set
    count = case when r.window_start + make_interval(secs => window_seconds) <= clock_timestamp() then 1 else least(r.count, "limit") + 1 end,
    window_start = case when r.window_start + make_interval(secs => window_seconds) <= clock_timestamp() then clock_timestamp() else r.window_start end
  returning count into hits;
  return hits <= "limit";
end; $$;

do $$ declare t text; begin
  foreach t in array array['categories','products','variants','orders','order_items','stock_reservations','discount_codes','subscribers','messages','settings','admins','payment_events','rate_limits'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories, public.products to anon, authenticated;
drop policy if exists public_categories on public.categories;
create policy public_categories on public.categories for select to anon, authenticated using(true);
drop policy if exists public_products on public.products;
create policy public_products on public.products for select to anon, authenticated using(status = 'published');
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.touch_updated_at() to service_role;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke all on tables from anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/webp','image/jpeg','image/png','image/avif'])
on conflict(id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Public buckets serve downloads. No anon/authenticated INSERT/UPDATE/DELETE
-- policy: only admin-checked server code may issue signed upload URLs.
commit;
