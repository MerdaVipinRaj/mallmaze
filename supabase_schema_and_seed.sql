-- ===========================================================================
-- MALLMAZE FULL SUPABASE POSTGRESQL SCHEMA & INITIAL DATA SEED
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/noczhsyfkfctjpbgnlcp/sql/new
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS public.app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.mm_users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);


CREATE TABLE IF NOT EXISTS public.mm_stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  category TEXT,
  description TEXT,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT DEFAULT 'Hyderabad',
  state TEXT DEFAULT 'Telangana',
  pincode TEXT,
  hours TEXT DEFAULT '10:00 AM - 9:00 PM',
  verification_status TEXT DEFAULT 'verified',
  bank_beneficiary_name TEXT,
  bank_account_masked TEXT,
  bank_ifsc TEXT,
  qr_public_token TEXT,
  qr_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);


CREATE TABLE IF NOT EXISTS public.mm_products (
  id TEXT PRIMARY KEY,
  store_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price_paise INT NOT NULL DEFAULT 0,
  price_inr NUMERIC GENERATED ALWAYS AS (price_paise / 100.0) STORED,
  mrp_paise INT NOT NULL DEFAULT 0,
  stock_qty INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);


CREATE TABLE IF NOT EXISTS public.mm_orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  store_id TEXT,
  status TEXT DEFAULT 'paid',
  payment_status TEXT DEFAULT 'paid',
  payment_method TEXT DEFAULT 'UPI',
  subtotal_paise INT NOT NULL DEFAULT 0,
  delivery_fee_paise INT NOT NULL DEFAULT 0,
  tax_paise INT NOT NULL DEFAULT 0,
  total_paise INT NOT NULL DEFAULT 0,
  total_inr NUMERIC GENERATED ALWAYS AS (total_paise / 100.0) STORED,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shiprocket_tracking TEXT,
  shiprocket_rider TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);


CREATE TABLE IF NOT EXISTS public.mm_reservations (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  store_id TEXT,
  product_name TEXT,
  total_order_inr NUMERIC DEFAULT 600,
  token_amount_inr NUMERIC DEFAULT 42,
  balance_due_at_store_inr NUMERIC DEFAULT 558,
  otp_code TEXT NOT NULL,
  status TEXT DEFAULT 'ready_for_pickup',
  created_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);


