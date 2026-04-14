-- MallMaze v1 schema (Supabase Postgres)
-- Run in Supabase SQL editor. Then configure RLS policies.

create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  default_city text,
  created_at timestamptz not null default now()
);

-- Roles (simple role per user for v1)
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer','store_manager','admin')),
  created_at timestamptz not null default now()
);

-- Catalog
create table if not exists public.malls (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text not null,
  address text,
  image_url text,
  description text,
  open_hours text,
  floors int,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default uuid_generate_v4(),
  mall_id uuid references public.malls(id) on delete set null,
  name text not null,
  category text,
  floor text,
  city text not null,
  image_url text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  mall_id uuid references public.malls(id) on delete set null,
  name text not null,
  description text,
  category text,
  price_inr int not null check (price_inr >= 0),
  original_price_inr int,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  available_qty int not null default 0 check (available_qty >= 0),
  reserved_qty int not null default 0 check (reserved_qty >= 0),
  updated_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text,
  status text not null check (status in ('pending_payment','paid','preparing','out_for_delivery','delivered','cancelled','refunded')),
  subtotal_inr int not null default 0,
  tax_inr int not null default 0,
  total_inr int not null default 0,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name text not null,
  unit_price_inr int not null,
  qty int not null check (qty > 0)
);

create table if not exists public.deliveries (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text,
  tracking_id text,
  status text,
  eta_minutes int,
  updated_at timestamptz not null default now()
);

-- Scan & Go
create table if not exists public.scan_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id),
  status text not null check (status in ('open','paid','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.scan_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.scan_sessions(id) on delete cascade,
  product_id uuid references public.products(id),
  code text,
  name text,
  unit_price_inr int not null default 0,
  qty int not null default 1 check (qty > 0)
);

-- Minimal RLS enablement (policies added separately)
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.malls enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.deliveries enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.scan_items enable row level security;

