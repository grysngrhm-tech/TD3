-- TD3 Authentication & Authorization Schema
-- Migration: 004_auth.sql
-- Description: Passwordless auth with stackable permissions and RLS

-- ============================================================================
-- PART 1: AUTH TABLES
-- ============================================================================

-- Profiles table - Extended user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  first_login_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Permissions catalog - Defines available permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the permission catalog
INSERT INTO permissions (code, name, description) VALUES
  ('processor', 'Loan Processor', 'Can perform origination and draw processing work'),
  ('fund_draws', 'Fund Draws', 'Can record draws as FUNDED and set funding confirmation date'),
  ('approve_payoffs', 'Approve Payoffs', 'Can approve payoffs before sending to title company'),
  ('users.manage', 'Manage Users', 'Admin panel access for user management')
ON CONFLICT (code) DO NOTHING;

-- User permissions junction table - Stackable permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_code)
);

-- Indexes for permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_code ON user_permissions(permission_code);

-- Allowlist table - Pre-authorized emails
CREATE TABLE IF NOT EXISTS public.allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Index for email lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_allowlist_email ON allowlist(lower(email));

-- ============================================================================
-- PART 2: HELPER FUNCTIONS
-- ============================================================================

-- Check if a user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  check_user_id UUID,
  required_permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = check_user_id
    AND permission_code = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if an email is in the allowlist
CREATE OR REPLACE FUNCTION public.is_allowlisted(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM allowlist
    WHERE lower(email) = lower(check_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all permissions for a user as an array
CREATE OR REPLACE FUNCTION public.get_user_permissions(check_user_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT permission_code FROM user_permissions
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PART 3: TRIGGERS
-- ============================================================================

-- Auto-create profile when user confirms email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at on profile changes
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_timestamp();

-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Auth tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;

-- Core business tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE wire_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Invoice tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_match_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_match_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_category_associations ENABLE ROW LEVEL SECURITY;

-- Reference tables
ALTER TABLE nahb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE nahb_subcategories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: RLS POLICIES - AUTH TABLES
-- ============================================================================

-- Profiles: Users can read their own; admins can read all
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- Profiles: Users can update their own
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles: Admins can update any
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- Permissions catalog: All authenticated can read
CREATE POLICY "permissions_select" ON permissions
  FOR SELECT TO authenticated
  USING (true);

-- User permissions: Users can see their own
CREATE POLICY "user_permissions_select_own" ON user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- User permissions: Admins can see all
CREATE POLICY "user_permissions_select_admin" ON user_permissions
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- User permissions: Only admins can insert/update/delete
CREATE POLICY "user_permissions_insert_admin" ON user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "user_permissions_update_admin" ON user_permissions
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "user_permissions_delete_admin" ON user_permissions
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- Allowlist: Only admins can access
CREATE POLICY "allowlist_select_admin" ON allowlist
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "allowlist_insert_admin" ON allowlist
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "allowlist_update_admin" ON allowlist
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "allowlist_delete_admin" ON allowlist
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- ============================================================================
-- PART 6: RLS POLICIES - BUSINESS TABLES (SELECT)
-- All authenticated users can read portfolio data
-- ============================================================================

CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "budgets_select" ON budgets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "draw_requests_select" ON draw_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "draw_request_lines_select" ON draw_request_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wire_batches_select" ON wire_batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "builders_select" ON builders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lenders_select" ON lenders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_events_select" ON audit_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invoice_match_decisions_select" ON invoice_match_decisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invoice_match_training_select" ON invoice_match_training
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "vendor_category_associations_select" ON vendor_category_associations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "nahb_categories_select" ON nahb_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "nahb_subcategories_select" ON nahb_subcategories
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- PART 7: RLS POLICIES - BUSINESS TABLES (INSERT/UPDATE/DELETE)
-- Requires 'processor' permission for writes
-- ============================================================================

-- Projects
CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

CREATE POLICY "projects_delete" ON projects
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Budgets
CREATE POLICY "budgets_insert" ON budgets
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "budgets_update" ON budgets
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

CREATE POLICY "budgets_delete" ON budgets
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Draw requests (with funding gate)
CREATE POLICY "draw_requests_insert" ON draw_requests
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

-- UPDATE: Transitioning to 'funded' requires fund_draws permission
CREATE POLICY "draw_requests_update" ON draw_requests
  FOR UPDATE TO authenticated
  USING (
    CASE
      -- If status is being set to 'funded', require fund_draws permission
      WHEN status = 'funded' THEN has_permission(auth.uid(), 'fund_draws')
      -- Otherwise, processor permission is sufficient
      ELSE has_permission(auth.uid(), 'processor')
    END
  );

CREATE POLICY "draw_requests_delete" ON draw_requests
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Draw request lines
CREATE POLICY "draw_request_lines_insert" ON draw_request_lines
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "draw_request_lines_update" ON draw_request_lines
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

CREATE POLICY "draw_request_lines_delete" ON draw_request_lines
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Wire batches (with funding gate)
CREATE POLICY "wire_batches_insert" ON wire_batches
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

-- UPDATE: Transitioning to 'funded' requires fund_draws permission
CREATE POLICY "wire_batches_update" ON wire_batches
  FOR UPDATE TO authenticated
  USING (
    CASE
      -- If status is being set to 'funded', require fund_draws permission
      WHEN status = 'funded' THEN has_permission(auth.uid(), 'fund_draws')
      -- Otherwise, processor permission is sufficient
      ELSE has_permission(auth.uid(), 'processor')
    END
  );

CREATE POLICY "wire_batches_delete" ON wire_batches
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Builders
CREATE POLICY "builders_insert" ON builders
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "builders_update" ON builders
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

CREATE POLICY "builders_delete" ON builders
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Lenders
CREATE POLICY "lenders_insert" ON lenders
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "lenders_update" ON lenders
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

CREATE POLICY "lenders_delete" ON lenders
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Audit events (insert only - processors can log events)
CREATE POLICY "audit_events_insert" ON audit_events
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

-- Invoices
CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Invoice match decisions
CREATE POLICY "invoice_match_decisions_insert" ON invoice_match_decisions
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "invoice_match_decisions_update" ON invoice_match_decisions
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Invoice match training
CREATE POLICY "invoice_match_training_insert" ON invoice_match_training
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "invoice_match_training_update" ON invoice_match_training
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Vendor category associations
CREATE POLICY "vendor_category_associations_insert" ON vendor_category_associations
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

CREATE POLICY "vendor_category_associations_update" ON vendor_category_associations
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'processor'));

-- Reference tables: Read-only (no write policies needed for normal users)
-- NAHB categories and subcategories are managed by admins via service role

-- ============================================================================
-- PART 8: SERVICE ROLE BYPASS
-- API routes using service role key bypass RLS for system operations
-- This is important for n8n callbacks and other automated processes
-- ============================================================================

-- Note: Service role key automatically bypasses RLS.
-- No additional configuration needed.

-- ============================================================================
-- PART 9: INITIAL ADMIN BOOTSTRAP
-- Run this section manually after migration to set up first admin
-- ============================================================================

-- Uncomment and run after migration:
-- INSERT INTO allowlist (email, notes)
-- VALUES ('your-admin-email@example.com', 'Initial admin')
-- ON CONFLICT (email) DO NOTHING;

-- After first login, grant all permissions:
-- INSERT INTO user_permissions (user_id, permission_code)
-- SELECT u.id, p.code
-- FROM auth.users u
-- CROSS JOIN permissions p
-- WHERE u.email = 'your-admin-email@example.com'
-- ON CONFLICT (user_id, permission_code) DO NOTHING;
