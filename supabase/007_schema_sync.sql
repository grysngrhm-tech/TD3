-- TD3 Schema Sync Migration
-- Migration: 007_schema_sync.sql
-- Description: Documents all schema changes applied directly to the live database
--   but not captured in migration files 001-006 or supabase/migrations/*.
--   This is a catch-up migration to bring the migration trail in sync with production.
--
-- All statements use IF NOT EXISTS / CREATE OR REPLACE / DO blocks for idempotency.
-- Safe to run against both a fresh database (after 001-006) and the current live DB.
--
-- Generated: 2026-02-05

-- ============================================================================
-- SECTION 1: NEW TABLES (no CREATE TABLE in any migration file)
-- ============================================================================

-- 1a. BUILDERS — contractor/builder companies with banking info
-- Referenced in 004_auth.sql RLS policies but never formally created.
CREATE TABLE IF NOT EXISTS builders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    borrower_name TEXT,
    email TEXT,
    phone TEXT,
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    bank_name TEXT,
    bank_routing_number TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1b. LENDERS — lending institutions that fund loans
-- Referenced in 004_auth.sql RLS policies but never formally created.
CREATE TABLE IF NOT EXISTS lenders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1c. WIRE BATCHES — groups multiple draws per builder for single wire transfers
-- Referenced in 004_auth.sql RLS policies but never formally created.
CREATE TABLE IF NOT EXISTS wire_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    builder_id UUID NOT NULL REFERENCES builders(id),
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'cancelled')),
    submitted_at TIMESTAMPTZ DEFAULT now(),
    submitted_by TEXT,
    funded_at TIMESTAMPTZ,
    funded_by TEXT,
    wire_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1d. NAHB CATEGORIES — top-level NAHB cost code categories (16 categories)
-- Referenced in 004_auth.sql RLS policies but never formally created.
-- Replaces the flat nahb_cost_codes table with a normalized hierarchy.
CREATE TABLE IF NOT EXISTS nahb_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1e. NAHB SUBCATEGORIES — subcategories within each NAHB category (118 subcategories)
-- References nahb_categories via category_id FK.
CREATE TABLE IF NOT EXISTS nahb_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES nahb_categories(id),
    code VARCHAR(4) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- SECTION 2: COLUMN ADDITIONS ON EXISTING TABLES
-- ============================================================================

-- 2a. PROJECTS — many columns added for full loan lifecycle
-- Migration 001_schema.sql had: id, name, address, loan_amount, status,
--   project_code, builder_name, borrower_name, interest_rate_annual,
--   loan_start_date, loan_term_months, origination_fee_pct, maturity_date,
--   created_at, updated_at.
--
-- Live DB removed builder_name (replaced by builder_id FK) and added:

-- Subdivision / lot identification
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdivision_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdivision_abbrev TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lot_number TEXT;

-- Lifecycle stage (replaces simple 'status' for loan tracking)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;

-- Property details
ALTER TABLE projects ADD COLUMN IF NOT EXISTS square_footage INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sales_price NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS appraised_value NUMERIC;

-- Payoff tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payoff_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payoff_amount NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Foreign keys to builders and lenders (replaces builder_name text column)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS builder_id UUID REFERENCES builders(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lender_id UUID REFERENCES lenders(id);

-- Loan document recording
ALTER TABLE projects ADD COLUMN IF NOT EXISTS loan_docs_recorded BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS loan_docs_recorded_at TIMESTAMPTZ;

-- Payoff approval workflow
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payoff_approved BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payoff_approved_at TIMESTAMPTZ;

-- Lifecycle stage CHECK constraint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_lifecycle_stage'
        AND conrelid = 'projects'::regclass
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT valid_lifecycle_stage
            CHECK (lifecycle_stage IN ('pending', 'active', 'historic'));
    END IF;
END $$;


-- 2b. DRAW REQUESTS — status workflow and wire batch link
-- Migration 001_schema.sql had: status CHECK (draft, submitted, approved, rejected, paid)
-- Live DB uses: (draft, processing, review, staged, pending_wire, funded, rejected)

-- New columns
ALTER TABLE draw_requests ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;
ALTER TABLE draw_requests ADD COLUMN IF NOT EXISTS wire_batch_id UUID REFERENCES wire_batches(id);

-- Update status CHECK constraint to match production workflow
-- Drop old constraint and add new one (idempotent via DO block)
DO $$ BEGIN
    -- Only modify if the old constraint still allows 'submitted'
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'draw_requests_status_check'
        AND conrelid = 'draw_requests'::regclass
        AND pg_get_constraintdef(oid) LIKE '%submitted%'
    ) THEN
        ALTER TABLE draw_requests DROP CONSTRAINT draw_requests_status_check;
        ALTER TABLE draw_requests ADD CONSTRAINT draw_requests_status_check
            CHECK (status IN ('draft', 'processing', 'review', 'staged', 'pending_wire', 'funded', 'rejected'));
    END IF;
END $$;


-- 2c. DRAW REQUEST LINES — FK behavior change
-- Migration 001_schema.sql had: budget_id REFERENCES budgets(id) ON DELETE CASCADE
-- Live DB uses: ON DELETE SET NULL (safer — don't delete lines when budget is removed)
-- Note: This cannot be changed idempotently without checking the current constraint.
-- Documenting for awareness. The live DB already has the correct behavior.
DO $$ BEGIN
    -- Check if the FK still has CASCADE and update to SET NULL
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'draw_request_lines_budget_id_fkey'
        AND conrelid = 'draw_request_lines'::regclass
        AND confdeltype = 'c'  -- 'c' = CASCADE
    ) THEN
        ALTER TABLE draw_request_lines DROP CONSTRAINT draw_request_lines_budget_id_fkey;
        ALTER TABLE draw_request_lines ADD CONSTRAINT draw_request_lines_budget_id_fkey
            FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL;
    END IF;
END $$;


-- 2d. BUDGETS — subcategory FK
-- Links budget lines to the normalized nahb_subcategories table
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES nahb_subcategories(id);


-- ============================================================================
-- SECTION 3: RLS ENABLEMENT + POLICIES NOT IN MIGRATION FILES
-- ============================================================================

-- 3a. Tables with RLS enabled in live DB but not in any migration
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nahb_cost_codes ENABLE ROW LEVEL SECURITY;

-- 3b. Policies for APPROVALS (not in 004_auth.sql)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approvals' AND policyname = 'approvals_select') THEN
        CREATE POLICY "approvals_select" ON approvals
            FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approvals' AND policyname = 'approvals_insert') THEN
        CREATE POLICY "approvals_insert" ON approvals
            FOR INSERT TO authenticated
            WITH CHECK (has_permission(auth.uid(), 'processor'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approvals' AND policyname = 'approvals_update') THEN
        CREATE POLICY "approvals_update" ON approvals
            FOR UPDATE TO authenticated
            USING (has_permission(auth.uid(), 'processor'));
    END IF;
END $$;

-- 3c. Policies for DOCUMENTS (not in 004_auth.sql)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_select') THEN
        CREATE POLICY "documents_select" ON documents
            FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_insert') THEN
        CREATE POLICY "documents_insert" ON documents
            FOR INSERT TO authenticated
            WITH CHECK (has_permission(auth.uid(), 'processor'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_update') THEN
        CREATE POLICY "documents_update" ON documents
            FOR UPDATE TO authenticated
            USING (has_permission(auth.uid(), 'processor'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_delete') THEN
        CREATE POLICY "documents_delete" ON documents
            FOR DELETE TO authenticated
            USING (has_permission(auth.uid(), 'processor'));
    END IF;
END $$;

-- 3d. Policy for NAHB_COST_CODES (not in 004_auth.sql)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nahb_cost_codes' AND policyname = 'nahb_cost_codes_select') THEN
        CREATE POLICY "nahb_cost_codes_select" ON nahb_cost_codes
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;


-- ============================================================================
-- SECTION 4: FUNCTIONS NOT IN MIGRATION FILES
-- Already applied via supabase/migrations/ but documenting here for completeness.
-- ============================================================================

-- 4a. enforce_funding_permission() — BEFORE UPDATE trigger function
-- Prevents setting status to 'funded' without fund_draws permission.
-- Applied via: supabase/migrations/fix_rls_funding_gate.sql
CREATE OR REPLACE FUNCTION enforce_funding_permission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'funded' AND (OLD.status IS DISTINCT FROM 'funded') THEN
        IF auth.uid() IS NOT NULL AND NOT has_permission(auth.uid(), 'fund_draws') THEN
            RAISE EXCEPTION 'Permission denied: fund_draws required to set status to funded'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4b. increment_budget_spent() — Atomic budget increment RPC
-- Eliminates read-then-write race condition in updateBudgetSpendForDraw().
-- Applied via: supabase/migrations/add_increment_budget_spent.sql
CREATE OR REPLACE FUNCTION increment_budget_spent(
    p_budget_id UUID,
    p_amount NUMERIC
)
RETURNS TABLE(new_spent_amount NUMERIC, current_amount NUMERIC) AS $$
BEGIN
    RETURN QUERY
    UPDATE budgets
    SET spent_amount = COALESCE(spent_amount, 0) + p_amount
    WHERE id = p_budget_id
    RETURNING spent_amount, budgets.current_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- SECTION 5: TRIGGERS NOT IN MIGRATION FILES
-- Already applied via supabase/migrations/ but documenting here for completeness.
-- ============================================================================

-- 5a. Funding gate triggers — prevent unauthorized funding transitions
-- Applied via: supabase/migrations/fix_rls_funding_gate.sql
DROP TRIGGER IF EXISTS enforce_funding_permission_draw_requests ON draw_requests;
CREATE TRIGGER enforce_funding_permission_draw_requests
    BEFORE UPDATE ON draw_requests
    FOR EACH ROW EXECUTE FUNCTION enforce_funding_permission();

DROP TRIGGER IF EXISTS enforce_funding_permission_wire_batches ON wire_batches;
CREATE TRIGGER enforce_funding_permission_wire_batches
    BEFORE UPDATE ON wire_batches
    FOR EACH ROW EXECUTE FUNCTION enforce_funding_permission();


-- ============================================================================
-- SECTION 6: NOTED DRIFT (documentation only — not actionable SQL)
-- ============================================================================

-- 6a. update_budget_spent() function
-- Migration 001_schema.sql defines this using SUM(drl.amount_requested).
-- Live DB uses SUM(drl.amount_approved) instead.
-- This is intentional: amount_approved is the correct field for budget tracking
-- since processors may approve less than requested.
-- The migration file (001_schema.sql) should be updated to match live.

-- 6b. projects.builder_name column
-- Migration 001_schema.sql defines builder_name TEXT on projects.
-- Live DB does NOT have this column — it was replaced by builder_id UUID FK.
-- The migration file should be updated to remove builder_name and add builder_id.

-- 6c. nahb_cost_codes vs nahb_categories/nahb_subcategories
-- Migration 001_schema.sql defines a flat nahb_cost_codes table.
-- Live DB has BOTH: the old nahb_cost_codes AND the new normalized pair
-- (nahb_categories + nahb_subcategories). The app uses the normalized tables.
-- nahb_cost_codes is kept for backward compatibility but is not actively used.


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE builders IS 'Builder/contractor companies with contact and banking info for wire transfers';
COMMENT ON TABLE lenders IS 'Lending institutions that fund construction loans';
COMMENT ON TABLE wire_batches IS 'Groups multiple draws per builder into single wire transfers';
COMMENT ON TABLE nahb_categories IS 'Top-level NAHB cost code categories (16 categories)';
COMMENT ON TABLE nahb_subcategories IS 'NAHB subcategories within each category (118 subcategories)';

COMMENT ON COLUMN projects.lifecycle_stage IS 'Loan lifecycle: pending (origination), active (funded), historic (paid off)';
COMMENT ON COLUMN projects.builder_id IS 'FK to builders table — replaces the old builder_name text column';
COMMENT ON COLUMN projects.lender_id IS 'FK to lenders table — tracks which lender funds this loan';
COMMENT ON COLUMN draw_requests.wire_batch_id IS 'FK to wire_batches — links this draw to its wire transfer batch';
COMMENT ON COLUMN draw_requests.funded_at IS 'Timestamp when this draw was funded (status set to funded)';
COMMENT ON COLUMN budgets.subcategory_id IS 'FK to nahb_subcategories — normalized NAHB classification';
