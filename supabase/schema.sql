-- MallMaze Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/noczhsyfkfctjpbgnlcp/sql

-- 1. Profiles Table (Application User Data linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Case-insensitive uniqueness index for usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx 
  ON public.profiles (lower(username));

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to basic profiles (username, full name, avatar)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_username TEXT;
  raw_full_name TEXT;
  clean_username TEXT;
BEGIN
  raw_username := coalesce(new.raw_user_meta_data->>'username', '');
  raw_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');

  IF raw_username = '' THEN
    clean_username := lower(split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4);
  ELSE
    clean_username := lower(raw_username);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, created_at, updated_at)
  VALUES (new.id, clean_username, raw_full_name, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN others THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Timestamp auto-update trigger on profile edits
CREATE OR REPLACE FUNCTION public.handle_profile_updated()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();

-- ====================================================================
-- 5. Stores Table (Verified Local Stores, Geolocation & QR System)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'Local Store',
  address TEXT,
  address_line TEXT,
  area TEXT,
  city TEXT DEFAULT 'Hyderabad',
  state TEXT DEFAULT 'Telangana',
  country TEXT DEFAULT 'India',
  postal_code TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  phone TEXT,
  email TEXT,
  hours TEXT DEFAULT '10:00 AM - 9:00 PM',
  opening_time TEXT DEFAULT '10:00 AM',
  closing_time TEXT DEFAULT '10:00 PM',
  banner_url TEXT DEFAULT 'assets/media/hero-mall.jpg',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  qr_public_token TEXT UNIQUE,
  qr_version INTEGER NOT NULL DEFAULT 1,
  qr_enabled BOOLEAN NOT NULL DEFAULT true,
  qr_created_at TIMESTAMPTZ DEFAULT now(),
  qr_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store indexes for high-performance nearby search & QR lookup
CREATE INDEX IF NOT EXISTS stores_status_idx ON public.stores (status, verification_status);
CREATE INDEX IF NOT EXISTS stores_coords_idx ON public.stores (latitude, longitude);
CREATE INDEX IF NOT EXISTS stores_city_area_idx ON public.stores (city, area);
CREATE INDEX IF NOT EXISTS stores_qr_token_idx ON public.stores (qr_public_token);
CREATE INDEX IF NOT EXISTS stores_slug_idx ON public.stores (slug);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active verified stores
DROP POLICY IF EXISTS "Public can view active verified stores" ON public.stores;
CREATE POLICY "Public can view active verified stores"
  ON public.stores FOR SELECT
  USING (
    (status = 'active' AND verification_status = 'verified')
    OR (auth.uid() IS NOT NULL AND owner_user_id = auth.uid())
  );

-- Policy: Store owners can update their own store
DROP POLICY IF EXISTS "Store owners can update their own store" ON public.stores;
CREATE POLICY "Store owners can update their own store"
  ON public.stores FOR UPDATE
  USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

-- Policy: Authenticated users can register a store
DROP POLICY IF EXISTS "Authenticated users can create a store" ON public.stores;
CREATE POLICY "Authenticated users can create a store"
  ON public.stores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

-- ====================================================================
-- 6. Store Shopping Sessions (Temporary Fast Shopping Mode)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.store_shopping_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shopping_sessions_store_idx ON public.store_shopping_sessions(store_id, status);
CREATE INDEX IF NOT EXISTS shopping_sessions_user_idx ON public.store_shopping_sessions(user_id, status);

-- Enable RLS on shopping sessions
ALTER TABLE public.store_shopping_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own shopping sessions
DROP POLICY IF EXISTS "Users can view own shopping sessions" ON public.store_shopping_sessions;
CREATE POLICY "Users can view own shopping sessions"
  ON public.store_shopping_sessions FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_shopping_sessions.store_id
      AND stores.owner_user_id = auth.uid()
    )
  );

-- Policy: Users can create their own shopping sessions
DROP POLICY IF EXISTS "Users can insert own shopping sessions" ON public.store_shopping_sessions;
CREATE POLICY "Users can insert own shopping sessions"
  ON public.store_shopping_sessions FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Policy: Users can update/end their own shopping sessions
DROP POLICY IF EXISTS "Users can update own shopping sessions" ON public.store_shopping_sessions;
CREATE POLICY "Users can update own shopping sessions"
  ON public.store_shopping_sessions FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id);
