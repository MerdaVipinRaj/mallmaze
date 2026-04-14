-- Add delivery address/contact fields to orders (run once)
alter table public.orders
  add column if not exists delivery_name text,
  add column if not exists delivery_phone text,
  add column if not exists delivery_address jsonb;

