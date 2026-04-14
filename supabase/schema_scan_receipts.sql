-- Scan & Go payments + receipts (Supabase Postgres)
-- Run after `supabase/schema.sql`.

-- 1) Expand scan session status to include payment lifecycle
alter table public.scan_sessions drop constraint if exists scan_sessions_status_check;
alter table public.scan_sessions
  add constraint scan_sessions_status_check check (status in ('open','pending_payment','paid','cancelled'));

-- 2) Store Stripe checkout session for scan payment
alter table public.scan_sessions
  add column if not exists stripe_checkout_session_id text;

-- 3) Receipt table (QR token)
create table if not exists public.scan_receipts (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.scan_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id),
  total_inr int not null default 0,
  stripe_checkout_session_id text,
  token text not null unique,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.scan_receipts enable row level security;

