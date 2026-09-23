-- =========================================================================
-- WUSHU SANDA TOURNAMENT ARENA - SUPABASE POSTGRESQL SCHEMA
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =========================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organizer TEXT,
  venue TEXT,
  city TEXT,
  state TEXT,
  start_date TEXT,
  end_date TEXT,
  tournament_reference_date TEXT,
  status TEXT DEFAULT 'upcoming',
  is_live BOOLEAN DEFAULT true,
  competition_type TEXT DEFAULT 'Sanda',
  round_duration_sec INTEGER DEFAULT 120,
  rounds_count INTEGER DEFAULT 3,
  rest_duration_sec INTEGER DEFAULT 60,
  rings JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Age Categories Table
CREATE TABLE IF NOT EXISTS public.age_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Weight Categories Table
CREATE TABLE IF NOT EXISTS public.weight_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_weight_kg NUMERIC NOT NULL,
  max_weight_kg NUMERIC NOT NULL,
  gender TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Players / Athletes Registry Table
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  registration_number TEXT,
  name TEXT NOT NULL,
  father_name TEXT,
  dob TEXT,
  gender TEXT NOT NULL,
  weight_kg NUMERIC,
  club_school TEXT,
  district TEXT,
  state_region TEXT,
  contact_number TEXT,
  aadhar_number TEXT,
  status TEXT DEFAULT 'weighed_in',
  created_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Category Divisions Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age_category_id TEXT,
  weight_category_id TEXT,
  district_filter TEXT,
  club_filter TEXT,
  is_locked BOOLEAN DEFAULT false,
  confirmed_at TEXT,
  confirmed_by TEXT,
  eligible_player_ids JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Knockout Brackets Table
CREATE TABLE IF NOT EXISTS public.brackets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  event_id TEXT,
  rounds JSONB DEFAULT '[]'::jsonb,
  generated_at TEXT,
  is_locked BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Tournament Officials & Staff Accounts Table
CREATE TABLE IF NOT EXISTS public.tournament_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  ring_assignment TEXT,
  assigned_ring TEXT,
  password TEXT,
  last_active TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_role TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  entity_type TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.events;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.age_categories;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.weight_categories;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.players;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.categories;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.brackets;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.tournament_users;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.audit_logs;

-- Create open policies for seamless tournament client sync
CREATE POLICY "Allow full access for all operations" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.age_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.weight_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.brackets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.tournament_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 11. Enable Supabase Realtime for Live Scoring & Instant Synchronization
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.brackets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
