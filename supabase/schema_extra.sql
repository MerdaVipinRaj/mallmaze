-- Additional schema for “best-in-class” ops

create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('refund','missing_item','wrong_item','damaged','late','other')),
  refund_percent int check (refund_percent between 0 and 100),
  message text,
  status text not null default 'open' check (status in ('open','triaging','approved','rejected','resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.order_events enable row level security;

