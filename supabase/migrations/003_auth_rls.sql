-- ============================================================
-- KAKMELL RESOURCES — Auth, user_profiles & Role-Based RLS
-- ============================================================
-- Run this after 001_initial.sql and 002_packages.sql.
-- Assumes Supabase Auth is enabled.
--
-- IMPORTANT: Disable email confirmation in Supabase dashboard
-- (Authentication → Email → Disable "Confirm email") for
-- internal staff accounts to work without email verification.
-- ============================================================

-- ============================================================
-- TABLE: user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  role        text NOT NULL DEFAULT 'pending'
              CHECK (role IN ('pending', 'admin', 'kitchen', 'hall_staff', 'hall_owner')),
  approved_at timestamptz,
  approved_by uuid REFERENCES user_profiles(id),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER helper: get own role without RLS recursion
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────────
-- user_profiles RLS policies
-- ──────────────────────────────────────────────────────────────

-- Users can always read their own profile (needed for role lookup at login)
-- Admins can read all profiles (needed for user management page)
CREATE POLICY "up_select" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_my_role() = 'admin');

-- Only own insert (registration creates own profile)
CREATE POLICY "up_insert_own" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Only admin can update any profile (role assignment, approval)
CREATE POLICY "up_update_admin" ON user_profiles
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ============================================================
-- UPDATE RLS: bookings (replace generic policy with role-aware)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access" ON bookings;

-- Admin: full CRUD
CREATE POLICY "bookings_admin" ON bookings
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Kitchen: read-only (to check menus/events for their shift)
CREATE POLICY "bookings_kitchen_select" ON bookings
  FOR SELECT TO authenticated
  USING (get_my_role() = 'kitchen');

-- Hall staff/owner: read-only (row visible, but app only fetches safe columns)
CREATE POLICY "bookings_hall_select" ON bookings
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('hall_staff', 'hall_owner'));

-- ============================================================
-- UPDATE RLS: ingredient_ratios (admin + kitchen only)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access" ON ingredient_ratios;

-- Admin: full CRUD
CREATE POLICY "ingredient_admin" ON ingredient_ratios
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Kitchen: read-only
CREATE POLICY "ingredient_kitchen_select" ON ingredient_ratios
  FOR SELECT TO authenticated
  USING (get_my_role() = 'kitchen');

-- Hall roles have NO access (policy omitted = no access)

-- ============================================================
-- UPDATE RLS: invoices (admin only)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access" ON invoices;

CREATE POLICY "invoices_admin_only" ON invoices
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ============================================================
-- UPDATE RLS: menu_options
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access" ON menu_options;

CREATE POLICY "menu_admin" ON menu_options
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Kitchen + hall roles: read-only (to show menu names in views)
CREATE POLICY "menu_read" ON menu_options
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('kitchen', 'hall_staff', 'hall_owner'));

-- ============================================================
-- UPDATE RLS: halls (admin full, others read-only)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access" ON halls;

CREATE POLICY "halls_admin" ON halls
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "halls_read" ON halls
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('kitchen', 'hall_staff', 'hall_owner'));

-- ============================================================
-- UPDATE RLS: packages (admin full, others read-only)
-- ============================================================
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_admin" ON packages
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "packages_read" ON packages
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('kitchen', 'hall_staff', 'hall_owner'));
