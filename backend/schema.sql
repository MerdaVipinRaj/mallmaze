create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  name text,
  email text unique,
  phone text unique,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists otp_challenges (
  id text primary key,
  channel text not null check (channel in ('email', 'phone')),
  destination text not null,
  otp_hash text not null,
  attempts integer not null default 0,
  consumed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id text primary key,
  owner_user_id text references users(id),
  name text not null,
  slug text unique,
  description text,
  category text,
  address text,
  address_line text,
  area text,
  city text default 'Hyderabad',
  state text default 'Telangana',
  country text default 'India',
  postal_code text,
  latitude numeric,
  longitude numeric,
  phone text,
  email text,
  hours text default '10:00 AM - 9:00 PM',
  opening_time text default '10:00 AM',
  closing_time text default '10:00 PM',
  status text not null default 'active',
  verification_status text not null default 'pending',
  payout_account_ref text,
  payout_status text not null default 'pending',
  bank_beneficiary_name text,
  bank_account_masked text,
  bank_ifsc text,
  bank_account_type text,
  qr_public_token text unique,
  qr_version integer not null default 1,
  qr_enabled boolean not null default true,
  qr_created_at timestamptz default now(),
  qr_updated_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_shopping_sessions (
  id text primary key,
  user_id text references users(id),
  store_id text not null references stores(id),
  session_token text unique,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Location and store discovery indexes
create index if not exists idx_stores_status_verify on stores(status, verification_status);
create index if not exists idx_stores_city_area on stores(city, area);
create index if not exists idx_stores_coords on stores(latitude, longitude);
create index if not exists idx_stores_qr_token on stores(qr_public_token);
create index if not exists idx_sessions_store_user on store_shopping_sessions(store_id, user_id, status);

create table if not exists products (
  id text primary key,
  store_id text references stores(id),
  name text not null,
  category text,
  price_paise integer not null,
  stock_count integer not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  customer_id text references users(id),
  status text not null,
  payment_status text not null,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  subtotal_paise integer not null,
  platform_fee_paise integer not null,
  delivery_fee_paise integer not null,
  tax_paise integer not null,
  total_paise integer not null,
  delivery jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists order_items (
  id bigserial primary key,
  order_id text references orders(id) on delete cascade,
  product_id text references products(id),
  store_id text references stores(id),
  name text not null,
  qty integer not null,
  unit_amount_paise integer not null,
  line_total_paise integer not null
);

create table if not exists store_payouts (
  id text primary key,
  store_id text references stores(id),
  order_id text references orders(id),
  gross_paise integer not null,
  commission_paise integer not null,
  net_payable_paise integer not null,
  status text not null default 'pending',
  razorpay_transfer_id text,
  razorpay_account_id text,
  hold_until timestamptz,
  settled_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists delivery_jobs (
  id text primary key,
  order_id text references orders(id),
  provider text not null,
  lane text not null,
  status text not null,
  customer_otp_required boolean not null default true,
  estimated_minutes integer,
  provider_tracking_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists support_tickets (
  id text primary key,
  user_id text references users(id),
  order_id text references orders(id),
  type text not null default 'other',
  refund_percent integer,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists feedback (
  id text primary key,
  user_id text references users(id),
  email text,
  topic text not null default 'general',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists autoshelf_stock_events (
  id text primary key,
  store_id text references stores(id),
  product_id text references products(id),
  event_type text not null,
  qty_delta integer not null default 0,
  stock_after integer not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists scan_receipts (
  id text primary key,
  user_id text references users(id),
  store_id text references stores(id),
  token text not null unique,
  payment_session_id text,
  payment_status text not null default 'paid',
  status text not null default 'paid',
  total_paise integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by text
);

create table if not exists mm_users (
  id text primary key,
  name text,
  email text,
  phone text,
  role text,
  created_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_stores (
  id text primary key,
  name text not null,
  category text,
  owner_name text,
  phone text,
  address text,
  verification_status text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_products (
  id text primary key,
  store_id text,
  name text not null,
  category text,
  price_paise integer not null default 0,
  stock_qty integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz,
  updated_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_orders (
  id text primary key,
  customer_id text,
  status text,
  payment_status text,
  razorpay_order_id text,
  razorpay_payment_id text,
  subtotal_paise integer not null default 0,
  platform_fee_paise integer not null default 0,
  delivery_fee_paise integer not null default 0,
  tax_paise integer not null default 0,
  total_paise integer not null default 0,
  created_at timestamptz,
  paid_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_scan_receipts (
  id text primary key,
  user_id text,
  store_id text,
  token text unique not null,
  payment_session_id text,
  payment_status text,
  status text,
  total_paise integer not null default 0,
  created_at timestamptz,
  verified_at timestamptz,
  verified_by text,
  raw_data jsonb not null
);

create table if not exists mm_stock_events (
  id text primary key,
  store_id text,
  product_id text,
  event_type text,
  qty_delta integer not null default 0,
  stock_after integer not null default 0,
  reason text,
  created_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_delivery_jobs (
  id text primary key,
  order_id text,
  provider text,
  lane text,
  status text,
  estimated_minutes integer,
  provider_tracking_id text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_support_tickets (
  id text primary key,
  user_id text,
  order_id text,
  type text,
  refund_percent integer,
  message text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_feedback (
  id text primary key,
  user_id text,
  email text,
  topic text,
  message text,
  status text,
  created_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_otp_challenges (
  id text primary key,
  channel text,
  value text,
  attempts integer not null default 0,
  consumed boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz,
  raw_data jsonb not null
);

create table if not exists mm_reservations (
  id text primary key,
  customer_id text,
  store_id text,
  product_id text,
  status text,
  created_at timestamptz,
  raw_data jsonb not null
);

create index if not exists idx_mm_reservations_store_id on mm_reservations(store_id);
create index if not exists idx_mm_stock_events_product_id on mm_stock_events(product_id);
create index if not exists idx_mm_orders_customer_id on mm_orders(customer_id);
create index if not exists idx_mm_scan_receipts_token on mm_scan_receipts(token);
create index if not exists idx_mm_support_tickets_user_id on mm_support_tickets(user_id);
create index if not exists idx_mm_feedback_topic on mm_feedback(topic);


-- ============================================================
-- MALLMAZE — Migration 003: Product Media Studio Table
-- ============================================================

-- Add images column to products table if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='products' and column_name='images') then
    alter table products add column images jsonb default '[]'::jsonb;
  end if;
end $$;

-- Create dedicated product_images table
create table if not exists product_images (
  id text primary key,
  product_id text references products(id) on delete cascade,
  store_id text references stores(id),
  storage_path text not null,
  original_storage_path text,
  processed_storage_path text,
  thumbnail_storage_path text,
  mime_type text,
  width integer,
  height integer,
  file_size bigint,
  sort_order integer default 0,
  is_primary boolean default false,
  processing_status text default 'ready',
  processing_provider text,
  processing_version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optimize indexing for lightning-fast product queries
create index if not exists idx_product_images_product_id on product_images(product_id);
create index if not exists idx_product_images_store_id on product_images(store_id);
create index if not exists idx_product_images_sort_order on product_images(product_id, sort_order);
