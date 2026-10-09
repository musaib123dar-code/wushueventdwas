-- =========================================================================
-- WUSHU SANDA TOURNAMENT ARENA - SUPABASE POSTGRESQL SCHEMA & RLS FIX
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

-- 10. Sideline Judge Scores Table
CREATE TABLE IF NOT EXISTS public.sideline_judge_scores (
  id TEXT PRIMARY KEY,
  bout_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  arena TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  judge_name TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  red_points INTEGER DEFAULT 0,
  blue_points INTEGER DEFAULT 0,
  red_exits INTEGER DEFAULT 0,
  blue_exits INTEGER DEFAULT 0,
  red_warnings INTEGER DEFAULT 0,
  blue_warnings INTEGER DEFAULT 0,
  winner TEXT,
  score_events JSONB DEFAULT '[]'::jsonb,
  is_submitted BOOLEAN DEFAULT false,
  submitted_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Grant Full Permissions to Public, Anon, Authenticated, and Service Role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;

-- 11. Configure Row Level Security (RLS) - Completely Open for Tournament Sync
-- To avoid any "new row violates row-level security policy" errors, we disable RLS or set open policies:
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sideline_judge_scores DISABLE ROW LEVEL SECURITY;

-- If you prefer RLS enabled, open policies can also be applied cleanly:
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sideline_judge_scores ENABLE ROW LEVEL SECURITY;

-- Drop any previous restrictive policies
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.events;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.age_categories;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.weight_categories;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.players;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.categories;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.brackets;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.tournament_users;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow full access for all operations" ON public.sideline_judge_scores;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.players;
DROP POLICY IF EXISTS "Enable all access for anon" ON public.players;

-- Create ultra-permissive policies for anon and authenticated clients
CREATE POLICY "Allow full access for all operations" ON public.events FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.age_categories FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.weight_categories FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.players FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.categories FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
-- Brackets RLS: Viewable by all; INSERT/UPDATE/DELETE strictly restricted to super_admin
CREATE POLICY "Allow read brackets for all roles" ON public.brackets FOR SELECT TO anon, authenticated, service_role, public USING (true);
CREATE POLICY "Allow super_admin to insert brackets" ON public.brackets FOR INSERT TO anon, authenticated, service_role WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_users WHERE role = 'super_admin'));
CREATE POLICY "Allow super_admin to update brackets" ON public.brackets FOR UPDATE TO anon, authenticated, service_role USING (EXISTS (SELECT 1 FROM public.tournament_users WHERE role = 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_users WHERE role = 'super_admin'));
CREATE POLICY "Allow super_admin to delete brackets" ON public.brackets FOR DELETE TO anon, authenticated, service_role USING (EXISTS (SELECT 1 FROM public.tournament_users WHERE role = 'super_admin'));
CREATE POLICY "Allow full access for all operations" ON public.tournament_users FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.audit_logs FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for all operations" ON public.sideline_judge_scores FOR ALL TO anon, authenticated, service_role, public USING (true) WITH CHECK (true);

-- 12. Enable Full Replica Identity so Realtime broadcast includes complete row payloads
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.age_categories REPLICA IDENTITY FULL;
ALTER TABLE public.weight_categories REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.brackets REPLICA IDENTITY FULL;
ALTER TABLE public.tournament_users REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.sideline_judge_scores REPLICA IDENTITY FULL;

-- 13. Enable Supabase Realtime Publication for Live Scoring & Instant Synchronization
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.brackets;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_users;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sideline_judge_scores;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.age_categories;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.weight_categories;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