CREATE TABLE IF NOT EXISTS public.mm_delivery_jobs (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  tracking_number TEXT,
  rider_name TEXT,
  speed_tier TEXT DEFAULT 'zepto_flash',
  status TEXT DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.mm_stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on mm_stores" ON public.mm_stores;
CREATE POLICY "Allow public read on mm_stores" ON public.mm_stores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on mm_stores" ON public.mm_stores;
CREATE POLICY "Allow full access for service and anon on mm_stores" ON public.mm_stores FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.mm_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on mm_products" ON public.mm_products;
CREATE POLICY "Allow public read on mm_products" ON public.mm_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on mm_products" ON public.mm_products;
CREATE POLICY "Allow full access for service and anon on mm_products" ON public.mm_products FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.mm_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on mm_orders" ON public.mm_orders;
CREATE POLICY "Allow public read on mm_orders" ON public.mm_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on mm_orders" ON public.mm_orders;
CREATE POLICY "Allow full access for service and anon on mm_orders" ON public.mm_orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.mm_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on mm_users" ON public.mm_users;
CREATE POLICY "Allow public read on mm_users" ON public.mm_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on mm_users" ON public.mm_users;
CREATE POLICY "Allow full access for service and anon on mm_users" ON public.mm_users FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.mm_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on mm_reservations" ON public.mm_reservations;
CREATE POLICY "Allow public read on mm_reservations" ON public.mm_reservations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on mm_reservations" ON public.mm_reservations;
CREATE POLICY "Allow full access for service and anon on mm_reservations" ON public.mm_reservations FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.mm_delivery_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on mm_delivery_jobs" ON public.mm_delivery_jobs;
CREATE POLICY "Allow public read on mm_delivery_jobs" ON public.mm_delivery_jobs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on mm_delivery_jobs" ON public.mm_delivery_jobs;
CREATE POLICY "Allow full access for service and anon on mm_delivery_jobs" ON public.mm_delivery_jobs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on app_state" ON public.app_state;
CREATE POLICY "Allow public read on app_state" ON public.app_state FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow full access for service and anon on app_state" ON public.app_state;
CREATE POLICY "Allow full access for service and anon on app_state" ON public.app_state FOR ALL USING (true) WITH CHECK (true);

-- ===========================================================================
-- SEED DATA: STORES
-- ===========================================================================


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('store-1790518797286-860', 'Test Organic Mart Live', 'test-organic-mart-live-store-1790518797286-860', 'Retail Store', '12-3-456, Gandhi Nagar, Near Water Tank', 'Hyderabad', '9876543210', 'verified', '{"id": "store-1790518797286-860", "slug": "test-organic-mart-live-store-1790518797286-860", "description": "", "address_line": "12-3-456, Gandhi Nagar, Near Water Tank", "area": "", "country": "India", "postal_code": "", "latitude": null, "longitude": null, "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "3f2df2fc78393f3a7768ade146ba92a1", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-27T14:19:57.307Z", "qr_updated_at": "2026-09-27T14:19:57.307Z", "name": "Test Organic Mart Live", "category": "Retail Store", "owner_name": "Ravi Kumar", "owner_user_id": "", "phone": "9876543210", "address": "12-3-456, Gandhi Nagar, Near Water Tank", "city": "Hyderabad", "state": "Telangana", "hours": "10:00 AM - 9:00 PM", "banner_url": "assets/media/hero-mall.jpg", "verification_status": "verified", "verification_doc": "", "verification_photo_url": "", "verified_at": "2026-09-27T14:19:57.303Z", "rejected_at": null, "bank": {"beneficiary_name": "Ravi Kumar", "account_number": "9876543210123", "account_number_masked": "XXXX-XXXX-0123", "ifsc_code": "SBIN0001234", "account_type": "current", "pan": ""}, "payout_account_ref": "acc_route_test_organic_mart_live", "payout_status": "active", "payout_error": "", "payout_updated_at": null, "created_at": "2026-09-27T14:19:57.307Z", "updated_at": "2026-09-27T14:19:57.307Z", "pincode": "500028", "shiprocket_pickup_name": "Test Organic Mart Live", "pickup_registered": true, "pickup_registered_at": "2026-09-27T14:19:57.341Z", "pickup_address_snapshot": {"location_name": "Test Organic Mart Live", "address": "12-3-456, Gandhi Nagar, Near Water Tank", "city": "Hyderabad", "state": "Telangana", "pincode": "500028", "phone": "9876543210"}}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('store-1790517988953-764', 'Balaji Super Bazaar', 'balaji-super-bazaar-store-1790517988953-764', 'Hyperlocal Supermarket & Grocery', '10-2-211, Kameshwar Rao Colony, Lingojiguda', 'Saroornagar', '8309427763', 'verified', '{"id": "store-1790517988953-764", "slug": "balaji-super-bazaar-store-1790517988953-764", "description": "", "address_line": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "area": "", "country": "India", "postal_code": "", "latitude": null, "longitude": null, "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "548ec25b5526800e0449e68645d962be", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-27T14:06:28.958Z", "qr_updated_at": "2026-09-27T14:06:28.958Z", "name": "Balaji Super Bazaar", "category": "Hyperlocal Supermarket & Grocery", "owner_name": "Vipin Raj", "owner_user_id": "", "phone": "8309427763", "address": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "city": "Saroornagar", "state": "Telangana", "hours": "10:00 AM - 9:00 PM", "banner_url": "assets/media/hero-mall.jpg", "verification_status": "verified", "verification_doc": "", "verification_photo_url": "", "verified_at": "2026-09-27T14:06:28.954Z", "rejected_at": null, "bank": {"beneficiary_name": "Balaji Super Bazaar", "account_number": "50200084920194", "account_number_masked": "", "ifsc_code": "HDFC0001234", "account_type": "current", "pan": "AABCB1234K"}, "payout_account_ref": "acc_route_balaji_super_bazaar", "payout_status": "active", "payout_error": "", "payout_updated_at": null, "created_at": "2026-09-27T14:06:28.958Z", "updated_at": "2026-09-27T14:06:28.958Z", "pincode": "500035", "shiprocket_pickup_name": "Balaji Super Bazaar", "pickup_registered": true, "pickup_registered_at": "2026-09-27T14:06:28.960Z", "pickup_address_snapshot": {"location_name": "Balaji Super Bazaar", "address": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "city": "Saroornagar", "state": "Telangana", "pincode": "500035", "phone": "8309427763"}}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('store-1790517890279-834', 'Balaji Super Bazaar', 'balaji-super-bazaar-store-1790517890279-834', 'Hyperlocal Supermarket & Grocery', '10-2-211, Kameshwar Rao Colony, Lingojiguda', 'Saroornagar', '8309427763', 'verified', '{"id": "store-1790517890279-834", "slug": "balaji-super-bazaar-store-1790517890279-834", "description": "", "address_line": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "area": "", "country": "India", "postal_code": "", "latitude": null, "longitude": null, "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "30007416e4b1c74cac164c110e125711", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-27T14:04:50.331Z", "qr_updated_at": "2026-09-27T14:04:50.331Z", "name": "Balaji Super Bazaar", "category": "Hyperlocal Supermarket & Grocery", "owner_name": "Vipin Raj", "owner_user_id": "", "phone": "8309427763", "address": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "city": "Saroornagar", "state": "Telangana", "hours": "10:00 AM - 9:00 PM", "banner_url": "assets/media/hero-mall.jpg", "verification_status": "verified", "verification_doc": "", "verification_photo_url": "", "verified_at": "2026-09-27T14:04:50.285Z", "rejected_at": null, "bank": {"beneficiary_name": "Balaji Super Bazaar", "account_number": "50200084920194", "account_number_masked": "", "ifsc_code": "HDFC0001234", "account_type": "current", "pan": "AABCB1234K"}, "payout_account_ref": "acc_route_balaji_super_bazaar", "payout_status": "active", "payout_error": "", "payout_updated_at": null, "created_at": "2026-09-27T14:04:50.331Z", "updated_at": "2026-09-27T14:04:50.331Z", "pincode": "500035", "shiprocket_pickup_name": "Balaji Super Bazaar", "pickup_registered": true, "pickup_registered_at": "2026-09-27T14:04:50.343Z", "pickup_address_snapshot": {"location_name": "Balaji Super Bazaar", "address": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "city": "Saroornagar", "state": "Telangana", "pincode": "500035", "phone": "8309427763"}}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('store-1790517816369-799', 'Balaji Super Bazaar', 'balaji-super-bazaar-store-1790517816369-799', 'Hyperlocal Supermarket & Grocery', '10-2-211, Kameshwar Rao Colony, Lingojiguda', 'Saroornagar', '8309427763', 'verified', '{"id": "store-1790517816369-799", "slug": "balaji-super-bazaar-store-1790517816369-799", "description": "", "address_line": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "area": "", "country": "India", "postal_code": "", "latitude": null, "longitude": null, "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "23bd481f195c288fe29deffa675eb323", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-27T14:03:36.393Z", "qr_updated_at": "2026-09-27T14:03:36.393Z", "name": "Balaji Super Bazaar", "category": "Hyperlocal Supermarket & Grocery", "owner_name": "Vipin Raj", "owner_user_id": "", "phone": "8309427763", "address": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "city": "Saroornagar", "state": "Telangana", "hours": "10:00 AM - 9:00 PM", "banner_url": "assets/media/hero-mall.jpg", "verification_status": "verified", "verification_doc": "", "verification_photo_url": "", "verified_at": "2026-09-27T14:03:36.371Z", "rejected_at": null, "bank": {"beneficiary_name": "Balaji Super Bazaar", "account_number": "50200084920194", "account_number_masked": "", "ifsc_code": "HDFC0001234", "account_type": "current", "pan": "AABCB1234K"}, "payout_account_ref": "acc_route_balaji_super_bazaar", "payout_status": "active", "payout_error": "", "payout_updated_at": null, "created_at": "2026-09-27T14:03:36.393Z", "updated_at": "2026-09-27T14:03:36.393Z", "shiprocket_pickup_name": "Balaji Super Bazaar", "pickup_registered": true, "pickup_registered_at": "2026-09-27T14:03:36.402Z", "pickup_address_snapshot": {"location_name": "Balaji Super Bazaar", "address": "10-2-211, Kameshwar Rao Colony, Lingojiguda", "city": "Saroornagar", "state": "Telangana", "phone": "8309427763"}}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('s1', 'TechZone Electronics', 'techzone-electronics-s1', 'Electronics & Gadgets', 'Unit G-12, Ground Floor, Phoenix Marketcity, Whitefield, Bangalore', 'Bangalore', '+91 98201 12345', 'verified', '{"id": "s1", "name": "TechZone Electronics", "category": "Electronics & Gadgets", "owner_name": "Vikram Mehta", "owner_email": "vikram@techzone.in", "owner_phone": "+91 98450 12345", "mall_id": "mall-phx-blr", "mall_name": "Phoenix Marketcity", "city": "Bangalore", "address": "Unit G-12, Ground Floor, Phoenix Marketcity, Whitefield, Bangalore", "hours": "10:00 AM - 9:30 PM", "verification_status": "verified", "verified_at": "2026-01-05T10:00:00.000Z", "pos_system": "GoFrugal RetailEasy", "payout_status": "active", "bank": {"bank_name": "HDFC Bank", "account_number_masked": "XXXX-XXXX-4921", "ifsc_code": "HDFC0000128", "beneficiary_name": "TechZone Retail Private Limited", "account_number": "50200012344921", "account_type": "current"}, "created_at": "2026-01-05T00:00:00.000Z", "payout_account_ref": "acc_route_s1_techzone", "payout_updated_at": "2026-09-08T07:45:26.340Z", "slug": "techzone-electronics-s1", "area": "Whitefield", "state": "Karnataka", "country": "India", "latitude": 12.9698, "longitude": 77.75, "status": "active", "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "350173ebd16128dc69698cbfaba1af2e", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-17T05:20:27.464Z", "qr_updated_at": "2026-09-17T05:20:27.478Z"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('s2', 'Luxe Fashion House', 'luxe-fashion-house-s2', 'Apparel & Couture', 'Floor 1, Shop 104, Nexus Seawoods Mall, Navi Mumbai', 'Mumbai', '+91 98201 12345', 'verified', '{"id": "s2", "name": "Luxe Fashion House", "category": "Apparel & Couture", "owner_name": "Ananya Roy", "owner_email": "ananya@luxefashion.in", "owner_phone": "+91 98110 54321", "mall_id": "mall-nexus-mumbai", "mall_name": "Nexus Seawoods Mall", "city": "Mumbai", "address": "Floor 1, Shop 104, Nexus Seawoods Mall, Navi Mumbai", "hours": "10:30 AM - 10:00 PM", "verification_status": "verified", "verified_at": "2026-01-06T10:00:00.000Z", "pos_system": "Zoho Inventory", "payout_status": "active", "bank": {"bank_name": "ICICI Bank", "account_number_masked": "XXXX-XXXX-9012", "ifsc_code": "ICIC0000541", "beneficiary_name": "Luxe Couture India", "account_number": "000405009012", "account_type": "current"}, "created_at": "2026-01-06T00:00:00.000Z", "payout_account_ref": "acc_route_s2_luxe", "payout_updated_at": "2026-09-08T07:45:26.372Z", "slug": "luxe-fashion-house-s2", "area": "Bandra West", "state": "Telangana", "country": "India", "latitude": 19.0596, "longitude": 72.8295, "status": "active", "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "afa2a4935ced5bd4dbd7a6b560f4cb44", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-17T05:20:27.479Z", "qr_updated_at": "2026-09-17T05:20:27.479Z"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('s3', 'Beauty Boulevard', 'beauty-boulevard-s3', 'Beauty & Cosmetics', 'First Floor, F-42, Select CITYWALK, Saket, New Delhi', 'Delhi NCR', '+91 98201 12345', 'verified', '{"id": "s3", "name": "Beauty Boulevard", "category": "Beauty & Cosmetics", "owner_name": "Pooja Verma", "owner_email": "pooja@beautyboulevard.in", "owner_phone": "+91 99200 67890", "mall_id": "mall-citywalk-delhi", "mall_name": "Select CITYWALK", "city": "Delhi NCR", "address": "First Floor, F-42, Select CITYWALK, Saket, New Delhi", "hours": "10:00 AM - 9:00 PM", "verification_status": "verified", "verified_at": "2026-01-07T10:00:00.000Z", "pos_system": "Zoho Inventory", "payout_status": "active", "bank": {"bank_name": "Axis Bank", "account_number_masked": "XXXX-XXXX-3344", "ifsc_code": "UTIB0000084", "beneficiary_name": "Beauty Boulevard Retail", "account_number": "918020003344", "account_type": "current"}, "created_at": "2026-01-07T00:00:00.000Z", "payout_account_ref": "acc_route_s3_beauty", "payout_updated_at": "2026-09-08T07:45:26.372Z", "slug": "beauty-boulevard-s3", "area": "Connaught Place", "state": "Telangana", "country": "India", "latitude": 17.4401, "longitude": 78.3489, "status": "active", "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "7a9ba4eb3fedcdc455c2f7d709ef257f", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-17T05:20:27.479Z", "qr_updated_at": "2026-09-17T05:20:27.479Z"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_stores (id, name, slug, category, address, city, phone, verification_status, raw_data)
VALUES ('s4', 'SportX Arena', 'sportx-arena-s4', 'Footwear & Sports', 'Second Floor, S-18, Lulu Mall, Kukatpally, Hyderabad', 'Hyderabad', '+91 98201 12345', 'verified', '{"id": "s4", "name": "SportX Arena", "category": "Footwear & Sports", "owner_name": "Karan Singh", "owner_email": "karan@sportx.in", "owner_phone": "+91 97170 88990", "mall_id": "mall-lulu-hyderabad", "mall_name": "Lulu Mall Hyderabad", "city": "Hyderabad", "address": "Second Floor, S-18, Lulu Mall, Kukatpally, Hyderabad", "hours": "10:00 AM - 10:00 PM", "verification_status": "verified", "verified_at": "2026-01-08T10:00:00.000Z", "pos_system": "SmartMall Mini-POS", "payout_status": "active", "bank": {"bank_name": "State Bank of India", "account_number_masked": "XXXX-XXXX-7788", "ifsc_code": "SBIN0004021", "beneficiary_name": "SportX Athletics", "account_number": "389201947788", "account_type": "current"}, "created_at": "2026-01-08T00:00:00.000Z", "payout_account_ref": "acc_route_s4_sportx", "payout_updated_at": "2026-09-08T07:45:26.372Z", "slug": "sportx-arena-s4", "area": "Madhapur", "state": "Telangana", "country": "India", "latitude": 17.4483, "longitude": 78.3915, "status": "active", "opening_time": "10:00 AM", "closing_time": "10:00 PM", "qr_public_token": "860991583078322367488900676e4c0d", "qr_version": 1, "qr_enabled": true, "qr_created_at": "2026-09-17T05:20:27.479Z", "qr_updated_at": "2026-09-17T05:20:27.479Z"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, raw_data = EXCLUDED.raw_data;


-- ===========================================================================
-- SEED DATA: PRODUCTS
-- ===========================================================================


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p1', 's1', 'Premium Silk Blazer', 'Fashion', 'Premium verified in-store product.', 1299900, 1559880, 15, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', '{"id": "p1", "storeId": "s1", "mallId": "1", "name": "Premium Silk Blazer", "price": 12999, "originalPrice": 18999, "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500", "category": "Fashion", "rating": 4.6, "reviews": 128, "inStock": true, "stockCount": 15, "variants": ["S", "M", "L", "XL"], "storeName": "Luxe Fashion House", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": "Bestseller"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p2', 's2', 'Wireless Noise-Cancel Headphones', 'Electronics', 'Premium verified in-store product.', 749900, 899880, 15, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', '{"id": "p2", "storeId": "s2", "mallId": "1", "name": "Wireless Noise-Cancel Headphones", "price": 7499, "originalPrice": 9999, "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", "category": "Electronics", "rating": 4.8, "reviews": 342, "inStock": true, "stockCount": 45, "variants": ["Black", "White", "Silver"], "storeName": "TechZone Electronics", "mallName": "Grand Luxe Mall", "deliveryTime": "1 hr", "badge": "Bestseller"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p3', 's1', 'Italian Leather Handbag', 'Fashion', 'Premium verified in-store product.', 899900, 1079880, 15, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500', '{"id": "p3", "storeId": "s1", "mallId": "1", "name": "Italian Leather Handbag", "price": 8999, "originalPrice": 14999, "image": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500", "category": "Fashion", "rating": 4.5, "reviews": 89, "inStock": true, "stockCount": 8, "variants": ["Brown", "Black", "Tan"], "storeName": "Luxe Fashion House", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": "40% Off"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p4', 's2', 'Smart Watch Pro X', 'Electronics', 'Premium verified in-store product.', 2499900, 2999880, 15, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', '{"id": "p4", "storeId": "s2", "mallId": "1", "name": "Smart Watch Pro X", "price": 24999, "originalPrice": 29999, "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500", "category": "Electronics", "rating": 4.7, "reviews": 567, "inStock": true, "stockCount": 22, "variants": ["42mm", "46mm"], "storeName": "TechZone Electronics", "mallName": "Grand Luxe Mall", "deliveryTime": "1 hr", "badge": "Trending"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p5', 's5', 'Luxury Perfume Collection', 'Beauty', 'Premium verified in-store product.', 599900, 719880, 15, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500', '{"id": "p5", "storeId": "s5", "mallId": "2", "name": "Luxury Perfume Collection", "price": 5999, "originalPrice": 7999, "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500", "category": "Beauty", "rating": 4.9, "reviews": 234, "inStock": true, "stockCount": 30, "variants": ["50ml", "100ml"], "storeName": "Beauty Boulevard", "mallName": "Phoenix Galleria", "deliveryTime": "25 min", "badge": "Top Rated"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p6', 's4', 'Running Shoes Ultra Boost', 'Sports', 'Premium verified in-store product.', 1199900, 1439880, 15, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', '{"id": "p6", "storeId": "s4", "mallId": "2", "name": "Running Shoes Ultra Boost", "price": 11999, "originalPrice": 15999, "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500", "category": "Sports", "rating": 4.6, "reviews": 198, "inStock": true, "stockCount": 18, "variants": ["7", "8", "9", "10", "11"], "storeName": "SportX Arena", "mallName": "Phoenix Galleria", "deliveryTime": "25 min", "badge": "Popular"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p7', 's1', 'Cashmere Overcoat', 'Fashion', 'Premium verified in-store product.', 1999900, 2399880, 15, 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500', '{"id": "p7", "storeId": "s1", "mallId": "1", "name": "Cashmere Overcoat", "price": 19999, "originalPrice": 29999, "image": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500", "category": "Fashion", "rating": 4.8, "reviews": 56, "inStock": true, "stockCount": 5, "variants": ["M", "L", "XL"], "storeName": "Luxe Fashion House", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": "Premium"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p8', 's1', 'Denim Jacket Classic', 'Fashion', 'Premium verified in-store product.', 399900, 479880, 15, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', '{"id": "p8", "storeId": "s1", "mallId": "1", "name": "Denim Jacket Classic", "price": 3999, "originalPrice": 5999, "image": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500", "category": "Fashion", "rating": 4.3, "reviews": 312, "inStock": true, "stockCount": 42, "variants": ["S", "M", "L", "XL", "XXL"], "storeName": "Luxe Fashion House", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": ""}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p9', 's2', '4K Ultra HD Monitor 27"', 'Electronics', 'Premium verified in-store product.', 3499900, 4199880, 15, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', '{"id": "p9", "storeId": "s2", "mallId": "1", "name": "4K Ultra HD Monitor 27\"", "price": 34999, "originalPrice": 44999, "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500", "category": "Electronics", "rating": 4.6, "reviews": 189, "inStock": true, "stockCount": 12, "variants": ["27 inch", "32 inch"], "storeName": "TechZone Electronics", "mallName": "Grand Luxe Mall", "deliveryTime": "1 hr", "badge": "Flash Deal"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p10', 's2', 'Wireless Earbuds Pro', 'Electronics', 'Premium verified in-store product.', 499900, 599880, 15, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500', '{"id": "p10", "storeId": "s2", "mallId": "1", "name": "Wireless Earbuds Pro", "price": 4999, "originalPrice": 7999, "image": "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500", "category": "Electronics", "rating": 4.5, "reviews": 892, "inStock": true, "stockCount": 100, "variants": ["White", "Black"], "storeName": "TechZone Electronics", "mallName": "Grand Luxe Mall", "deliveryTime": "1 hr", "badge": "37% Off"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p11', 's5', 'Skincare Serum Set', 'Beauty', 'Premium verified in-store product.', 349900, 419880, 15, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500', '{"id": "p11", "storeId": "s5", "mallId": "2", "name": "Skincare Serum Set", "price": 3499, "originalPrice": 4999, "image": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500", "category": "Beauty", "rating": 4.7, "reviews": 456, "inStock": true, "stockCount": 35, "variants": ["Vitamin C", "Retinol", "Hyaluronic"], "storeName": "Beauty Boulevard", "mallName": "Phoenix Galleria", "deliveryTime": "25 min", "badge": "Bestseller"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p12', 's4', 'Yoga Mat Premium', 'Sports', 'Premium verified in-store product.', 199900, 239880, 15, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', '{"id": "p12", "storeId": "s4", "mallId": "2", "name": "Yoga Mat Premium", "price": 1999, "originalPrice": 2999, "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500", "category": "Sports", "rating": 4.3, "reviews": 312, "inStock": true, "stockCount": 80, "variants": ["Purple", "Blue", "Green"], "storeName": "SportX Arena", "mallName": "Phoenix Galleria", "deliveryTime": "25 min", "badge": ""}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p13', 's7', 'Scented Candle Set (6 Pack)', 'Home & Living', 'Premium verified in-store product.', 149900, 179880, 15, 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=500', '{"id": "p13", "storeId": "s7", "mallId": "1", "name": "Scented Candle Set (6 Pack)", "price": 1499, "originalPrice": 2499, "image": "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=500", "category": "Home & Living", "rating": 4.5, "reviews": 234, "inStock": true, "stockCount": 50, "variants": ["Lavender", "Vanilla", "Ocean"], "storeName": "Home Elegance", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": "40% Off"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p14', 's1', 'Formal Cotton Shirt', 'Fashion', 'Premium verified in-store product.', 249900, 299880, 15, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500', '{"id": "p14", "storeId": "s1", "mallId": "1", "name": "Formal Cotton Shirt", "price": 2499, "originalPrice": 3499, "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500", "category": "Fashion", "rating": 4.4, "reviews": 445, "inStock": true, "stockCount": 60, "variants": ["S", "M", "L", "XL"], "storeName": "Luxe Fashion House", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": ""}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p15', 's2', 'Mechanical Gaming Keyboard', 'Electronics', 'Premium verified in-store product.', 899900, 1079880, 15, 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500', '{"id": "p15", "storeId": "s2", "mallId": "1", "name": "Mechanical Gaming Keyboard", "price": 8999, "originalPrice": 11999, "image": "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500", "category": "Electronics", "rating": 4.7, "reviews": 234, "inStock": true, "stockCount": 28, "variants": ["Red Switch", "Blue Switch", "Brown Switch"], "storeName": "TechZone Electronics", "mallName": "Grand Luxe Mall", "deliveryTime": "1 hr", "badge": ""}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p16', 's2', 'Portable Bluetooth Speaker', 'Electronics', 'Premium verified in-store product.', 349900, 419880, 15, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', '{"id": "p16", "storeId": "s2", "mallId": "1", "name": "Portable Bluetooth Speaker", "price": 3499, "originalPrice": 4999, "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500", "category": "Electronics", "rating": 4.4, "reviews": 567, "inStock": true, "stockCount": 55, "variants": ["Black", "Blue", "Red"], "storeName": "TechZone Electronics", "mallName": "Grand Luxe Mall", "deliveryTime": "1 hr", "badge": ""}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p17', 's5', 'Premium Makeup Kit', 'Beauty', 'Premium verified in-store product.', 699900, 839880, 15, 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500', '{"id": "p17", "storeId": "s5", "mallId": "2", "name": "Premium Makeup Kit", "price": 6999, "originalPrice": 9999, "image": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500", "category": "Beauty", "rating": 4.6, "reviews": 178, "inStock": true, "stockCount": 20, "variants": ["Natural", "Glam", "Bridal"], "storeName": "Beauty Boulevard", "mallName": "Phoenix Galleria", "deliveryTime": "25 min", "badge": "30% Off"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p18', 's7', 'Throw Pillow Set (4 Pack)', 'Home & Living', 'Premium verified in-store product.', 299900, 359880, 15, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500', '{"id": "p18", "storeId": "s7", "mallId": "1", "name": "Throw Pillow Set (4 Pack)", "price": 2999, "originalPrice": 4499, "image": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500", "category": "Home & Living", "rating": 4.4, "reviews": 167, "inStock": true, "stockCount": 30, "variants": ["Beige", "Gray", "Navy"], "storeName": "Home Elegance", "mallName": "Grand Luxe Mall", "deliveryTime": "2 hrs", "badge": ""}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p19', 's6', 'Bestseller Fiction Bundle', 'Books', 'Premium verified in-store product.', 99900, 119880, 15, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500', '{"id": "p19", "storeId": "s6", "mallId": "3", "name": "Bestseller Fiction Bundle", "price": 999, "originalPrice": 1599, "image": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500", "category": "Books", "rating": 4.8, "reviews": 1023, "inStock": true, "stockCount": 200, "variants": ["Paperback", "Hardcover"], "storeName": "BookWorm Haven", "mallName": "Royal Arcade", "deliveryTime": "40 min", "badge": "Bestseller"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('p20', 's8', 'Educational Toy Robot', 'Kids', 'Premium verified in-store product.', 499900, 599880, 15, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500', '{"id": "p20", "storeId": "s8", "mallId": "2", "name": "Educational Toy Robot", "price": 4999, "originalPrice": 6999, "image": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500", "category": "Kids", "rating": 4.7, "reviews": 156, "inStock": true, "stockCount": 25, "variants": ["Blue", "Red", "Green"], "storeName": "Kids Paradise", "mallName": "Phoenix Galleria", "deliveryTime": "25 min", "badge": "New"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p1', 'hyd-s3', 'Blue Slim Fit Blazer', 'Fashion', 'Premium verified in-store product.', 549900, 659880, 15, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500', '{"id": "hyd-p1", "storeId": "hyd-s3", "name": "Blue Slim Fit Blazer", "price": 5499, "originalPrice": 7999, "image": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500", "category": "Fashion", "color": "blue", "size": "M", "fit": "slim", "quality_score": 88, "sizes": ["S", "M", "L", "XL"], "rating": 4.6, "inStock": true, "stockCount": 8, "storeName": "BlueLine Formal Wear", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p2', 'hyd-s1', 'Navy Blue Blazer Regular Fit', 'Fashion', 'Premium verified in-store product.', 429900, 515880, 15, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', '{"id": "hyd-p2", "storeId": "hyd-s1", "name": "Navy Blue Blazer Regular Fit", "price": 4299, "originalPrice": 6499, "image": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500", "category": "Fashion", "color": "blue", "size": "L", "fit": "regular", "quality_score": 82, "sizes": ["M", "L", "XL"], "rating": 4.4, "inStock": true, "stockCount": 12, "storeName": "StyleHub Banjara", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p3', 'hyd-s3', 'Royal Blue Tailored Blazer', 'Fashion', 'Premium verified in-store product.', 699900, 839880, 15, 'https://images.unsplash.com/photo-1617137968427-85924c800a41?w=500', '{"id": "hyd-p3", "storeId": "hyd-s3", "name": "Royal Blue Tailored Blazer", "price": 6999, "originalPrice": 9999, "image": "https://images.unsplash.com/photo-1617137968427-85924c800a41?w=500", "category": "Fashion", "color": "blue", "size": "M", "fit": "tailored", "quality_score": 94, "sizes": ["S", "M", "L"], "rating": 4.8, "inStock": true, "stockCount": 5, "storeName": "BlueLine Formal Wear", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p4', 'hyd-s1', 'Light Blue Casual Blazer', 'Fashion', 'Premium verified in-store product.', 359900, 431880, 15, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500', '{"id": "hyd-p4", "storeId": "hyd-s1", "name": "Light Blue Casual Blazer", "price": 3599, "originalPrice": 4999, "image": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500", "category": "Fashion", "color": "blue", "size": "S", "fit": "relaxed", "quality_score": 76, "sizes": ["S", "M", "L", "XL"], "rating": 4.2, "inStock": true, "stockCount": 15, "storeName": "StyleHub Banjara", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p5', 'hyd-s3', 'Blue Blazer Classic Fit', 'Fashion', 'Premium verified in-store product.', 489900, 587880, 15, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', '{"id": "hyd-p5", "storeId": "hyd-s3", "name": "Blue Blazer Classic Fit", "price": 4899, "originalPrice": 6999, "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500", "category": "Fashion", "color": "blue", "size": "XL", "fit": "regular", "quality_score": 85, "sizes": ["L", "XL", "XXL"], "rating": 4.5, "inStock": true, "stockCount": 9, "storeName": "BlueLine Formal Wear", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p6', 'hyd-s2', 'Adjustable Dumbbell Set 24kg', 'Gym Equipment', 'Premium verified in-store product.', 899900, 1079880, 15, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500', '{"id": "hyd-p6", "storeId": "hyd-s2", "name": "Adjustable Dumbbell Set 24kg", "price": 8999, "originalPrice": 11999, "image": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500", "category": "Gym Equipment", "color": "black", "rating": 4.7, "inStock": true, "stockCount": 20, "storeName": "ProFit Gym Gear", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p7', 'hyd-s4', 'Running Shoes Pro', 'Sports', 'Premium verified in-store product.', 599900, 719880, 15, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', '{"id": "hyd-p7", "storeId": "hyd-s4", "name": "Running Shoes Pro", "price": 5999, "originalPrice": 7999, "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500", "category": "Sports", "color": "blue", "sizes": ["7", "8", "9", "10", "11"], "rating": 4.6, "inStock": true, "stockCount": 18, "storeName": "MegaSports Hitec City", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


INSERT INTO public.mm_products (id, store_id, name, category, description, price_paise, mrp_paise, stock_qty, image_url, raw_data)
VALUES ('hyd-p8', 'hyd-s2', 'Commercial Treadmill X200', 'Gym Equipment', 'Premium verified in-store product.', 4599900, 5519880, 15, 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500', '{"id": "hyd-p8", "storeId": "hyd-s2", "name": "Commercial Treadmill X200", "price": 45999, "originalPrice": 54999, "image": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500", "category": "Gym Equipment", "rating": 4.5, "inStock": true, "stockCount": 4, "storeName": "ProFit Gym Gear", "city": "Hyderabad", "virtualSource": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, raw_data = EXCLUDED.raw_data;


-- ===========================================================================
-- SEED DATA: POS & ONLINE ORDERS
-- ===========================================================================


INSERT INTO public.mm_orders (id, customer_name, customer_phone, store_id, status, payment_status, payment_method, total_paise, items, shiprocket_tracking, shiprocket_rider, raw_data)
VALUES ('ORD-LIVE-602992', 'Rajesh Verma', '+91 98110 99421', 's1', 'paid', 'paid', 'UPI / QR', 13450000, '[{"name": "TIG-200 Industrial Inverter Welder", "price": "\u20b954,000"}, {"name": "Bosch Professional Drill", "price": "\u20b934,000"}]'::jsonb, 'SR-IN-602992', 'Rahul Sharma (Zepto Fast 5m)', '{"id": "ORD-LIVE-602992", "customer_name": "Rajesh Verma", "customer_phone": "+91 98110 99421", "store_id": "s1", "status": "paid", "payment_status": "paid", "payment_method": "UPI / QR", "total_paise": 13450000, "shiprocket_tracking": "SR-IN-602992", "shiprocket_rider": "Rahul Sharma (Zepto Fast 5m)", "items": [{"name": "TIG-200 Industrial Inverter Welder", "price": "\u20b954,000"}, {"name": "Bosch Professional Drill", "price": "\u20b934,000"}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, items = EXCLUDED.items;


INSERT INTO public.mm_orders (id, customer_name, customer_phone, store_id, status, payment_status, payment_method, total_paise, items, shiprocket_tracking, shiprocket_rider, raw_data)
VALUES ('ORD-OFF-782190', 'Ramesh Gupta (Counter)', '+91 99304 88120', 's1', 'offline_cash', 'paid', 'Counter Cash', 5400000, '[{"name": "TIG-200 Welder", "price": "\u20b954,000"}]'::jsonb, 'N/A (Counter)', 'In-Store Customer', '{"id": "ORD-OFF-782190", "customer_name": "Ramesh Gupta (Counter)", "customer_phone": "+91 99304 88120", "store_id": "s1", "status": "offline_cash", "payment_status": "paid", "payment_method": "Counter Cash", "total_paise": 5400000, "shiprocket_tracking": "N/A (Counter)", "shiprocket_rider": "In-Store Customer", "items": [{"name": "TIG-200 Welder", "price": "\u20b954,000"}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, items = EXCLUDED.items;


INSERT INTO public.mm_orders (id, customer_name, customer_phone, store_id, status, payment_status, payment_method, total_paise, items, shiprocket_tracking, shiprocket_rider, raw_data)
VALUES ('ORD-ONL-99201', 'Aditya Roy', '+91 98201 54890', 's1', 'new_order', 'paid', 'Online Netbanking', 3400000, '[{"name": "Bosch Heavy Duty Drill Machine", "price": "\u20b934,000"}]'::jsonb, 'SR-IN-889021', 'Pending Rider Allocation', '{"id": "ORD-ONL-99201", "customer_name": "Aditya Roy", "customer_phone": "+91 98201 54890", "store_id": "s1", "status": "new_order", "payment_status": "paid", "payment_method": "Online Netbanking", "total_paise": 3400000, "shiprocket_tracking": "SR-IN-889021", "shiprocket_rider": "Pending Rider Allocation", "items": [{"name": "Bosch Heavy Duty Drill Machine", "price": "\u20b934,000"}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, items = EXCLUDED.items;
