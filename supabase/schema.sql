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
