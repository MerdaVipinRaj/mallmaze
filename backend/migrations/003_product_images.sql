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
