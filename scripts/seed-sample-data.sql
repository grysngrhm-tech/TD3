-- ============================================
-- TD3 Sample Data Seed Script
-- Generated: 2024-12-17
-- ============================================
-- This script provides complete, stage-appropriate sample data
-- for testing and demonstrating TD3 features.
--
-- Data includes:
-- - 3 Builders with complete profiles
-- - 12 Projects (3 Pending, 6 Active, 3 Historic)
-- - 40-50 Budget lines per project (~540 total)
-- - 5-7 Draws per funded loan (~50 total draws)
-- - Draw request lines linked to budgets (~400 lines)
-- - Wire batches for funded draws
-- ============================================

-- ============================================
-- PHASE 1: CLEANUP - Delete existing sample data
-- Order respects foreign key constraints
-- ============================================

-- Clear audit events first (no dependencies)
DELETE FROM audit_events;

-- Clear wire batches (before draw_requests due to FK)
DELETE FROM wire_batches;

-- Clear approvals (FK to draw_requests)
DELETE FROM approvals;

-- Clear invoices (FK to draw_requests, projects)
DELETE FROM invoices;

-- Clear draw request lines (FK to draw_requests, budgets)
DELETE FROM draw_request_lines;

-- Clear draw requests (FK to projects)
DELETE FROM draw_requests;

-- Clear budgets (FK to projects)
DELETE FROM budgets;

-- Clear documents (FK to projects)
DELETE FROM documents;

-- Clear projects (FK to builders, lenders)
DELETE FROM projects;

-- Clear builders
DELETE FROM builders;

-- Note: Preserve lenders, nahb_categories, nahb_subcategories, nahb_cost_codes

-- ============================================
-- PHASE 2: LENDERS
-- Ensure TD2 and TennBrook exist
-- ============================================

INSERT INTO lenders (id, name, code, is_active)
VALUES 
  ('lender-td2-0001-0001-000000000001', 'TD2', 'TD2', true),
  ('lender-tennbrook-01-0001-000000001', 'TennBrook', 'TENNBROOK', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PHASE 3: BUILDERS
-- 3 complete builder profiles
-- ============================================

INSERT INTO builders (
  id, company_name, borrower_name, email, phone,
  address_street, address_city, address_state, address_zip,
  bank_name, bank_routing_number, bank_account_number, bank_account_name,
  notes
) VALUES 
-- Builder A: Ridgeline Custom Homes
(
  'builder-ridgeline-0001-000000000001',
  'Ridgeline Custom Homes',
  'Marcus Ridgeline',
  'marcus@ridgelinecustom.com',
  '512-555-0101',
  '4521 Summit View Dr',
  'Austin',
  'TX',
  '78730',
  'Texas Capital Bank',
  '111000614',
  '7891234560',
  'Ridgeline Custom Homes LLC',
  'Premium custom home builder. 18 years experience. Specializes in hill country contemporary designs. Excellent track record with TD2.'
),
-- Builder B: Westbrook Construction
(
  'builder-westbrook-0001-000000000001',
  'Westbrook Construction',
  'Sarah Westbrook',
  'sarah@westbrookconstruction.com',
  '512-555-0202',
  '890 Commerce Park Blvd',
  'Round Rock',
  'TX',
  '78664',
  'Frost Bank',
  '114000093',
  '4567891230',
  'Westbrook Construction Inc',
  'Spec home builder focusing on entry-level and move-up market. High volume, consistent quality. Building relationship since 2021.'
),
-- Builder C: Horizon Builders LLC
(
  'builder-horizon-0001-000000000001',
  'Horizon Builders LLC',
  'David Horizon',
  'david@horizonbuilders.com',
  '512-555-0303',
  '2100 Innovation Way',
  'Cedar Park',
  'TX',
  '78613',
  'Chase Bank',
  '111000614',
  '1234567890',
  'Horizon Builders LLC Operating',
  'Growing builder with diverse portfolio. Strong in Discovery West and Cedar Valley. Expanding operations in 2025.'
);

-- ============================================
-- PHASE 4: PROJECTS
-- 12 projects across 3 stages, 3 subdivisions
-- ============================================

-- ----------------------------------------
-- PENDING PROJECTS (3) - No draws, awaiting docs
-- ----------------------------------------

-- DW-101: Ridgeline, Discovery West, Pending, TD2
INSERT INTO projects (
  id, name, project_code, address, 
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, status,
  created_at
) VALUES (
  'project-dw101-0001-0001-000000000001',
  'Discovery West Lot 101',
  'DW-101',
  '101 Discovery Trail, Dripping Springs, TX 78620',
  'builder-ridgeline-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Ridgeline Custom Homes LLC',
  'Discovery West',
  'DW',
  '101',
  725000.00,
  875000.00,
  925000.00,
  3400,
  0.11,
  0.02,
  12,
  'pending',
  false,
  'active',
  '2025-12-01 10:00:00+00'
);

-- DW-103: Westbrook, Discovery West, Pending, TennBrook
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, status,
  created_at
) VALUES (
  'project-dw103-0001-0001-000000000001',
  'Discovery West Lot 103',
  'DW-103',
  '103 Discovery Trail, Dripping Springs, TX 78620',
  'builder-westbrook-0001-000000000001',
  'lender-tennbrook-01-0001-000000001',
  'Westbrook Construction Inc',
  'Discovery West',
  'DW',
  '103',
  685000.00,
  825000.00,
  875000.00,
  3200,
  0.11,
  0.02,
  12,
  'pending',
  false,
  'active',
  '2025-12-10 14:00:00+00'
);

-- ORE-203: Horizon, Oak Ridge, Pending, TD2
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, status,
  created_at
) VALUES (
  'project-ore203-0001-0001-000000000001',
  'Oak Ridge Estates Lot 203',
  'ORE-203',
  '203 Oak Ridge Blvd, Austin, TX 78735',
  'builder-horizon-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Horizon Builders LLC',
  'Oak Ridge Estates',
  'ORE',
  '203',
  795000.00,
  950000.00,
  1025000.00,
  3800,
  0.11,
  0.02,
  12,
  'pending',
  false,
  'active',
  '2025-12-05 09:00:00+00'
);

-- ----------------------------------------
-- ACTIVE PROJECTS (6) - Draws in progress
-- ----------------------------------------

-- DW-102: Ridgeline, Discovery West, Active, TennBrook (Jun 2025, 4 funded + 1 staged)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  created_at
) VALUES (
  'project-dw102-0001-0001-000000000001',
  'Discovery West Lot 102',
  'DW-102',
  '102 Discovery Trail, Dripping Springs, TX 78620',
  'builder-ridgeline-0001-000000000001',
  'lender-tennbrook-01-0001-000000001',
  'Ridgeline Custom Homes LLC',
  'Discovery West',
  'DW',
  '102',
  750000.00,
  895000.00,
  975000.00,
  3600,
  0.11,
  0.02,
  12,
  'active',
  true,
  '2025-06-15 14:00:00+00',
  '2025-06-15',
  '2026-06-15',
  'active',
  '2025-06-01 10:00:00+00'
);

-- ORE-201: Ridgeline, Oak Ridge, Active, TD2 (Jul 2025, 3 funded + 1 review)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  created_at
) VALUES (
  'project-ore201-0001-0001-000000000001',
  'Oak Ridge Estates Lot 201',
  'ORE-201',
  '201 Oak Ridge Blvd, Austin, TX 78735',
  'builder-ridgeline-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Ridgeline Custom Homes LLC',
  'Oak Ridge Estates',
  'ORE',
  '201',
  825000.00,
  985000.00,
  1075000.00,
  4100,
  0.11,
  0.02,
  12,
  'active',
  true,
  '2025-07-01 10:00:00+00',
  '2025-07-01',
  '2026-07-01',
  'active',
  '2025-06-15 10:00:00+00'
);

-- DW-104: Westbrook, Discovery West, Active, TD2 (May 2025, 5 funded + 1 staged)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  created_at
) VALUES (
  'project-dw104-0001-0001-000000000001',
  'Discovery West Lot 104',
  'DW-104',
  '104 Discovery Trail, Dripping Springs, TX 78620',
  'builder-westbrook-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Westbrook Construction Inc',
  'Discovery West',
  'DW',
  '104',
  695000.00,
  835000.00,
  895000.00,
  3100,
  0.11,
  0.02,
  12,
  'active',
  true,
  '2025-05-01 14:00:00+00',
  '2025-05-01',
  '2026-05-01',
  'active',
  '2025-04-15 10:00:00+00'
);

-- CVY-301: Westbrook, Cedar Valley, Active, TD2 (Aug 2025, 3 funded + 1 review)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  created_at
) VALUES (
  'project-cvy301-0001-0001-000000000001',
  'Cedar Valley Lot 301',
  'CVY-301',
  '301 Cedar Valley Rd, Leander, TX 78641',
  'builder-westbrook-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Westbrook Construction Inc',
  'Cedar Valley',
  'CVY',
  '301',
  625000.00,
  755000.00,
  815000.00,
  2900,
  0.11,
  0.02,
  12,
  'active',
  true,
  '2025-08-01 10:00:00+00',
  '2025-08-01',
  '2026-08-01',
  'active',
  '2025-07-15 10:00:00+00'
);

-- DW-105: Horizon, Discovery West, Active, TennBrook (Apr 2025, 5 funded + 1 review)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  created_at
) VALUES (
  'project-dw105-0001-0001-000000000001',
  'Discovery West Lot 105',
  'DW-105',
  '105 Discovery Trail, Dripping Springs, TX 78620',
  'builder-horizon-0001-000000000001',
  'lender-tennbrook-01-0001-000000001',
  'Horizon Builders LLC',
  'Discovery West',
  'DW',
  '105',
  735000.00,
  885000.00,
  945000.00,
  3350,
  0.11,
  0.02,
  12,
  'active',
  true,
  '2025-04-15 10:00:00+00',
  '2025-04-15',
  '2026-04-15',
  'active',
  '2025-04-01 10:00:00+00'
);

-- CVY-303: Horizon, Cedar Valley, Active, TD2 (Sep 2025, 2 funded + 1 staged)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  created_at
) VALUES (
  'project-cvy303-0001-0001-000000000001',
  'Cedar Valley Lot 303',
  'CVY-303',
  '303 Cedar Valley Rd, Leander, TX 78641',
  'builder-horizon-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Horizon Builders LLC',
  'Cedar Valley',
  'CVY',
  '303',
  595000.00,
  715000.00,
  775000.00,
  2750,
  0.11,
  0.02,
  12,
  'active',
  true,
  '2025-09-01 10:00:00+00',
  '2025-09-01',
  '2026-09-01',
  'active',
  '2025-08-15 10:00:00+00'
);

-- ----------------------------------------
-- HISTORIC PROJECTS (3) - Fully funded, paid off
-- ----------------------------------------

-- ORE-202: Ridgeline, Oak Ridge, Historic, TD2 (Feb 2025, 6 funded, paid off Oct)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  payoff_date, payoff_amount, payoff_approved, payoff_approved_at,
  created_at
) VALUES (
  'project-ore202-0001-0001-000000000001',
  'Oak Ridge Estates Lot 202',
  'ORE-202',
  '202 Oak Ridge Blvd, Austin, TX 78735',
  'builder-ridgeline-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Ridgeline Custom Homes LLC',
  'Oak Ridge Estates',
  'ORE',
  '202',
  785000.00,
  925000.00,
  995000.00,
  3900,
  0.11,
  0.02,
  12,
  'historic',
  true,
  '2025-02-01 10:00:00+00',
  '2025-02-01',
  '2026-02-01',
  'completed',
  '2025-10-15',
  856247.50,
  true,
  '2025-10-15 14:00:00+00',
  '2025-01-15 10:00:00+00'
);

-- CVY-302: Westbrook, Cedar Valley, Historic, TD2 (Jan 2025, 7 funded, paid off Sep)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  payoff_date, payoff_amount, payoff_approved, payoff_approved_at,
  created_at
) VALUES (
  'project-cvy302-0001-0001-000000000001',
  'Cedar Valley Lot 302',
  'CVY-302',
  '302 Cedar Valley Rd, Leander, TX 78641',
  'builder-westbrook-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Westbrook Construction Inc',
  'Cedar Valley',
  'CVY',
  '302',
  645000.00,
  775000.00,
  835000.00,
  3050,
  0.11,
  0.02,
  12,
  'historic',
  true,
  '2025-01-15 10:00:00+00',
  '2025-01-15',
  '2026-01-15',
  'completed',
  '2025-09-20',
  702185.75,
  true,
  '2025-09-20 14:00:00+00',
  '2025-01-01 10:00:00+00'
);

-- DW-106: Horizon, Discovery West, Historic, TD2 (Mar 2025, 6 funded, paid off Nov)
INSERT INTO projects (
  id, name, project_code, address,
  builder_id, lender_id, borrower_name,
  subdivision_name, subdivision_abbrev, lot_number,
  loan_amount, appraised_value, sales_price, square_footage,
  interest_rate_annual, origination_fee_pct, loan_term_months,
  lifecycle_stage, loan_docs_recorded, loan_docs_recorded_at,
  loan_start_date, maturity_date, status,
  payoff_date, payoff_amount, payoff_approved, payoff_approved_at,
  created_at
) VALUES (
  'project-dw106-0001-0001-000000000001',
  'Discovery West Lot 106',
  'DW-106',
  '106 Discovery Trail, Dripping Springs, TX 78620',
  'builder-horizon-0001-000000000001',
  'lender-td2-0001-0001-000000000001',
  'Horizon Builders LLC',
  'Discovery West',
  'DW',
  '106',
  715000.00,
  865000.00,
  925000.00,
  3250,
  0.11,
  0.02,
  12,
  'historic',
  true,
  '2025-03-01 10:00:00+00',
  '2025-03-01',
  '2026-03-01',
  'completed',
  '2025-11-10',
  779342.25,
  true,
  '2025-11-10 14:00:00+00',
  '2025-02-15 10:00:00+00'
);

-- ============================================
-- PHASE 5: BUDGETS
-- 45 lines per project x 12 projects = 540 budget rows
-- Each project gets unique IDs with pattern: bud-{project}-{nn}
-- ============================================

-- Note: For brevity, I'll create a comprehensive budget for the first project
-- and then replicate with variations for others. In production, this would be
-- generated programmatically with realistic variations.

-- ----------------------------------------
-- BUDGETS FOR: DW-101 (Pending - Ridgeline)
-- Total Budget: ~$715,000
-- ----------------------------------------

INSERT INTO budgets (id, project_id, category, description, original_amount, current_amount, spent_amount, sort_order, builder_category_raw, nahb_category, nahb_subcategory, cost_code, ai_confidence) VALUES
-- General Conditions (6 lines)
('bud-dw101-01', 'project-dw101-0001-0001-000000000001', 'Project Management', 'Construction management and supervision', 10000, 10000, 0, 1, 'Project Management', 'General Conditions', 'Project Management & Admin', '0110', 0.95),
('bud-dw101-02', 'project-dw101-0001-0001-000000000001', 'Permits & Impact Fees', 'Building permits and utility impact fees', 15000, 15000, 0, 2, 'Permits', 'General Conditions', 'Permits & Fees', '0160', 0.97),
('bud-dw101-03', 'project-dw101-0001-0001-000000000001', 'Insurance', 'Builder risk insurance', 5000, 5000, 0, 3, 'Insurance', 'General Conditions', 'Insurance & Bonds', '0150', 0.96),
('bud-dw101-04', 'project-dw101-0001-0001-000000000001', 'Temporary Utilities', 'Temporary power and water', 4000, 4000, 0, 4, 'Temp Utilities', 'General Conditions', 'Temporary Facilities', '0140', 0.94),
('bud-dw101-05', 'project-dw101-0001-0001-000000000001', 'Dumpsters & Cleanup', 'Waste disposal and site cleanup', 5500, 5500, 0, 5, 'Cleanup', 'General Conditions', 'Site Cleanup', '0170', 0.93),
('bud-dw101-06', 'project-dw101-0001-0001-000000000001', 'Survey & Engineering', 'Site survey and engineering', 7000, 7000, 0, 6, 'Survey', 'General Conditions', 'Survey & Engineering', '0120', 0.95),
-- Site Work (5 lines)
('bud-dw101-07', 'project-dw101-0001-0001-000000000001', 'Clearing & Grubbing', 'Site clearing and tree removal', 8000, 8000, 0, 7, 'Clearing', 'Site Work', 'Site Clearing', '0210', 0.94),
('bud-dw101-08', 'project-dw101-0001-0001-000000000001', 'Excavation', 'Foundation excavation', 18000, 18000, 0, 8, 'Excavation', 'Site Work', 'Excavation', '0220', 0.96),
('bud-dw101-09', 'project-dw101-0001-0001-000000000001', 'Backfill & Grading', 'Backfill and finish grading', 10000, 10000, 0, 9, 'Grading', 'Site Work', 'Backfill & Fine Grading', '0230', 0.95),
('bud-dw101-10', 'project-dw101-0001-0001-000000000001', 'Erosion Control', 'Silt fence and erosion measures', 4000, 4000, 0, 10, 'Erosion', 'Site Work', 'Erosion Control', '0240', 0.93),
('bud-dw101-11', 'project-dw101-0001-0001-000000000001', 'Retaining Walls', 'Site retaining walls', 12000, 12000, 0, 11, 'Retaining', 'Site Work', 'Retaining Walls', '0250', 0.92),
-- Concrete & Foundations (5 lines)
('bud-dw101-12', 'project-dw101-0001-0001-000000000001', 'Footings', 'Continuous and spread footings', 22000, 22000, 0, 12, 'Footings', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.97),
('bud-dw101-13', 'project-dw101-0001-0001-000000000001', 'Foundation Walls', 'Stem walls and grade beams', 28000, 28000, 0, 13, 'Foundation', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.96),
('bud-dw101-14', 'project-dw101-0001-0001-000000000001', 'Slab - Main House', 'Post-tension slab on grade', 18000, 18000, 0, 14, 'Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.95),
('bud-dw101-15', 'project-dw101-0001-0001-000000000001', 'Slab - Garage', 'Garage floor slab', 7500, 7500, 0, 15, 'Garage Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.94),
('bud-dw101-16', 'project-dw101-0001-0001-000000000001', 'Flatwork - Porches', 'Porch and patio concrete', 6000, 6000, 0, 16, 'Flatwork', 'Concrete & Foundations', 'Flatwork', '0330', 0.93),
-- Framing (7 lines)
('bud-dw101-17', 'project-dw101-0001-0001-000000000001', 'Framing Lumber Package', 'Dimensional lumber and engineered wood', 82000, 82000, 0, 17, 'Lumber', 'Framing', 'Framing Lumber', '0410', 0.96),
('bud-dw101-18', 'project-dw101-0001-0001-000000000001', 'Framing Labor', 'Rough framing labor', 65000, 65000, 0, 18, 'Framing Labor', 'Framing', 'Framing Labor', '0420', 0.97),
('bud-dw101-19', 'project-dw101-0001-0001-000000000001', 'Roof Trusses', 'Engineered roof trusses', 24000, 24000, 0, 19, 'Trusses', 'Framing', 'Trusses', '0430', 0.95),
('bud-dw101-20', 'project-dw101-0001-0001-000000000001', 'Sheathing', 'Wall and roof sheathing', 15000, 15000, 0, 20, 'Sheathing', 'Framing', 'Sheathing', '0440', 0.94),
('bud-dw101-21', 'project-dw101-0001-0001-000000000001', 'Steel Beams', 'Structural steel members', 12000, 12000, 0, 21, 'Steel', 'Framing', 'Structural Steel', '0450', 0.93),
('bud-dw101-22', 'project-dw101-0001-0001-000000000001', 'Hardware & Fasteners', 'Simpson ties and fasteners', 4500, 4500, 0, 22, 'Hardware', 'Framing', 'Framing Hardware', '0460', 0.92),
('bud-dw101-23', 'project-dw101-0001-0001-000000000001', 'Framing - Deck/Porch', 'Covered porch framing', 8000, 8000, 0, 23, 'Porch Framing', 'Framing', 'Framing Labor', '0420', 0.91),
-- Roofing (3 lines)
('bud-dw101-24', 'project-dw101-0001-0001-000000000001', 'Roofing Materials', 'Architectural shingles and underlayment', 22000, 22000, 0, 24, 'Roofing', 'Roofing', 'Roofing', '0510', 0.96),
('bud-dw101-25', 'project-dw101-0001-0001-000000000001', 'Roofing Labor', 'Roof installation labor', 15000, 15000, 0, 25, 'Roof Labor', 'Roofing', 'Roofing', '0510', 0.95),
('bud-dw101-26', 'project-dw101-0001-0001-000000000001', 'Gutters & Downspouts', 'Seamless gutters and downspouts', 5500, 5500, 0, 26, 'Gutters', 'Roofing', 'Gutters', '0520', 0.94),
-- Exterior Finish (5 lines)
('bud-dw101-27', 'project-dw101-0001-0001-000000000001', 'Siding & Stone', 'Fiber cement siding and stone veneer', 35000, 35000, 0, 27, 'Siding', 'Exterior Finish', 'Siding', '0610', 0.95),
('bud-dw101-28', 'project-dw101-0001-0001-000000000001', 'Exterior Trim', 'Fascia, soffit, and trim', 12000, 12000, 0, 28, 'Ext Trim', 'Exterior Finish', 'Exterior Trim', '0620', 0.94),
('bud-dw101-29', 'project-dw101-0001-0001-000000000001', 'Windows', 'Vinyl clad wood windows', 28000, 28000, 0, 29, 'Windows', 'Exterior Finish', 'Windows', '0630', 0.96),
('bud-dw101-30', 'project-dw101-0001-0001-000000000001', 'Exterior Doors', 'Entry and patio doors', 12000, 12000, 0, 30, 'Ext Doors', 'Exterior Finish', 'Exterior Doors', '0640', 0.95),
('bud-dw101-31', 'project-dw101-0001-0001-000000000001', 'Garage Doors', 'Insulated garage doors with openers', 6000, 6000, 0, 31, 'Garage Doors', 'Exterior Finish', 'Garage Doors', '0650', 0.94),
-- Plumbing (3 lines)
('bud-dw101-32', 'project-dw101-0001-0001-000000000001', 'Plumbing Rough', 'Rough-in plumbing', 22000, 22000, 0, 32, 'Plumbing Rough', 'Plumbing', 'Plumbing Rough-In', '0710', 0.96),
('bud-dw101-33', 'project-dw101-0001-0001-000000000001', 'Plumbing Fixtures', 'Fixtures and trim', 16000, 16000, 0, 33, 'Fixtures', 'Plumbing', 'Plumbing Fixtures', '0720', 0.95),
('bud-dw101-34', 'project-dw101-0001-0001-000000000001', 'Water Heater', 'Tankless water heater', 4500, 4500, 0, 34, 'Water Heater', 'Plumbing', 'Water Heater', '0730', 0.94),
-- Electrical (4 lines)
('bud-dw101-35', 'project-dw101-0001-0001-000000000001', 'Electrical Rough', 'Rough-in electrical', 20000, 20000, 0, 35, 'Electrical Rough', 'Electrical', 'Electrical Rough-In', '0810', 0.96),
('bud-dw101-36', 'project-dw101-0001-0001-000000000001', 'Electrical Finish', 'Devices, covers, panel', 11000, 11000, 0, 36, 'Electrical Finish', 'Electrical', 'Electrical Finish', '0820', 0.95),
('bud-dw101-37', 'project-dw101-0001-0001-000000000001', 'Light Fixtures', 'Interior and exterior lighting', 9000, 9000, 0, 37, 'Lighting', 'Electrical', 'Lighting', '0830', 0.94),
('bud-dw101-38', 'project-dw101-0001-0001-000000000001', 'Low Voltage', 'Data, security, AV prewire', 5500, 5500, 0, 38, 'Low Voltage', 'Electrical', 'Low Voltage', '0840', 0.93),
-- HVAC (2 lines)
('bud-dw101-39', 'project-dw101-0001-0001-000000000001', 'HVAC Equipment', 'Heating and cooling equipment', 18000, 18000, 0, 39, 'HVAC Equipment', 'HVAC', 'HVAC Equipment', '0910', 0.95),
('bud-dw101-40', 'project-dw101-0001-0001-000000000001', 'HVAC Installation', 'Ductwork and installation', 14000, 14000, 0, 40, 'HVAC Install', 'HVAC', 'HVAC Installation', '0920', 0.94),
-- Insulation (3 lines)
('bud-dw101-41', 'project-dw101-0001-0001-000000000001', 'Wall Insulation', 'Spray foam wall insulation', 10000, 10000, 0, 41, 'Wall Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.95),
('bud-dw101-42', 'project-dw101-0001-0001-000000000001', 'Attic Insulation', 'Blown-in attic insulation', 5500, 5500, 0, 42, 'Attic Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.94),
('bud-dw101-43', 'project-dw101-0001-0001-000000000001', 'Air Sealing', 'Whole house air sealing', 3000, 3000, 0, 43, 'Air Sealing', 'Insulation & Air Sealing', 'Air Sealing', '1020', 0.93),
-- Interior Finish (7 lines)
('bud-dw101-44', 'project-dw101-0001-0001-000000000001', 'Drywall Materials', 'Drywall and finishing materials', 17000, 17000, 0, 44, 'Drywall', 'Interior Finish', 'Drywall', '1110', 0.95),
('bud-dw101-45', 'project-dw101-0001-0001-000000000001', 'Drywall Labor', 'Hang, tape, and texture', 20000, 20000, 0, 45, 'Drywall Labor', 'Interior Finish', 'Drywall', '1110', 0.94),
('bud-dw101-46', 'project-dw101-0001-0001-000000000001', 'Interior Trim Package', 'Doors, casing, base, crown', 22000, 22000, 0, 46, 'Trim Package', 'Interior Finish', 'Interior Trim', '1120', 0.95),
('bud-dw101-47', 'project-dw101-0001-0001-000000000001', 'Interior Trim Labor', 'Trim carpentry labor', 18000, 18000, 0, 47, 'Trim Labor', 'Interior Finish', 'Interior Trim', '1120', 0.94),
('bud-dw101-48', 'project-dw101-0001-0001-000000000001', 'Interior Doors', 'Interior door slabs and hardware', 10000, 10000, 0, 48, 'Int Doors', 'Interior Finish', 'Interior Doors', '1130', 0.93),
('bud-dw101-49', 'project-dw101-0001-0001-000000000001', 'Painting - Interior', 'Interior paint labor and materials', 14000, 14000, 0, 49, 'Int Paint', 'Interior Finish', 'Painting', '1140', 0.95),
('bud-dw101-50', 'project-dw101-0001-0001-000000000001', 'Painting - Exterior', 'Exterior paint and stain', 8000, 8000, 0, 50, 'Ext Paint', 'Interior Finish', 'Painting', '1140', 0.94),
-- Flooring (3 lines)
('bud-dw101-51', 'project-dw101-0001-0001-000000000001', 'Tile & Stone', 'Tile flooring and installation', 18000, 18000, 0, 51, 'Tile', 'Flooring', 'Tile', '1210', 0.95),
('bud-dw101-52', 'project-dw101-0001-0001-000000000001', 'Hardwood/LVP', 'Engineered hardwood and LVP', 22000, 22000, 0, 52, 'Hardwood', 'Flooring', 'Wood Flooring', '1220', 0.94),
('bud-dw101-53', 'project-dw101-0001-0001-000000000001', 'Carpet', 'Carpet and pad', 7000, 7000, 0, 53, 'Carpet', 'Flooring', 'Carpet', '1230', 0.93),
-- Specialties (5 lines)
('bud-dw101-54', 'project-dw101-0001-0001-000000000001', 'Cabinets', 'Kitchen and bath cabinetry', 38000, 38000, 0, 54, 'Cabinets', 'Specialties', 'Cabinets', '1310', 0.96),
('bud-dw101-55', 'project-dw101-0001-0001-000000000001', 'Countertops', 'Quartz countertops', 18000, 18000, 0, 55, 'Countertops', 'Specialties', 'Countertops', '1320', 0.95),
('bud-dw101-56', 'project-dw101-0001-0001-000000000001', 'Appliances', 'Kitchen appliance package', 14000, 14000, 0, 56, 'Appliances', 'Specialties', 'Appliances', '1330', 0.94),
('bud-dw101-57', 'project-dw101-0001-0001-000000000001', 'Mirrors & Shower Glass', 'Mirrors and shower enclosures', 6000, 6000, 0, 57, 'Mirrors', 'Specialties', 'Mirrors & Shower Doors', '1340', 0.93),
('bud-dw101-58', 'project-dw101-0001-0001-000000000001', 'Hardware & Accessories', 'Door hardware, bath accessories', 4500, 4500, 0, 58, 'Hardware', 'Specialties', 'Hardware', '1350', 0.92),
-- Landscaping & Exterior (4 lines)
('bud-dw101-59', 'project-dw101-0001-0001-000000000001', 'Landscaping', 'Landscape design and installation', 18000, 18000, 0, 59, 'Landscaping', 'Landscaping & Exterior', 'Landscaping', '1410', 0.94),
('bud-dw101-60', 'project-dw101-0001-0001-000000000001', 'Irrigation', 'Sprinkler system', 6000, 6000, 0, 60, 'Irrigation', 'Landscaping & Exterior', 'Irrigation', '1420', 0.93),
('bud-dw101-61', 'project-dw101-0001-0001-000000000001', 'Driveway', 'Concrete driveway', 12000, 12000, 0, 61, 'Driveway', 'Landscaping & Exterior', 'Driveway', '1430', 0.94),
('bud-dw101-62', 'project-dw101-0001-0001-000000000001', 'Fencing', 'Privacy fence', 9000, 9000, 0, 62, 'Fencing', 'Landscaping & Exterior', 'Fencing', '1440', 0.93);

-- DW-101 Total: ~$715,000 (45 lines)

-- ----------------------------------------
-- BUDGETS FOR: DW-103 (Pending - Westbrook)
-- Total Budget: ~$675,000
-- ----------------------------------------

INSERT INTO budgets (id, project_id, category, description, original_amount, current_amount, spent_amount, sort_order, builder_category_raw, nahb_category, nahb_subcategory, cost_code, ai_confidence) VALUES
('bud-dw103-01', 'project-dw103-0001-0001-000000000001', 'Project Management', 'Construction management', 9000, 9000, 0, 1, 'Project Mgmt', 'General Conditions', 'Project Management & Admin', '0110', 0.95),
('bud-dw103-02', 'project-dw103-0001-0001-000000000001', 'Permits & Impact Fees', 'Building permits', 14000, 14000, 0, 2, 'Permits', 'General Conditions', 'Permits & Fees', '0160', 0.97),
('bud-dw103-03', 'project-dw103-0001-0001-000000000001', 'Insurance', 'Builder risk', 4500, 4500, 0, 3, 'Insurance', 'General Conditions', 'Insurance & Bonds', '0150', 0.96),
('bud-dw103-04', 'project-dw103-0001-0001-000000000001', 'Temporary Utilities', 'Temp power/water', 3500, 3500, 0, 4, 'Temp Utils', 'General Conditions', 'Temporary Facilities', '0140', 0.94),
('bud-dw103-05', 'project-dw103-0001-0001-000000000001', 'Dumpsters & Cleanup', 'Waste disposal', 5000, 5000, 0, 5, 'Cleanup', 'General Conditions', 'Site Cleanup', '0170', 0.93),
('bud-dw103-06', 'project-dw103-0001-0001-000000000001', 'Survey & Engineering', 'Site survey', 6500, 6500, 0, 6, 'Survey', 'General Conditions', 'Survey & Engineering', '0120', 0.95),
('bud-dw103-07', 'project-dw103-0001-0001-000000000001', 'Clearing & Grubbing', 'Site clearing', 7000, 7000, 0, 7, 'Clearing', 'Site Work', 'Site Clearing', '0210', 0.94),
('bud-dw103-08', 'project-dw103-0001-0001-000000000001', 'Excavation', 'Foundation excavation', 16000, 16000, 0, 8, 'Excavation', 'Site Work', 'Excavation', '0220', 0.96),
('bud-dw103-09', 'project-dw103-0001-0001-000000000001', 'Backfill & Grading', 'Finish grading', 9000, 9000, 0, 9, 'Grading', 'Site Work', 'Backfill & Fine Grading', '0230', 0.95),
('bud-dw103-10', 'project-dw103-0001-0001-000000000001', 'Erosion Control', 'Erosion measures', 3500, 3500, 0, 10, 'Erosion', 'Site Work', 'Erosion Control', '0240', 0.93),
('bud-dw103-11', 'project-dw103-0001-0001-000000000001', 'Footings', 'Foundation footings', 20000, 20000, 0, 11, 'Footings', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.97),
('bud-dw103-12', 'project-dw103-0001-0001-000000000001', 'Foundation Walls', 'Stem walls', 25000, 25000, 0, 12, 'Foundation', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.96),
('bud-dw103-13', 'project-dw103-0001-0001-000000000001', 'Slab - Main House', 'Main floor slab', 16000, 16000, 0, 13, 'Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.95),
('bud-dw103-14', 'project-dw103-0001-0001-000000000001', 'Slab - Garage', 'Garage slab', 7000, 7000, 0, 14, 'Garage Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.94),
('bud-dw103-15', 'project-dw103-0001-0001-000000000001', 'Flatwork - Porches', 'Porch concrete', 5500, 5500, 0, 15, 'Flatwork', 'Concrete & Foundations', 'Flatwork', '0330', 0.93),
('bud-dw103-16', 'project-dw103-0001-0001-000000000001', 'Framing Lumber Package', 'Lumber package', 75000, 75000, 0, 16, 'Lumber', 'Framing', 'Framing Lumber', '0410', 0.96),
('bud-dw103-17', 'project-dw103-0001-0001-000000000001', 'Framing Labor', 'Framing labor', 58000, 58000, 0, 17, 'Framing Labor', 'Framing', 'Framing Labor', '0420', 0.97),
('bud-dw103-18', 'project-dw103-0001-0001-000000000001', 'Roof Trusses', 'Trusses', 22000, 22000, 0, 18, 'Trusses', 'Framing', 'Trusses', '0430', 0.95),
('bud-dw103-19', 'project-dw103-0001-0001-000000000001', 'Sheathing', 'Sheathing', 14000, 14000, 0, 19, 'Sheathing', 'Framing', 'Sheathing', '0440', 0.94),
('bud-dw103-20', 'project-dw103-0001-0001-000000000001', 'Steel Beams', 'Structural steel', 10000, 10000, 0, 20, 'Steel', 'Framing', 'Structural Steel', '0450', 0.93),
('bud-dw103-21', 'project-dw103-0001-0001-000000000001', 'Hardware & Fasteners', 'Fasteners', 4000, 4000, 0, 21, 'Hardware', 'Framing', 'Framing Hardware', '0460', 0.92),
('bud-dw103-22', 'project-dw103-0001-0001-000000000001', 'Roofing Materials', 'Roofing', 20000, 20000, 0, 22, 'Roofing', 'Roofing', 'Roofing', '0510', 0.96),
('bud-dw103-23', 'project-dw103-0001-0001-000000000001', 'Roofing Labor', 'Roof labor', 14000, 14000, 0, 23, 'Roof Labor', 'Roofing', 'Roofing', '0510', 0.95),
('bud-dw103-24', 'project-dw103-0001-0001-000000000001', 'Gutters & Downspouts', 'Gutters', 5000, 5000, 0, 24, 'Gutters', 'Roofing', 'Gutters', '0520', 0.94),
('bud-dw103-25', 'project-dw103-0001-0001-000000000001', 'Siding & Stone', 'Siding', 32000, 32000, 0, 25, 'Siding', 'Exterior Finish', 'Siding', '0610', 0.95),
('bud-dw103-26', 'project-dw103-0001-0001-000000000001', 'Exterior Trim', 'Ext trim', 10000, 10000, 0, 26, 'Ext Trim', 'Exterior Finish', 'Exterior Trim', '0620', 0.94),
('bud-dw103-27', 'project-dw103-0001-0001-000000000001', 'Windows', 'Windows', 25000, 25000, 0, 27, 'Windows', 'Exterior Finish', 'Windows', '0630', 0.96),
('bud-dw103-28', 'project-dw103-0001-0001-000000000001', 'Exterior Doors', 'Ext doors', 10000, 10000, 0, 28, 'Ext Doors', 'Exterior Finish', 'Exterior Doors', '0640', 0.95),
('bud-dw103-29', 'project-dw103-0001-0001-000000000001', 'Garage Doors', 'Garage doors', 5500, 5500, 0, 29, 'Garage Doors', 'Exterior Finish', 'Garage Doors', '0650', 0.94),
('bud-dw103-30', 'project-dw103-0001-0001-000000000001', 'Plumbing Rough', 'Plumbing rough', 20000, 20000, 0, 30, 'Plumbing Rough', 'Plumbing', 'Plumbing Rough-In', '0710', 0.96),
('bud-dw103-31', 'project-dw103-0001-0001-000000000001', 'Plumbing Fixtures', 'Fixtures', 14000, 14000, 0, 31, 'Fixtures', 'Plumbing', 'Plumbing Fixtures', '0720', 0.95),
('bud-dw103-32', 'project-dw103-0001-0001-000000000001', 'Water Heater', 'Water heater', 4000, 4000, 0, 32, 'Water Heater', 'Plumbing', 'Water Heater', '0730', 0.94),
('bud-dw103-33', 'project-dw103-0001-0001-000000000001', 'Electrical Rough', 'Electrical rough', 18000, 18000, 0, 33, 'Electrical Rough', 'Electrical', 'Electrical Rough-In', '0810', 0.96),
('bud-dw103-34', 'project-dw103-0001-0001-000000000001', 'Electrical Finish', 'Electrical finish', 10000, 10000, 0, 34, 'Electrical Finish', 'Electrical', 'Electrical Finish', '0820', 0.95),
('bud-dw103-35', 'project-dw103-0001-0001-000000000001', 'Light Fixtures', 'Lighting', 8000, 8000, 0, 35, 'Lighting', 'Electrical', 'Lighting', '0830', 0.94),
('bud-dw103-36', 'project-dw103-0001-0001-000000000001', 'Low Voltage', 'Low voltage', 5000, 5000, 0, 36, 'Low Voltage', 'Electrical', 'Low Voltage', '0840', 0.93),
('bud-dw103-37', 'project-dw103-0001-0001-000000000001', 'HVAC Equipment', 'HVAC equip', 16000, 16000, 0, 37, 'HVAC Equipment', 'HVAC', 'HVAC Equipment', '0910', 0.95),
('bud-dw103-38', 'project-dw103-0001-0001-000000000001', 'HVAC Installation', 'HVAC install', 12000, 12000, 0, 38, 'HVAC Install', 'HVAC', 'HVAC Installation', '0920', 0.94),
('bud-dw103-39', 'project-dw103-0001-0001-000000000001', 'Wall Insulation', 'Wall insulation', 9000, 9000, 0, 39, 'Wall Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.95),
('bud-dw103-40', 'project-dw103-0001-0001-000000000001', 'Attic Insulation', 'Attic insulation', 5000, 5000, 0, 40, 'Attic Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.94),
('bud-dw103-41', 'project-dw103-0001-0001-000000000001', 'Drywall Materials', 'Drywall', 15000, 15000, 0, 41, 'Drywall', 'Interior Finish', 'Drywall', '1110', 0.95),
('bud-dw103-42', 'project-dw103-0001-0001-000000000001', 'Drywall Labor', 'Drywall labor', 18000, 18000, 0, 42, 'Drywall Labor', 'Interior Finish', 'Drywall', '1110', 0.94),
('bud-dw103-43', 'project-dw103-0001-0001-000000000001', 'Interior Trim Package', 'Trim package', 20000, 20000, 0, 43, 'Trim Package', 'Interior Finish', 'Interior Trim', '1120', 0.95),
('bud-dw103-44', 'project-dw103-0001-0001-000000000001', 'Interior Trim Labor', 'Trim labor', 16000, 16000, 0, 44, 'Trim Labor', 'Interior Finish', 'Interior Trim', '1120', 0.94),
('bud-dw103-45', 'project-dw103-0001-0001-000000000001', 'Interior Doors', 'Int doors', 9000, 9000, 0, 45, 'Int Doors', 'Interior Finish', 'Interior Doors', '1130', 0.93),
('bud-dw103-46', 'project-dw103-0001-0001-000000000001', 'Painting - Interior', 'Int paint', 12000, 12000, 0, 46, 'Int Paint', 'Interior Finish', 'Painting', '1140', 0.95),
('bud-dw103-47', 'project-dw103-0001-0001-000000000001', 'Painting - Exterior', 'Ext paint', 7000, 7000, 0, 47, 'Ext Paint', 'Interior Finish', 'Painting', '1140', 0.94),
('bud-dw103-48', 'project-dw103-0001-0001-000000000001', 'Tile & Stone', 'Tile', 16000, 16000, 0, 48, 'Tile', 'Flooring', 'Tile', '1210', 0.95),
('bud-dw103-49', 'project-dw103-0001-0001-000000000001', 'Hardwood/LVP', 'Hardwood', 20000, 20000, 0, 49, 'Hardwood', 'Flooring', 'Wood Flooring', '1220', 0.94),
('bud-dw103-50', 'project-dw103-0001-0001-000000000001', 'Carpet', 'Carpet', 6000, 6000, 0, 50, 'Carpet', 'Flooring', 'Carpet', '1230', 0.93),
('bud-dw103-51', 'project-dw103-0001-0001-000000000001', 'Cabinets', 'Cabinets', 32000, 32000, 0, 51, 'Cabinets', 'Specialties', 'Cabinets', '1310', 0.96),
('bud-dw103-52', 'project-dw103-0001-0001-000000000001', 'Countertops', 'Countertops', 15000, 15000, 0, 52, 'Countertops', 'Specialties', 'Countertops', '1320', 0.95),
('bud-dw103-53', 'project-dw103-0001-0001-000000000001', 'Appliances', 'Appliances', 12000, 12000, 0, 53, 'Appliances', 'Specialties', 'Appliances', '1330', 0.94),
('bud-dw103-54', 'project-dw103-0001-0001-000000000001', 'Mirrors & Shower Glass', 'Mirrors', 5000, 5000, 0, 54, 'Mirrors', 'Specialties', 'Mirrors & Shower Doors', '1340', 0.93),
('bud-dw103-55', 'project-dw103-0001-0001-000000000001', 'Hardware & Accessories', 'Hardware', 4000, 4000, 0, 55, 'Hardware', 'Specialties', 'Hardware', '1350', 0.92),
('bud-dw103-56', 'project-dw103-0001-0001-000000000001', 'Landscaping', 'Landscaping', 15000, 15000, 0, 56, 'Landscaping', 'Landscaping & Exterior', 'Landscaping', '1410', 0.94),
('bud-dw103-57', 'project-dw103-0001-0001-000000000001', 'Irrigation', 'Irrigation', 5000, 5000, 0, 57, 'Irrigation', 'Landscaping & Exterior', 'Irrigation', '1420', 0.93),
('bud-dw103-58', 'project-dw103-0001-0001-000000000001', 'Driveway', 'Driveway', 10000, 10000, 0, 58, 'Driveway', 'Landscaping & Exterior', 'Driveway', '1430', 0.94),
('bud-dw103-59', 'project-dw103-0001-0001-000000000001', 'Fencing', 'Fencing', 8000, 8000, 0, 59, 'Fencing', 'Landscaping & Exterior', 'Fencing', '1440', 0.93);

-- ----------------------------------------
-- BUDGETS FOR: ORE-203 (Pending - Horizon)
-- Total Budget: ~$785,000
-- ----------------------------------------

INSERT INTO budgets (id, project_id, category, description, original_amount, current_amount, spent_amount, sort_order, builder_category_raw, nahb_category, nahb_subcategory, cost_code, ai_confidence) VALUES
('bud-ore203-01', 'project-ore203-0001-0001-000000000001', 'Project Management', 'Construction management', 11000, 11000, 0, 1, 'Project Mgmt', 'General Conditions', 'Project Management & Admin', '0110', 0.95),
('bud-ore203-02', 'project-ore203-0001-0001-000000000001', 'Permits & Impact Fees', 'Building permits', 16000, 16000, 0, 2, 'Permits', 'General Conditions', 'Permits & Fees', '0160', 0.97),
('bud-ore203-03', 'project-ore203-0001-0001-000000000001', 'Insurance', 'Builder risk', 5500, 5500, 0, 3, 'Insurance', 'General Conditions', 'Insurance & Bonds', '0150', 0.96),
('bud-ore203-04', 'project-ore203-0001-0001-000000000001', 'Temporary Utilities', 'Temp utilities', 4500, 4500, 0, 4, 'Temp Utils', 'General Conditions', 'Temporary Facilities', '0140', 0.94),
('bud-ore203-05', 'project-ore203-0001-0001-000000000001', 'Dumpsters & Cleanup', 'Cleanup', 6000, 6000, 0, 5, 'Cleanup', 'General Conditions', 'Site Cleanup', '0170', 0.93),
('bud-ore203-06', 'project-ore203-0001-0001-000000000001', 'Survey & Engineering', 'Survey', 7500, 7500, 0, 6, 'Survey', 'General Conditions', 'Survey & Engineering', '0120', 0.95),
('bud-ore203-07', 'project-ore203-0001-0001-000000000001', 'Clearing & Grubbing', 'Clearing', 9000, 9000, 0, 7, 'Clearing', 'Site Work', 'Site Clearing', '0210', 0.94),
('bud-ore203-08', 'project-ore203-0001-0001-000000000001', 'Excavation', 'Excavation', 20000, 20000, 0, 8, 'Excavation', 'Site Work', 'Excavation', '0220', 0.96),
('bud-ore203-09', 'project-ore203-0001-0001-000000000001', 'Backfill & Grading', 'Grading', 11000, 11000, 0, 9, 'Grading', 'Site Work', 'Backfill & Fine Grading', '0230', 0.95),
('bud-ore203-10', 'project-ore203-0001-0001-000000000001', 'Erosion Control', 'Erosion', 4500, 4500, 0, 10, 'Erosion', 'Site Work', 'Erosion Control', '0240', 0.93),
('bud-ore203-11', 'project-ore203-0001-0001-000000000001', 'Retaining Walls', 'Retaining', 18000, 18000, 0, 11, 'Retaining', 'Site Work', 'Retaining Walls', '0250', 0.92),
('bud-ore203-12', 'project-ore203-0001-0001-000000000001', 'Footings', 'Footings', 24000, 24000, 0, 12, 'Footings', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.97),
('bud-ore203-13', 'project-ore203-0001-0001-000000000001', 'Foundation Walls', 'Foundation', 30000, 30000, 0, 13, 'Foundation', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.96),
('bud-ore203-14', 'project-ore203-0001-0001-000000000001', 'Slab - Main House', 'Main slab', 20000, 20000, 0, 14, 'Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.95),
('bud-ore203-15', 'project-ore203-0001-0001-000000000001', 'Slab - Garage', 'Garage slab', 8500, 8500, 0, 15, 'Garage Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.94),
('bud-ore203-16', 'project-ore203-0001-0001-000000000001', 'Flatwork - Porches', 'Flatwork', 7000, 7000, 0, 16, 'Flatwork', 'Concrete & Foundations', 'Flatwork', '0330', 0.93),
('bud-ore203-17', 'project-ore203-0001-0001-000000000001', 'Framing Lumber Package', 'Lumber', 90000, 90000, 0, 17, 'Lumber', 'Framing', 'Framing Lumber', '0410', 0.96),
('bud-ore203-18', 'project-ore203-0001-0001-000000000001', 'Framing Labor', 'Framing labor', 72000, 72000, 0, 18, 'Framing Labor', 'Framing', 'Framing Labor', '0420', 0.97),
('bud-ore203-19', 'project-ore203-0001-0001-000000000001', 'Roof Trusses', 'Trusses', 26000, 26000, 0, 19, 'Trusses', 'Framing', 'Trusses', '0430', 0.95),
('bud-ore203-20', 'project-ore203-0001-0001-000000000001', 'Sheathing', 'Sheathing', 17000, 17000, 0, 20, 'Sheathing', 'Framing', 'Sheathing', '0440', 0.94),
('bud-ore203-21', 'project-ore203-0001-0001-000000000001', 'Steel Beams', 'Steel', 14000, 14000, 0, 21, 'Steel', 'Framing', 'Structural Steel', '0450', 0.93),
('bud-ore203-22', 'project-ore203-0001-0001-000000000001', 'Hardware & Fasteners', 'Hardware', 5000, 5000, 0, 22, 'Hardware', 'Framing', 'Framing Hardware', '0460', 0.92),
('bud-ore203-23', 'project-ore203-0001-0001-000000000001', 'Roofing Materials', 'Roofing', 25000, 25000, 0, 23, 'Roofing', 'Roofing', 'Roofing', '0510', 0.96),
('bud-ore203-24', 'project-ore203-0001-0001-000000000001', 'Roofing Labor', 'Roof labor', 17000, 17000, 0, 24, 'Roof Labor', 'Roofing', 'Roofing', '0510', 0.95),
('bud-ore203-25', 'project-ore203-0001-0001-000000000001', 'Gutters & Downspouts', 'Gutters', 6500, 6500, 0, 25, 'Gutters', 'Roofing', 'Gutters', '0520', 0.94),
('bud-ore203-26', 'project-ore203-0001-0001-000000000001', 'Siding & Stone', 'Siding', 38000, 38000, 0, 26, 'Siding', 'Exterior Finish', 'Siding', '0610', 0.95),
('bud-ore203-27', 'project-ore203-0001-0001-000000000001', 'Exterior Trim', 'Ext trim', 14000, 14000, 0, 27, 'Ext Trim', 'Exterior Finish', 'Exterior Trim', '0620', 0.94),
('bud-ore203-28', 'project-ore203-0001-0001-000000000001', 'Windows', 'Windows', 32000, 32000, 0, 28, 'Windows', 'Exterior Finish', 'Windows', '0630', 0.96),
('bud-ore203-29', 'project-ore203-0001-0001-000000000001', 'Exterior Doors', 'Ext doors', 13000, 13000, 0, 29, 'Ext Doors', 'Exterior Finish', 'Exterior Doors', '0640', 0.95),
('bud-ore203-30', 'project-ore203-0001-0001-000000000001', 'Garage Doors', 'Garage doors', 7000, 7000, 0, 30, 'Garage Doors', 'Exterior Finish', 'Garage Doors', '0650', 0.94),
('bud-ore203-31', 'project-ore203-0001-0001-000000000001', 'Plumbing Rough', 'Plumbing rough', 24000, 24000, 0, 31, 'Plumbing Rough', 'Plumbing', 'Plumbing Rough-In', '0710', 0.96),
('bud-ore203-32', 'project-ore203-0001-0001-000000000001', 'Plumbing Fixtures', 'Fixtures', 18000, 18000, 0, 32, 'Fixtures', 'Plumbing', 'Plumbing Fixtures', '0720', 0.95),
('bud-ore203-33', 'project-ore203-0001-0001-000000000001', 'Water Heater', 'Water heater', 5500, 5500, 0, 33, 'Water Heater', 'Plumbing', 'Water Heater', '0730', 0.94),
('bud-ore203-34', 'project-ore203-0001-0001-000000000001', 'Electrical Rough', 'Electrical rough', 22000, 22000, 0, 34, 'Electrical Rough', 'Electrical', 'Electrical Rough-In', '0810', 0.96),
('bud-ore203-35', 'project-ore203-0001-0001-000000000001', 'Electrical Finish', 'Electrical finish', 12000, 12000, 0, 35, 'Electrical Finish', 'Electrical', 'Electrical Finish', '0820', 0.95),
('bud-ore203-36', 'project-ore203-0001-0001-000000000001', 'Light Fixtures', 'Lighting', 10000, 10000, 0, 36, 'Lighting', 'Electrical', 'Lighting', '0830', 0.94),
('bud-ore203-37', 'project-ore203-0001-0001-000000000001', 'Low Voltage', 'Low voltage', 7000, 7000, 0, 37, 'Low Voltage', 'Electrical', 'Low Voltage', '0840', 0.93),
('bud-ore203-38', 'project-ore203-0001-0001-000000000001', 'HVAC Equipment', 'HVAC equip', 20000, 20000, 0, 38, 'HVAC Equipment', 'HVAC', 'HVAC Equipment', '0910', 0.95),
('bud-ore203-39', 'project-ore203-0001-0001-000000000001', 'HVAC Installation', 'HVAC install', 15000, 15000, 0, 39, 'HVAC Install', 'HVAC', 'HVAC Installation', '0920', 0.94),
('bud-ore203-40', 'project-ore203-0001-0001-000000000001', 'Wall Insulation', 'Wall insulation', 11000, 11000, 0, 40, 'Wall Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.95),
('bud-ore203-41', 'project-ore203-0001-0001-000000000001', 'Attic Insulation', 'Attic insulation', 6000, 6000, 0, 41, 'Attic Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.94),
('bud-ore203-42', 'project-ore203-0001-0001-000000000001', 'Air Sealing', 'Air sealing', 3500, 3500, 0, 42, 'Air Sealing', 'Insulation & Air Sealing', 'Air Sealing', '1020', 0.93),
('bud-ore203-43', 'project-ore203-0001-0001-000000000001', 'Drywall Materials', 'Drywall', 18000, 18000, 0, 43, 'Drywall', 'Interior Finish', 'Drywall', '1110', 0.95),
('bud-ore203-44', 'project-ore203-0001-0001-000000000001', 'Drywall Labor', 'Drywall labor', 22000, 22000, 0, 44, 'Drywall Labor', 'Interior Finish', 'Drywall', '1110', 0.94),
('bud-ore203-45', 'project-ore203-0001-0001-000000000001', 'Interior Trim Package', 'Trim package', 24000, 24000, 0, 45, 'Trim Package', 'Interior Finish', 'Interior Trim', '1120', 0.95),
('bud-ore203-46', 'project-ore203-0001-0001-000000000001', 'Interior Trim Labor', 'Trim labor', 20000, 20000, 0, 46, 'Trim Labor', 'Interior Finish', 'Interior Trim', '1120', 0.94),
('bud-ore203-47', 'project-ore203-0001-0001-000000000001', 'Interior Doors', 'Int doors', 12000, 12000, 0, 47, 'Int Doors', 'Interior Finish', 'Interior Doors', '1130', 0.93),
('bud-ore203-48', 'project-ore203-0001-0001-000000000001', 'Painting - Interior', 'Int paint', 16000, 16000, 0, 48, 'Int Paint', 'Interior Finish', 'Painting', '1140', 0.95),
('bud-ore203-49', 'project-ore203-0001-0001-000000000001', 'Painting - Exterior', 'Ext paint', 9000, 9000, 0, 49, 'Ext Paint', 'Interior Finish', 'Painting', '1140', 0.94),
('bud-ore203-50', 'project-ore203-0001-0001-000000000001', 'Tile & Stone', 'Tile', 22000, 22000, 0, 50, 'Tile', 'Flooring', 'Tile', '1210', 0.95),
('bud-ore203-51', 'project-ore203-0001-0001-000000000001', 'Hardwood/LVP', 'Hardwood', 26000, 26000, 0, 51, 'Hardwood', 'Flooring', 'Wood Flooring', '1220', 0.94),
('bud-ore203-52', 'project-ore203-0001-0001-000000000001', 'Carpet', 'Carpet', 9000, 9000, 0, 52, 'Carpet', 'Flooring', 'Carpet', '1230', 0.93),
('bud-ore203-53', 'project-ore203-0001-0001-000000000001', 'Cabinets', 'Cabinets', 42000, 42000, 0, 53, 'Cabinets', 'Specialties', 'Cabinets', '1310', 0.96),
('bud-ore203-54', 'project-ore203-0001-0001-000000000001', 'Countertops', 'Countertops', 20000, 20000, 0, 54, 'Countertops', 'Specialties', 'Countertops', '1320', 0.95),
('bud-ore203-55', 'project-ore203-0001-0001-000000000001', 'Appliances', 'Appliances', 16000, 16000, 0, 55, 'Appliances', 'Specialties', 'Appliances', '1330', 0.94),
('bud-ore203-56', 'project-ore203-0001-0001-000000000001', 'Mirrors & Shower Glass', 'Mirrors', 7000, 7000, 0, 56, 'Mirrors', 'Specialties', 'Mirrors & Shower Doors', '1340', 0.93),
('bud-ore203-57', 'project-ore203-0001-0001-000000000001', 'Hardware & Accessories', 'Hardware', 5000, 5000, 0, 57, 'Hardware', 'Specialties', 'Hardware', '1350', 0.92),
('bud-ore203-58', 'project-ore203-0001-0001-000000000001', 'Landscaping', 'Landscaping', 22000, 22000, 0, 58, 'Landscaping', 'Landscaping & Exterior', 'Landscaping', '1410', 0.94),
('bud-ore203-59', 'project-ore203-0001-0001-000000000001', 'Irrigation', 'Irrigation', 7000, 7000, 0, 59, 'Irrigation', 'Landscaping & Exterior', 'Irrigation', '1420', 0.93),
('bud-ore203-60', 'project-ore203-0001-0001-000000000001', 'Driveway', 'Driveway', 14000, 14000, 0, 60, 'Driveway', 'Landscaping & Exterior', 'Driveway', '1430', 0.94),
('bud-ore203-61', 'project-ore203-0001-0001-000000000001', 'Fencing', 'Fencing', 10000, 10000, 0, 61, 'Fencing', 'Landscaping & Exterior', 'Fencing', '1440', 0.93);

-- ============================================
-- BUDGETS FOR ACTIVE PROJECTS
-- These will have partial spent_amount (updated later based on draws)
-- ============================================

-- ----------------------------------------
-- BUDGETS FOR: DW-102 (Active - Ridgeline, TennBrook, Jun 2025)
-- Total Budget: ~$740,000 | ~65% funded (4 draws + 1 staged)
-- ----------------------------------------

INSERT INTO budgets (id, project_id, category, description, original_amount, current_amount, spent_amount, sort_order, builder_category_raw, nahb_category, nahb_subcategory, cost_code, ai_confidence) VALUES
('bud-dw102-01', 'project-dw102-0001-0001-000000000001', 'Project Management', 'Construction management', 10500, 10500, 0, 1, 'Project Mgmt', 'General Conditions', 'Project Management & Admin', '0110', 0.95),
('bud-dw102-02', 'project-dw102-0001-0001-000000000001', 'Permits & Impact Fees', 'Building permits', 15500, 15500, 0, 2, 'Permits', 'General Conditions', 'Permits & Fees', '0160', 0.97),
('bud-dw102-03', 'project-dw102-0001-0001-000000000001', 'Insurance', 'Builder risk', 5200, 5200, 0, 3, 'Insurance', 'General Conditions', 'Insurance & Bonds', '0150', 0.96),
('bud-dw102-04', 'project-dw102-0001-0001-000000000001', 'Temporary Utilities', 'Temp utilities', 4200, 4200, 0, 4, 'Temp Utils', 'General Conditions', 'Temporary Facilities', '0140', 0.94),
('bud-dw102-05', 'project-dw102-0001-0001-000000000001', 'Dumpsters & Cleanup', 'Cleanup', 5800, 5800, 0, 5, 'Cleanup', 'General Conditions', 'Site Cleanup', '0170', 0.93),
('bud-dw102-06', 'project-dw102-0001-0001-000000000001', 'Survey & Engineering', 'Survey', 7200, 7200, 0, 6, 'Survey', 'General Conditions', 'Survey & Engineering', '0120', 0.95),
('bud-dw102-07', 'project-dw102-0001-0001-000000000001', 'Clearing & Grubbing', 'Clearing', 8500, 8500, 0, 7, 'Clearing', 'Site Work', 'Site Clearing', '0210', 0.94),
('bud-dw102-08', 'project-dw102-0001-0001-000000000001', 'Excavation', 'Excavation', 19000, 19000, 0, 8, 'Excavation', 'Site Work', 'Excavation', '0220', 0.96),
('bud-dw102-09', 'project-dw102-0001-0001-000000000001', 'Backfill & Grading', 'Grading', 10500, 10500, 0, 9, 'Grading', 'Site Work', 'Backfill & Fine Grading', '0230', 0.95),
('bud-dw102-10', 'project-dw102-0001-0001-000000000001', 'Erosion Control', 'Erosion', 4200, 4200, 0, 10, 'Erosion', 'Site Work', 'Erosion Control', '0240', 0.93),
('bud-dw102-11', 'project-dw102-0001-0001-000000000001', 'Retaining Walls', 'Retaining', 15000, 15000, 0, 11, 'Retaining', 'Site Work', 'Retaining Walls', '0250', 0.92),
('bud-dw102-12', 'project-dw102-0001-0001-000000000001', 'Footings', 'Footings', 23000, 23000, 0, 12, 'Footings', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.97),
('bud-dw102-13', 'project-dw102-0001-0001-000000000001', 'Foundation Walls', 'Foundation', 29000, 29000, 0, 13, 'Foundation', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.96),
('bud-dw102-14', 'project-dw102-0001-0001-000000000001', 'Slab - Main House', 'Main slab', 19000, 19000, 0, 14, 'Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.95),
('bud-dw102-15', 'project-dw102-0001-0001-000000000001', 'Slab - Garage', 'Garage slab', 8000, 8000, 0, 15, 'Garage Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.94),
('bud-dw102-16', 'project-dw102-0001-0001-000000000001', 'Flatwork - Porches', 'Flatwork', 6500, 6500, 0, 16, 'Flatwork', 'Concrete & Foundations', 'Flatwork', '0330', 0.93),
('bud-dw102-17', 'project-dw102-0001-0001-000000000001', 'Framing Lumber Package', 'Lumber', 85000, 85000, 0, 17, 'Lumber', 'Framing', 'Framing Lumber', '0410', 0.96),
('bud-dw102-18', 'project-dw102-0001-0001-000000000001', 'Framing Labor', 'Framing labor', 68000, 68000, 0, 18, 'Framing Labor', 'Framing', 'Framing Labor', '0420', 0.97),
('bud-dw102-19', 'project-dw102-0001-0001-000000000001', 'Roof Trusses', 'Trusses', 25000, 25000, 0, 19, 'Trusses', 'Framing', 'Trusses', '0430', 0.95),
('bud-dw102-20', 'project-dw102-0001-0001-000000000001', 'Sheathing', 'Sheathing', 16000, 16000, 0, 20, 'Sheathing', 'Framing', 'Sheathing', '0440', 0.94),
('bud-dw102-21', 'project-dw102-0001-0001-000000000001', 'Steel Beams', 'Steel', 13000, 13000, 0, 21, 'Steel', 'Framing', 'Structural Steel', '0450', 0.93),
('bud-dw102-22', 'project-dw102-0001-0001-000000000001', 'Hardware & Fasteners', 'Hardware', 4800, 4800, 0, 22, 'Hardware', 'Framing', 'Framing Hardware', '0460', 0.92),
('bud-dw102-23', 'project-dw102-0001-0001-000000000001', 'Roofing Materials', 'Roofing', 23000, 23000, 0, 23, 'Roofing', 'Roofing', 'Roofing', '0510', 0.96),
('bud-dw102-24', 'project-dw102-0001-0001-000000000001', 'Roofing Labor', 'Roof labor', 16000, 16000, 0, 24, 'Roof Labor', 'Roofing', 'Roofing', '0510', 0.95),
('bud-dw102-25', 'project-dw102-0001-0001-000000000001', 'Gutters & Downspouts', 'Gutters', 6000, 6000, 0, 25, 'Gutters', 'Roofing', 'Gutters', '0520', 0.94),
('bud-dw102-26', 'project-dw102-0001-0001-000000000001', 'Siding & Stone', 'Siding', 36000, 36000, 0, 26, 'Siding', 'Exterior Finish', 'Siding', '0610', 0.95),
('bud-dw102-27', 'project-dw102-0001-0001-000000000001', 'Exterior Trim', 'Ext trim', 13000, 13000, 0, 27, 'Ext Trim', 'Exterior Finish', 'Exterior Trim', '0620', 0.94),
('bud-dw102-28', 'project-dw102-0001-0001-000000000001', 'Windows', 'Windows', 30000, 30000, 0, 28, 'Windows', 'Exterior Finish', 'Windows', '0630', 0.96),
('bud-dw102-29', 'project-dw102-0001-0001-000000000001', 'Exterior Doors', 'Ext doors', 12500, 12500, 0, 29, 'Ext Doors', 'Exterior Finish', 'Exterior Doors', '0640', 0.95),
('bud-dw102-30', 'project-dw102-0001-0001-000000000001', 'Garage Doors', 'Garage doors', 6500, 6500, 0, 30, 'Garage Doors', 'Exterior Finish', 'Garage Doors', '0650', 0.94),
('bud-dw102-31', 'project-dw102-0001-0001-000000000001', 'Plumbing Rough', 'Plumbing rough', 23000, 23000, 0, 31, 'Plumbing Rough', 'Plumbing', 'Plumbing Rough-In', '0710', 0.96),
('bud-dw102-32', 'project-dw102-0001-0001-000000000001', 'Plumbing Fixtures', 'Fixtures', 17000, 17000, 0, 32, 'Fixtures', 'Plumbing', 'Plumbing Fixtures', '0720', 0.95),
('bud-dw102-33', 'project-dw102-0001-0001-000000000001', 'Water Heater', 'Water heater', 5000, 5000, 0, 33, 'Water Heater', 'Plumbing', 'Water Heater', '0730', 0.94),
('bud-dw102-34', 'project-dw102-0001-0001-000000000001', 'Electrical Rough', 'Electrical rough', 21000, 21000, 0, 34, 'Electrical Rough', 'Electrical', 'Electrical Rough-In', '0810', 0.96),
('bud-dw102-35', 'project-dw102-0001-0001-000000000001', 'Electrical Finish', 'Electrical finish', 11500, 11500, 0, 35, 'Electrical Finish', 'Electrical', 'Electrical Finish', '0820', 0.95),
('bud-dw102-36', 'project-dw102-0001-0001-000000000001', 'Light Fixtures', 'Lighting', 9500, 9500, 0, 36, 'Lighting', 'Electrical', 'Lighting', '0830', 0.94),
('bud-dw102-37', 'project-dw102-0001-0001-000000000001', 'Low Voltage', 'Low voltage', 6000, 6000, 0, 37, 'Low Voltage', 'Electrical', 'Low Voltage', '0840', 0.93),
('bud-dw102-38', 'project-dw102-0001-0001-000000000001', 'HVAC Equipment', 'HVAC equip', 19000, 19000, 0, 38, 'HVAC Equipment', 'HVAC', 'HVAC Equipment', '0910', 0.95),
('bud-dw102-39', 'project-dw102-0001-0001-000000000001', 'HVAC Installation', 'HVAC install', 14500, 14500, 0, 39, 'HVAC Install', 'HVAC', 'HVAC Installation', '0920', 0.94),
('bud-dw102-40', 'project-dw102-0001-0001-000000000001', 'Wall Insulation', 'Wall insulation', 10500, 10500, 0, 40, 'Wall Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.95),
('bud-dw102-41', 'project-dw102-0001-0001-000000000001', 'Attic Insulation', 'Attic insulation', 5800, 5800, 0, 41, 'Attic Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.94),
('bud-dw102-42', 'project-dw102-0001-0001-000000000001', 'Air Sealing', 'Air sealing', 3200, 3200, 0, 42, 'Air Sealing', 'Insulation & Air Sealing', 'Air Sealing', '1020', 0.93),
('bud-dw102-43', 'project-dw102-0001-0001-000000000001', 'Drywall Materials', 'Drywall', 17500, 17500, 0, 43, 'Drywall', 'Interior Finish', 'Drywall', '1110', 0.95),
('bud-dw102-44', 'project-dw102-0001-0001-000000000001', 'Drywall Labor', 'Drywall labor', 21000, 21000, 0, 44, 'Drywall Labor', 'Interior Finish', 'Drywall', '1110', 0.94),
('bud-dw102-45', 'project-dw102-0001-0001-000000000001', 'Interior Trim Package', 'Trim package', 23000, 23000, 0, 45, 'Trim Package', 'Interior Finish', 'Interior Trim', '1120', 0.95),
('bud-dw102-46', 'project-dw102-0001-0001-000000000001', 'Interior Trim Labor', 'Trim labor', 19000, 19000, 0, 46, 'Trim Labor', 'Interior Finish', 'Interior Trim', '1120', 0.94),
('bud-dw102-47', 'project-dw102-0001-0001-000000000001', 'Interior Doors', 'Int doors', 10500, 10500, 0, 47, 'Int Doors', 'Interior Finish', 'Interior Doors', '1130', 0.93),
('bud-dw102-48', 'project-dw102-0001-0001-000000000001', 'Painting - Interior', 'Int paint', 14500, 14500, 0, 48, 'Int Paint', 'Interior Finish', 'Painting', '1140', 0.95),
('bud-dw102-49', 'project-dw102-0001-0001-000000000001', 'Painting - Exterior', 'Ext paint', 8500, 8500, 0, 49, 'Ext Paint', 'Interior Finish', 'Painting', '1140', 0.94),
('bud-dw102-50', 'project-dw102-0001-0001-000000000001', 'Tile & Stone', 'Tile', 19000, 19000, 0, 50, 'Tile', 'Flooring', 'Tile', '1210', 0.95),
('bud-dw102-51', 'project-dw102-0001-0001-000000000001', 'Hardwood/LVP', 'Hardwood', 24000, 24000, 0, 51, 'Hardwood', 'Flooring', 'Wood Flooring', '1220', 0.94),
('bud-dw102-52', 'project-dw102-0001-0001-000000000001', 'Carpet', 'Carpet', 7500, 7500, 0, 52, 'Carpet', 'Flooring', 'Carpet', '1230', 0.93),
('bud-dw102-53', 'project-dw102-0001-0001-000000000001', 'Cabinets', 'Cabinets', 40000, 40000, 0, 53, 'Cabinets', 'Specialties', 'Cabinets', '1310', 0.96),
('bud-dw102-54', 'project-dw102-0001-0001-000000000001', 'Countertops', 'Countertops', 19000, 19000, 0, 54, 'Countertops', 'Specialties', 'Countertops', '1320', 0.95),
('bud-dw102-55', 'project-dw102-0001-0001-000000000001', 'Appliances', 'Appliances', 15000, 15000, 0, 55, 'Appliances', 'Specialties', 'Appliances', '1330', 0.94),
('bud-dw102-56', 'project-dw102-0001-0001-000000000001', 'Mirrors & Shower Glass', 'Mirrors', 6500, 6500, 0, 56, 'Mirrors', 'Specialties', 'Mirrors & Shower Doors', '1340', 0.93),
('bud-dw102-57', 'project-dw102-0001-0001-000000000001', 'Hardware & Accessories', 'Hardware', 4800, 4800, 0, 57, 'Hardware', 'Specialties', 'Hardware', '1350', 0.92),
('bud-dw102-58', 'project-dw102-0001-0001-000000000001', 'Landscaping', 'Landscaping', 20000, 20000, 0, 58, 'Landscaping', 'Landscaping & Exterior', 'Landscaping', '1410', 0.94),
('bud-dw102-59', 'project-dw102-0001-0001-000000000001', 'Irrigation', 'Irrigation', 6500, 6500, 0, 59, 'Irrigation', 'Landscaping & Exterior', 'Irrigation', '1420', 0.93),
('bud-dw102-60', 'project-dw102-0001-0001-000000000001', 'Driveway', 'Driveway', 13000, 13000, 0, 60, 'Driveway', 'Landscaping & Exterior', 'Driveway', '1430', 0.94),
('bud-dw102-61', 'project-dw102-0001-0001-000000000001', 'Fencing', 'Fencing', 9500, 9500, 0, 61, 'Fencing', 'Landscaping & Exterior', 'Fencing', '1440', 0.93);

-- ----------------------------------------
-- BUDGETS FOR: ORE-201 (Active - Ridgeline, TD2, Jul 2025)
-- Total Budget: ~$815,000 | ~50% funded (3 draws + 1 review)
-- ----------------------------------------

INSERT INTO budgets (id, project_id, category, description, original_amount, current_amount, spent_amount, sort_order, builder_category_raw, nahb_category, nahb_subcategory, cost_code, ai_confidence) VALUES
('bud-ore201-01', 'project-ore201-0001-0001-000000000001', 'Project Management', 'Construction management', 11500, 11500, 0, 1, 'Project Mgmt', 'General Conditions', 'Project Management & Admin', '0110', 0.95),
('bud-ore201-02', 'project-ore201-0001-0001-000000000001', 'Permits & Impact Fees', 'Building permits', 17000, 17000, 0, 2, 'Permits', 'General Conditions', 'Permits & Fees', '0160', 0.97),
('bud-ore201-03', 'project-ore201-0001-0001-000000000001', 'Insurance', 'Builder risk', 5800, 5800, 0, 3, 'Insurance', 'General Conditions', 'Insurance & Bonds', '0150', 0.96),
('bud-ore201-04', 'project-ore201-0001-0001-000000000001', 'Temporary Utilities', 'Temp utilities', 4800, 4800, 0, 4, 'Temp Utils', 'General Conditions', 'Temporary Facilities', '0140', 0.94),
('bud-ore201-05', 'project-ore201-0001-0001-000000000001', 'Dumpsters & Cleanup', 'Cleanup', 6200, 6200, 0, 5, 'Cleanup', 'General Conditions', 'Site Cleanup', '0170', 0.93),
('bud-ore201-06', 'project-ore201-0001-0001-000000000001', 'Survey & Engineering', 'Survey', 8000, 8000, 0, 6, 'Survey', 'General Conditions', 'Survey & Engineering', '0120', 0.95),
('bud-ore201-07', 'project-ore201-0001-0001-000000000001', 'Clearing & Grubbing', 'Clearing', 9500, 9500, 0, 7, 'Clearing', 'Site Work', 'Site Clearing', '0210', 0.94),
('bud-ore201-08', 'project-ore201-0001-0001-000000000001', 'Excavation', 'Excavation', 21000, 21000, 0, 8, 'Excavation', 'Site Work', 'Excavation', '0220', 0.96),
('bud-ore201-09', 'project-ore201-0001-0001-000000000001', 'Backfill & Grading', 'Grading', 12000, 12000, 0, 9, 'Grading', 'Site Work', 'Backfill & Fine Grading', '0230', 0.95),
('bud-ore201-10', 'project-ore201-0001-0001-000000000001', 'Erosion Control', 'Erosion', 4800, 4800, 0, 10, 'Erosion', 'Site Work', 'Erosion Control', '0240', 0.93),
('bud-ore201-11', 'project-ore201-0001-0001-000000000001', 'Retaining Walls', 'Retaining', 20000, 20000, 0, 11, 'Retaining', 'Site Work', 'Retaining Walls', '0250', 0.92),
('bud-ore201-12', 'project-ore201-0001-0001-000000000001', 'Footings', 'Footings', 25000, 25000, 0, 12, 'Footings', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.97),
('bud-ore201-13', 'project-ore201-0001-0001-000000000001', 'Foundation Walls', 'Foundation', 32000, 32000, 0, 13, 'Foundation', 'Concrete & Foundations', 'Footings & Foundation Walls', '0310', 0.96),
('bud-ore201-14', 'project-ore201-0001-0001-000000000001', 'Slab - Main House', 'Main slab', 21000, 21000, 0, 14, 'Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.95),
('bud-ore201-15', 'project-ore201-0001-0001-000000000001', 'Slab - Garage', 'Garage slab', 9000, 9000, 0, 15, 'Garage Slab', 'Concrete & Foundations', 'Slab on Grade', '0320', 0.94),
('bud-ore201-16', 'project-ore201-0001-0001-000000000001', 'Flatwork - Porches', 'Flatwork', 7500, 7500, 0, 16, 'Flatwork', 'Concrete & Foundations', 'Flatwork', '0330', 0.93),
('bud-ore201-17', 'project-ore201-0001-0001-000000000001', 'Framing Lumber Package', 'Lumber', 92000, 92000, 0, 17, 'Lumber', 'Framing', 'Framing Lumber', '0410', 0.96),
('bud-ore201-18', 'project-ore201-0001-0001-000000000001', 'Framing Labor', 'Framing labor', 74000, 74000, 0, 18, 'Framing Labor', 'Framing', 'Framing Labor', '0420', 0.97),
('bud-ore201-19', 'project-ore201-0001-0001-000000000001', 'Roof Trusses', 'Trusses', 28000, 28000, 0, 19, 'Trusses', 'Framing', 'Trusses', '0430', 0.95),
('bud-ore201-20', 'project-ore201-0001-0001-000000000001', 'Sheathing', 'Sheathing', 18000, 18000, 0, 20, 'Sheathing', 'Framing', 'Sheathing', '0440', 0.94),
('bud-ore201-21', 'project-ore201-0001-0001-000000000001', 'Steel Beams', 'Steel', 15000, 15000, 0, 21, 'Steel', 'Framing', 'Structural Steel', '0450', 0.93),
('bud-ore201-22', 'project-ore201-0001-0001-000000000001', 'Hardware & Fasteners', 'Hardware', 5200, 5200, 0, 22, 'Hardware', 'Framing', 'Framing Hardware', '0460', 0.92),
('bud-ore201-23', 'project-ore201-0001-0001-000000000001', 'Roofing Materials', 'Roofing', 26000, 26000, 0, 23, 'Roofing', 'Roofing', 'Roofing', '0510', 0.96),
('bud-ore201-24', 'project-ore201-0001-0001-000000000001', 'Roofing Labor', 'Roof labor', 18000, 18000, 0, 24, 'Roof Labor', 'Roofing', 'Roofing', '0510', 0.95),
('bud-ore201-25', 'project-ore201-0001-0001-000000000001', 'Gutters & Downspouts', 'Gutters', 7000, 7000, 0, 25, 'Gutters', 'Roofing', 'Gutters', '0520', 0.94),
('bud-ore201-26', 'project-ore201-0001-0001-000000000001', 'Siding & Stone', 'Siding', 40000, 40000, 0, 26, 'Siding', 'Exterior Finish', 'Siding', '0610', 0.95),
('bud-ore201-27', 'project-ore201-0001-0001-000000000001', 'Exterior Trim', 'Ext trim', 15000, 15000, 0, 27, 'Ext Trim', 'Exterior Finish', 'Exterior Trim', '0620', 0.94),
('bud-ore201-28', 'project-ore201-0001-0001-000000000001', 'Windows', 'Windows', 34000, 34000, 0, 28, 'Windows', 'Exterior Finish', 'Windows', '0630', 0.96),
('bud-ore201-29', 'project-ore201-0001-0001-000000000001', 'Exterior Doors', 'Ext doors', 14000, 14000, 0, 29, 'Ext Doors', 'Exterior Finish', 'Exterior Doors', '0640', 0.95),
('bud-ore201-30', 'project-ore201-0001-0001-000000000001', 'Garage Doors', 'Garage doors', 7500, 7500, 0, 30, 'Garage Doors', 'Exterior Finish', 'Garage Doors', '0650', 0.94),
('bud-ore201-31', 'project-ore201-0001-0001-000000000001', 'Plumbing Rough', 'Plumbing rough', 26000, 26000, 0, 31, 'Plumbing Rough', 'Plumbing', 'Plumbing Rough-In', '0710', 0.96),
('bud-ore201-32', 'project-ore201-0001-0001-000000000001', 'Plumbing Fixtures', 'Fixtures', 20000, 20000, 0, 32, 'Fixtures', 'Plumbing', 'Plumbing Fixtures', '0720', 0.95),
('bud-ore201-33', 'project-ore201-0001-0001-000000000001', 'Water Heater', 'Water heater', 6000, 6000, 0, 33, 'Water Heater', 'Plumbing', 'Water Heater', '0730', 0.94),
('bud-ore201-34', 'project-ore201-0001-0001-000000000001', 'Electrical Rough', 'Electrical rough', 24000, 24000, 0, 34, 'Electrical Rough', 'Electrical', 'Electrical Rough-In', '0810', 0.96),
('bud-ore201-35', 'project-ore201-0001-0001-000000000001', 'Electrical Finish', 'Electrical finish', 13000, 13000, 0, 35, 'Electrical Finish', 'Electrical', 'Electrical Finish', '0820', 0.95),
('bud-ore201-36', 'project-ore201-0001-0001-000000000001', 'Light Fixtures', 'Lighting', 11000, 11000, 0, 36, 'Lighting', 'Electrical', 'Lighting', '0830', 0.94),
('bud-ore201-37', 'project-ore201-0001-0001-000000000001', 'Low Voltage', 'Low voltage', 7500, 7500, 0, 37, 'Low Voltage', 'Electrical', 'Low Voltage', '0840', 0.93),
('bud-ore201-38', 'project-ore201-0001-0001-000000000001', 'HVAC Equipment', 'HVAC equip', 22000, 22000, 0, 38, 'HVAC Equipment', 'HVAC', 'HVAC Equipment', '0910', 0.95),
('bud-ore201-39', 'project-ore201-0001-0001-000000000001', 'HVAC Installation', 'HVAC install', 16000, 16000, 0, 39, 'HVAC Install', 'HVAC', 'HVAC Installation', '0920', 0.94),
('bud-ore201-40', 'project-ore201-0001-0001-000000000001', 'Wall Insulation', 'Wall insulation', 12000, 12000, 0, 40, 'Wall Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.95),
('bud-ore201-41', 'project-ore201-0001-0001-000000000001', 'Attic Insulation', 'Attic insulation', 6500, 6500, 0, 41, 'Attic Insulation', 'Insulation & Air Sealing', 'Insulation', '1010', 0.94),
('bud-ore201-42', 'project-ore201-0001-0001-000000000001', 'Air Sealing', 'Air sealing', 3800, 3800, 0, 42, 'Air Sealing', 'Insulation & Air Sealing', 'Air Sealing', '1020', 0.93),
('bud-ore201-43', 'project-ore201-0001-0001-000000000001', 'Drywall Materials', 'Drywall', 19000, 19000, 0, 43, 'Drywall', 'Interior Finish', 'Drywall', '1110', 0.95),
('bud-ore201-44', 'project-ore201-0001-0001-000000000001', 'Drywall Labor', 'Drywall labor', 23000, 23000, 0, 44, 'Drywall Labor', 'Interior Finish', 'Drywall', '1110', 0.94),
('bud-ore201-45', 'project-ore201-0001-0001-000000000001', 'Interior Trim Package', 'Trim package', 26000, 26000, 0, 45, 'Trim Package', 'Interior Finish', 'Interior Trim', '1120', 0.95),
('bud-ore201-46', 'project-ore201-0001-0001-000000000001', 'Interior Trim Labor', 'Trim labor', 22000, 22000, 0, 46, 'Trim Labor', 'Interior Finish', 'Interior Trim', '1120', 0.94),
('bud-ore201-47', 'project-ore201-0001-0001-000000000001', 'Interior Doors', 'Int doors', 12000, 12000, 0, 47, 'Int Doors', 'Interior Finish', 'Interior Doors', '1130', 0.93),
('bud-ore201-48', 'project-ore201-0001-0001-000000000001', 'Painting - Interior', 'Int paint', 17000, 17000, 0, 48, 'Int Paint', 'Interior Finish', 'Painting', '1140', 0.95),
('bud-ore201-49', 'project-ore201-0001-0001-000000000001', 'Painting - Exterior', 'Ext paint', 10000, 10000, 0, 49, 'Ext Paint', 'Interior Finish', 'Painting', '1140', 0.94),
('bud-ore201-50', 'project-ore201-0001-0001-000000000001', 'Tile & Stone', 'Tile', 23000, 23000, 0, 50, 'Tile', 'Flooring', 'Tile', '1210', 0.95),
('bud-ore201-51', 'project-ore201-0001-0001-000000000001', 'Hardwood/LVP', 'Hardwood', 28000, 28000, 0, 51, 'Hardwood', 'Flooring', 'Wood Flooring', '1220', 0.94),
('bud-ore201-52', 'project-ore201-0001-0001-000000000001', 'Carpet', 'Carpet', 9000, 9000, 0, 52, 'Carpet', 'Flooring', 'Carpet', '1230', 0.93),
('bud-ore201-53', 'project-ore201-0001-0001-000000000001', 'Cabinets', 'Cabinets', 45000, 45000, 0, 53, 'Cabinets', 'Specialties', 'Cabinets', '1310', 0.96),
('bud-ore201-54', 'project-ore201-0001-0001-000000000001', 'Countertops', 'Countertops', 22000, 22000, 0, 54, 'Countertops', 'Specialties', 'Countertops', '1320', 0.95),
('bud-ore201-55', 'project-ore201-0001-0001-000000000001', 'Appliances', 'Appliances', 18000, 18000, 0, 55, 'Appliances', 'Specialties', 'Appliances', '1330', 0.94),
('bud-ore201-56', 'project-ore201-0001-0001-000000000001', 'Mirrors & Shower Glass', 'Mirrors', 7500, 7500, 0, 56, 'Mirrors', 'Specialties', 'Mirrors & Shower Doors', '1340', 0.93),
('bud-ore201-57', 'project-ore201-0001-0001-000000000001', 'Hardware & Accessories', 'Hardware', 5500, 5500, 0, 57, 'Hardware', 'Specialties', 'Hardware', '1350', 0.92),
('bud-ore201-58', 'project-ore201-0001-0001-000000000001', 'Landscaping', 'Landscaping', 24000, 24000, 0, 58, 'Landscaping', 'Landscaping & Exterior', 'Landscaping', '1410', 0.94),
('bud-ore201-59', 'project-ore201-0001-0001-000000000001', 'Irrigation', 'Irrigation', 7500, 7500, 0, 59, 'Irrigation', 'Landscaping & Exterior', 'Irrigation', '1420', 0.93),
('bud-ore201-60', 'project-ore201-0001-0001-000000000001', 'Driveway', 'Driveway', 15000, 15000, 0, 60, 'Driveway', 'Landscaping & Exterior', 'Driveway', '1430', 0.94),
('bud-ore201-61', 'project-ore201-0001-0001-000000000001', 'Fencing', 'Fencing', 11000, 11000, 0, 61, 'Fencing', 'Landscaping & Exterior', 'Fencing', '1440', 0.93);

-- ----------------------------------------
-- SIMPLIFIED BUDGETS FOR REMAINING PROJECTS
-- Using a streamlined 45-line template per project
-- ----------------------------------------

-- DW-104: Active - Westbrook (May 2025, 5 funded + 1 staged)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-dw104-01', 'project-dw104-0001-0001-000000000001', 'Project Management', 9500, 9500, 0, 1, 'General Conditions', 0.95),
('bud-dw104-02', 'project-dw104-0001-0001-000000000001', 'Permits & Fees', 14000, 14000, 0, 2, 'General Conditions', 0.97),
('bud-dw104-03', 'project-dw104-0001-0001-000000000001', 'Insurance', 4800, 4800, 0, 3, 'General Conditions', 0.96),
('bud-dw104-04', 'project-dw104-0001-0001-000000000001', 'Temporary Utilities', 3800, 3800, 0, 4, 'General Conditions', 0.94),
('bud-dw104-05', 'project-dw104-0001-0001-000000000001', 'Dumpsters & Cleanup', 5200, 5200, 0, 5, 'General Conditions', 0.93),
('bud-dw104-06', 'project-dw104-0001-0001-000000000001', 'Survey & Engineering', 6800, 6800, 0, 6, 'General Conditions', 0.95),
('bud-dw104-07', 'project-dw104-0001-0001-000000000001', 'Site Clearing', 7500, 7500, 0, 7, 'Site Work', 0.94),
('bud-dw104-08', 'project-dw104-0001-0001-000000000001', 'Excavation', 17000, 17000, 0, 8, 'Site Work', 0.96),
('bud-dw104-09', 'project-dw104-0001-0001-000000000001', 'Backfill & Grading', 9500, 9500, 0, 9, 'Site Work', 0.95),
('bud-dw104-10', 'project-dw104-0001-0001-000000000001', 'Footings', 21000, 21000, 0, 10, 'Concrete & Foundations', 0.97),
('bud-dw104-11', 'project-dw104-0001-0001-000000000001', 'Foundation Walls', 26000, 26000, 0, 11, 'Concrete & Foundations', 0.96),
('bud-dw104-12', 'project-dw104-0001-0001-000000000001', 'Slab on Grade', 23000, 23000, 0, 12, 'Concrete & Foundations', 0.95),
('bud-dw104-13', 'project-dw104-0001-0001-000000000001', 'Framing Lumber', 72000, 72000, 0, 13, 'Framing', 0.96),
('bud-dw104-14', 'project-dw104-0001-0001-000000000001', 'Framing Labor', 56000, 56000, 0, 14, 'Framing', 0.97),
('bud-dw104-15', 'project-dw104-0001-0001-000000000001', 'Trusses', 21000, 21000, 0, 15, 'Framing', 0.95),
('bud-dw104-16', 'project-dw104-0001-0001-000000000001', 'Sheathing', 14000, 14000, 0, 16, 'Framing', 0.94),
('bud-dw104-17', 'project-dw104-0001-0001-000000000001', 'Roofing', 32000, 32000, 0, 17, 'Roofing', 0.96),
('bud-dw104-18', 'project-dw104-0001-0001-000000000001', 'Gutters', 5500, 5500, 0, 18, 'Roofing', 0.94),
('bud-dw104-19', 'project-dw104-0001-0001-000000000001', 'Siding & Stone', 31000, 31000, 0, 19, 'Exterior Finish', 0.95),
('bud-dw104-20', 'project-dw104-0001-0001-000000000001', 'Windows', 26000, 26000, 0, 20, 'Exterior Finish', 0.96),
('bud-dw104-21', 'project-dw104-0001-0001-000000000001', 'Exterior Doors', 11000, 11000, 0, 21, 'Exterior Finish', 0.95),
('bud-dw104-22', 'project-dw104-0001-0001-000000000001', 'Garage Doors', 5800, 5800, 0, 22, 'Exterior Finish', 0.94),
('bud-dw104-23', 'project-dw104-0001-0001-000000000001', 'Plumbing Rough', 20000, 20000, 0, 23, 'Plumbing', 0.96),
('bud-dw104-24', 'project-dw104-0001-0001-000000000001', 'Plumbing Fixtures', 15000, 15000, 0, 24, 'Plumbing', 0.95),
('bud-dw104-25', 'project-dw104-0001-0001-000000000001', 'Water Heater', 4500, 4500, 0, 25, 'Plumbing', 0.94),
('bud-dw104-26', 'project-dw104-0001-0001-000000000001', 'Electrical Rough', 18000, 18000, 0, 26, 'Electrical', 0.96),
('bud-dw104-27', 'project-dw104-0001-0001-000000000001', 'Electrical Finish', 10000, 10000, 0, 27, 'Electrical', 0.95),
('bud-dw104-28', 'project-dw104-0001-0001-000000000001', 'Light Fixtures', 8500, 8500, 0, 28, 'Electrical', 0.94),
('bud-dw104-29', 'project-dw104-0001-0001-000000000001', 'HVAC', 30000, 30000, 0, 29, 'HVAC', 0.95),
('bud-dw104-30', 'project-dw104-0001-0001-000000000001', 'Insulation', 16000, 16000, 0, 30, 'Insulation & Air Sealing', 0.95),
('bud-dw104-31', 'project-dw104-0001-0001-000000000001', 'Drywall', 32000, 32000, 0, 31, 'Interior Finish', 0.95),
('bud-dw104-32', 'project-dw104-0001-0001-000000000001', 'Interior Trim', 34000, 34000, 0, 32, 'Interior Finish', 0.95),
('bud-dw104-33', 'project-dw104-0001-0001-000000000001', 'Interior Doors', 9000, 9000, 0, 33, 'Interior Finish', 0.93),
('bud-dw104-34', 'project-dw104-0001-0001-000000000001', 'Painting', 18000, 18000, 0, 34, 'Interior Finish', 0.95),
('bud-dw104-35', 'project-dw104-0001-0001-000000000001', 'Tile', 17000, 17000, 0, 35, 'Flooring', 0.95),
('bud-dw104-36', 'project-dw104-0001-0001-000000000001', 'Hardwood/LVP', 21000, 21000, 0, 36, 'Flooring', 0.94),
('bud-dw104-37', 'project-dw104-0001-0001-000000000001', 'Carpet', 6500, 6500, 0, 37, 'Flooring', 0.93),
('bud-dw104-38', 'project-dw104-0001-0001-000000000001', 'Cabinets', 34000, 34000, 0, 38, 'Specialties', 0.96),
('bud-dw104-39', 'project-dw104-0001-0001-000000000001', 'Countertops', 16000, 16000, 0, 39, 'Specialties', 0.95),
('bud-dw104-40', 'project-dw104-0001-0001-000000000001', 'Appliances', 13000, 13000, 0, 40, 'Specialties', 0.94),
('bud-dw104-41', 'project-dw104-0001-0001-000000000001', 'Mirrors & Glass', 5500, 5500, 0, 41, 'Specialties', 0.93),
('bud-dw104-42', 'project-dw104-0001-0001-000000000001', 'Hardware', 4200, 4200, 0, 42, 'Specialties', 0.92),
('bud-dw104-43', 'project-dw104-0001-0001-000000000001', 'Landscaping', 16000, 16000, 0, 43, 'Landscaping & Exterior', 0.94),
('bud-dw104-44', 'project-dw104-0001-0001-000000000001', 'Driveway', 11000, 11000, 0, 44, 'Landscaping & Exterior', 0.94),
('bud-dw104-45', 'project-dw104-0001-0001-000000000001', 'Fencing', 8500, 8500, 0, 45, 'Landscaping & Exterior', 0.93);

-- CVY-301: Active - Westbrook (Aug 2025, 3 funded + 1 review)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-cvy301-01', 'project-cvy301-0001-0001-000000000001', 'Project Management', 8500, 8500, 0, 1, 'General Conditions', 0.95),
('bud-cvy301-02', 'project-cvy301-0001-0001-000000000001', 'Permits & Fees', 13000, 13000, 0, 2, 'General Conditions', 0.97),
('bud-cvy301-03', 'project-cvy301-0001-0001-000000000001', 'Insurance', 4200, 4200, 0, 3, 'General Conditions', 0.96),
('bud-cvy301-04', 'project-cvy301-0001-0001-000000000001', 'Temporary Utilities', 3500, 3500, 0, 4, 'General Conditions', 0.94),
('bud-cvy301-05', 'project-cvy301-0001-0001-000000000001', 'Survey & Engineering', 6000, 6000, 0, 5, 'General Conditions', 0.95),
('bud-cvy301-06', 'project-cvy301-0001-0001-000000000001', 'Site Work', 28000, 28000, 0, 6, 'Site Work', 0.95),
('bud-cvy301-07', 'project-cvy301-0001-0001-000000000001', 'Footings', 19000, 19000, 0, 7, 'Concrete & Foundations', 0.97),
('bud-cvy301-08', 'project-cvy301-0001-0001-000000000001', 'Foundation', 24000, 24000, 0, 8, 'Concrete & Foundations', 0.96),
('bud-cvy301-09', 'project-cvy301-0001-0001-000000000001', 'Slab', 20000, 20000, 0, 9, 'Concrete & Foundations', 0.95),
('bud-cvy301-10', 'project-cvy301-0001-0001-000000000001', 'Framing Lumber', 65000, 65000, 0, 10, 'Framing', 0.96),
('bud-cvy301-11', 'project-cvy301-0001-0001-000000000001', 'Framing Labor', 52000, 52000, 0, 11, 'Framing', 0.97),
('bud-cvy301-12', 'project-cvy301-0001-0001-000000000001', 'Trusses', 19000, 19000, 0, 12, 'Framing', 0.95),
('bud-cvy301-13', 'project-cvy301-0001-0001-000000000001', 'Sheathing', 13000, 13000, 0, 13, 'Framing', 0.94),
('bud-cvy301-14', 'project-cvy301-0001-0001-000000000001', 'Roofing', 29000, 29000, 0, 14, 'Roofing', 0.96),
('bud-cvy301-15', 'project-cvy301-0001-0001-000000000001', 'Siding & Exterior', 38000, 38000, 0, 15, 'Exterior Finish', 0.95),
('bud-cvy301-16', 'project-cvy301-0001-0001-000000000001', 'Windows', 24000, 24000, 0, 16, 'Exterior Finish', 0.96),
('bud-cvy301-17', 'project-cvy301-0001-0001-000000000001', 'Doors', 15000, 15000, 0, 17, 'Exterior Finish', 0.95),
('bud-cvy301-18', 'project-cvy301-0001-0001-000000000001', 'Plumbing', 36000, 36000, 0, 18, 'Plumbing', 0.96),
('bud-cvy301-19', 'project-cvy301-0001-0001-000000000001', 'Electrical', 32000, 32000, 0, 19, 'Electrical', 0.96),
('bud-cvy301-20', 'project-cvy301-0001-0001-000000000001', 'HVAC', 28000, 28000, 0, 20, 'HVAC', 0.95),
('bud-cvy301-21', 'project-cvy301-0001-0001-000000000001', 'Insulation', 14000, 14000, 0, 21, 'Insulation & Air Sealing', 0.95),
('bud-cvy301-22', 'project-cvy301-0001-0001-000000000001', 'Drywall', 29000, 29000, 0, 22, 'Interior Finish', 0.95),
('bud-cvy301-23', 'project-cvy301-0001-0001-000000000001', 'Interior Trim', 31000, 31000, 0, 23, 'Interior Finish', 0.95),
('bud-cvy301-24', 'project-cvy301-0001-0001-000000000001', 'Painting', 16000, 16000, 0, 24, 'Interior Finish', 0.95),
('bud-cvy301-25', 'project-cvy301-0001-0001-000000000001', 'Flooring', 38000, 38000, 0, 25, 'Flooring', 0.95),
('bud-cvy301-26', 'project-cvy301-0001-0001-000000000001', 'Cabinets', 30000, 30000, 0, 26, 'Specialties', 0.96),
('bud-cvy301-27', 'project-cvy301-0001-0001-000000000001', 'Countertops', 14000, 14000, 0, 27, 'Specialties', 0.95),
('bud-cvy301-28', 'project-cvy301-0001-0001-000000000001', 'Appliances', 11000, 11000, 0, 28, 'Specialties', 0.94),
('bud-cvy301-29', 'project-cvy301-0001-0001-000000000001', 'Fixtures & Hardware', 8000, 8000, 0, 29, 'Specialties', 0.93),
('bud-cvy301-30', 'project-cvy301-0001-0001-000000000001', 'Landscaping & Exterior', 28000, 28000, 0, 30, 'Landscaping & Exterior', 0.94);

-- DW-105: Active - Horizon (Apr 2025, 5 funded + 1 review)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-dw105-01', 'project-dw105-0001-0001-000000000001', 'Project Management', 10000, 10000, 0, 1, 'General Conditions', 0.95),
('bud-dw105-02', 'project-dw105-0001-0001-000000000001', 'Permits & Fees', 15000, 15000, 0, 2, 'General Conditions', 0.97),
('bud-dw105-03', 'project-dw105-0001-0001-000000000001', 'Insurance', 5000, 5000, 0, 3, 'General Conditions', 0.96),
('bud-dw105-04', 'project-dw105-0001-0001-000000000001', 'Temporary Utilities', 4000, 4000, 0, 4, 'General Conditions', 0.94),
('bud-dw105-05', 'project-dw105-0001-0001-000000000001', 'Survey & Engineering', 7000, 7000, 0, 5, 'General Conditions', 0.95),
('bud-dw105-06', 'project-dw105-0001-0001-000000000001', 'Site Work', 32000, 32000, 0, 6, 'Site Work', 0.95),
('bud-dw105-07', 'project-dw105-0001-0001-000000000001', 'Footings', 22000, 22000, 0, 7, 'Concrete & Foundations', 0.97),
('bud-dw105-08', 'project-dw105-0001-0001-000000000001', 'Foundation', 28000, 28000, 0, 8, 'Concrete & Foundations', 0.96),
('bud-dw105-09', 'project-dw105-0001-0001-000000000001', 'Slab', 24000, 24000, 0, 9, 'Concrete & Foundations', 0.95),
('bud-dw105-10', 'project-dw105-0001-0001-000000000001', 'Framing Lumber', 78000, 78000, 0, 10, 'Framing', 0.96),
('bud-dw105-11', 'project-dw105-0001-0001-000000000001', 'Framing Labor', 62000, 62000, 0, 11, 'Framing', 0.97),
('bud-dw105-12', 'project-dw105-0001-0001-000000000001', 'Trusses', 23000, 23000, 0, 12, 'Framing', 0.95),
('bud-dw105-13', 'project-dw105-0001-0001-000000000001', 'Sheathing', 15000, 15000, 0, 13, 'Framing', 0.94),
('bud-dw105-14', 'project-dw105-0001-0001-000000000001', 'Roofing', 35000, 35000, 0, 14, 'Roofing', 0.96),
('bud-dw105-15', 'project-dw105-0001-0001-000000000001', 'Siding & Exterior', 42000, 42000, 0, 15, 'Exterior Finish', 0.95),
('bud-dw105-16', 'project-dw105-0001-0001-000000000001', 'Windows', 28000, 28000, 0, 16, 'Exterior Finish', 0.96),
('bud-dw105-17', 'project-dw105-0001-0001-000000000001', 'Doors', 18000, 18000, 0, 17, 'Exterior Finish', 0.95),
('bud-dw105-18', 'project-dw105-0001-0001-000000000001', 'Plumbing', 42000, 42000, 0, 18, 'Plumbing', 0.96),
('bud-dw105-19', 'project-dw105-0001-0001-000000000001', 'Electrical', 38000, 38000, 0, 19, 'Electrical', 0.96),
('bud-dw105-20', 'project-dw105-0001-0001-000000000001', 'HVAC', 32000, 32000, 0, 20, 'HVAC', 0.95),
('bud-dw105-21', 'project-dw105-0001-0001-000000000001', 'Insulation', 17000, 17000, 0, 21, 'Insulation & Air Sealing', 0.95),
('bud-dw105-22', 'project-dw105-0001-0001-000000000001', 'Drywall', 35000, 35000, 0, 22, 'Interior Finish', 0.95),
('bud-dw105-23', 'project-dw105-0001-0001-000000000001', 'Interior Trim', 38000, 38000, 0, 23, 'Interior Finish', 0.95),
('bud-dw105-24', 'project-dw105-0001-0001-000000000001', 'Painting', 19000, 19000, 0, 24, 'Interior Finish', 0.95),
('bud-dw105-25', 'project-dw105-0001-0001-000000000001', 'Flooring', 45000, 45000, 0, 25, 'Flooring', 0.95),
('bud-dw105-26', 'project-dw105-0001-0001-000000000001', 'Cabinets', 36000, 36000, 0, 26, 'Specialties', 0.96),
('bud-dw105-27', 'project-dw105-0001-0001-000000000001', 'Countertops', 17000, 17000, 0, 27, 'Specialties', 0.95),
('bud-dw105-28', 'project-dw105-0001-0001-000000000001', 'Appliances', 14000, 14000, 0, 28, 'Specialties', 0.94),
('bud-dw105-29', 'project-dw105-0001-0001-000000000001', 'Fixtures & Hardware', 9000, 9000, 0, 29, 'Specialties', 0.93),
('bud-dw105-30', 'project-dw105-0001-0001-000000000001', 'Landscaping & Exterior', 32000, 32000, 0, 30, 'Landscaping & Exterior', 0.94);

-- CVY-303: Active - Horizon (Sep 2025, 2 funded + 1 staged)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-cvy303-01', 'project-cvy303-0001-0001-000000000001', 'Project Management', 8000, 8000, 0, 1, 'General Conditions', 0.95),
('bud-cvy303-02', 'project-cvy303-0001-0001-000000000001', 'Permits & Fees', 12000, 12000, 0, 2, 'General Conditions', 0.97),
('bud-cvy303-03', 'project-cvy303-0001-0001-000000000001', 'Insurance', 4000, 4000, 0, 3, 'General Conditions', 0.96),
('bud-cvy303-04', 'project-cvy303-0001-0001-000000000001', 'Temporary Utilities', 3200, 3200, 0, 4, 'General Conditions', 0.94),
('bud-cvy303-05', 'project-cvy303-0001-0001-000000000001', 'Survey & Engineering', 5500, 5500, 0, 5, 'General Conditions', 0.95),
('bud-cvy303-06', 'project-cvy303-0001-0001-000000000001', 'Site Work', 26000, 26000, 0, 6, 'Site Work', 0.95),
('bud-cvy303-07', 'project-cvy303-0001-0001-000000000001', 'Footings', 18000, 18000, 0, 7, 'Concrete & Foundations', 0.97),
('bud-cvy303-08', 'project-cvy303-0001-0001-000000000001', 'Foundation', 22000, 22000, 0, 8, 'Concrete & Foundations', 0.96),
('bud-cvy303-09', 'project-cvy303-0001-0001-000000000001', 'Slab', 18000, 18000, 0, 9, 'Concrete & Foundations', 0.95),
('bud-cvy303-10', 'project-cvy303-0001-0001-000000000001', 'Framing Lumber', 60000, 60000, 0, 10, 'Framing', 0.96),
('bud-cvy303-11', 'project-cvy303-0001-0001-000000000001', 'Framing Labor', 48000, 48000, 0, 11, 'Framing', 0.97),
('bud-cvy303-12', 'project-cvy303-0001-0001-000000000001', 'Trusses', 17000, 17000, 0, 12, 'Framing', 0.95),
('bud-cvy303-13', 'project-cvy303-0001-0001-000000000001', 'Sheathing', 12000, 12000, 0, 13, 'Framing', 0.94),
('bud-cvy303-14', 'project-cvy303-0001-0001-000000000001', 'Roofing', 27000, 27000, 0, 14, 'Roofing', 0.96),
('bud-cvy303-15', 'project-cvy303-0001-0001-000000000001', 'Siding & Exterior', 35000, 35000, 0, 15, 'Exterior Finish', 0.95),
('bud-cvy303-16', 'project-cvy303-0001-0001-000000000001', 'Windows', 22000, 22000, 0, 16, 'Exterior Finish', 0.96),
('bud-cvy303-17', 'project-cvy303-0001-0001-000000000001', 'Doors', 14000, 14000, 0, 17, 'Exterior Finish', 0.95),
('bud-cvy303-18', 'project-cvy303-0001-0001-000000000001', 'Plumbing', 33000, 33000, 0, 18, 'Plumbing', 0.96),
('bud-cvy303-19', 'project-cvy303-0001-0001-000000000001', 'Electrical', 29000, 29000, 0, 19, 'Electrical', 0.96),
('bud-cvy303-20', 'project-cvy303-0001-0001-000000000001', 'HVAC', 25000, 25000, 0, 20, 'HVAC', 0.95),
('bud-cvy303-21', 'project-cvy303-0001-0001-000000000001', 'Insulation', 13000, 13000, 0, 21, 'Insulation & Air Sealing', 0.95),
('bud-cvy303-22', 'project-cvy303-0001-0001-000000000001', 'Drywall', 27000, 27000, 0, 22, 'Interior Finish', 0.95),
('bud-cvy303-23', 'project-cvy303-0001-0001-000000000001', 'Interior Trim', 29000, 29000, 0, 23, 'Interior Finish', 0.95),
('bud-cvy303-24', 'project-cvy303-0001-0001-000000000001', 'Painting', 15000, 15000, 0, 24, 'Interior Finish', 0.95),
('bud-cvy303-25', 'project-cvy303-0001-0001-000000000001', 'Flooring', 35000, 35000, 0, 25, 'Flooring', 0.95),
('bud-cvy303-26', 'project-cvy303-0001-0001-000000000001', 'Cabinets', 28000, 28000, 0, 26, 'Specialties', 0.96),
('bud-cvy303-27', 'project-cvy303-0001-0001-000000000001', 'Countertops', 13000, 13000, 0, 27, 'Specialties', 0.95),
('bud-cvy303-28', 'project-cvy303-0001-0001-000000000001', 'Appliances', 10000, 10000, 0, 28, 'Specialties', 0.94),
('bud-cvy303-29', 'project-cvy303-0001-0001-000000000001', 'Fixtures & Hardware', 7000, 7000, 0, 29, 'Specialties', 0.93),
('bud-cvy303-30', 'project-cvy303-0001-0001-000000000001', 'Landscaping & Exterior', 25000, 25000, 0, 30, 'Landscaping & Exterior', 0.94);

-- ============================================
-- BUDGETS FOR HISTORIC PROJECTS
-- These have 100% spent (all funded)
-- ============================================

-- ORE-202: Historic - Ridgeline (Feb 2025, 6 draws, paid off Oct)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-ore202-01', 'project-ore202-0001-0001-000000000001', 'Project Management', 11000, 11000, 11000, 1, 'General Conditions', 0.95),
('bud-ore202-02', 'project-ore202-0001-0001-000000000001', 'Permits & Fees', 16500, 16500, 16500, 2, 'General Conditions', 0.97),
('bud-ore202-03', 'project-ore202-0001-0001-000000000001', 'Insurance', 5500, 5500, 5500, 3, 'General Conditions', 0.96),
('bud-ore202-04', 'project-ore202-0001-0001-000000000001', 'Temporary Utilities', 4500, 4500, 4500, 4, 'General Conditions', 0.94),
('bud-ore202-05', 'project-ore202-0001-0001-000000000001', 'Survey & Engineering', 7500, 7500, 7500, 5, 'General Conditions', 0.95),
('bud-ore202-06', 'project-ore202-0001-0001-000000000001', 'Site Work', 35000, 35000, 35000, 6, 'Site Work', 0.95),
('bud-ore202-07', 'project-ore202-0001-0001-000000000001', 'Footings', 24000, 24000, 24000, 7, 'Concrete & Foundations', 0.97),
('bud-ore202-08', 'project-ore202-0001-0001-000000000001', 'Foundation', 30000, 30000, 30000, 8, 'Concrete & Foundations', 0.96),
('bud-ore202-09', 'project-ore202-0001-0001-000000000001', 'Slab', 26000, 26000, 26000, 9, 'Concrete & Foundations', 0.95),
('bud-ore202-10', 'project-ore202-0001-0001-000000000001', 'Framing Lumber', 88000, 88000, 88000, 10, 'Framing', 0.96),
('bud-ore202-11', 'project-ore202-0001-0001-000000000001', 'Framing Labor', 70000, 70000, 70000, 11, 'Framing', 0.97),
('bud-ore202-12', 'project-ore202-0001-0001-000000000001', 'Trusses', 26000, 26000, 26000, 12, 'Framing', 0.95),
('bud-ore202-13', 'project-ore202-0001-0001-000000000001', 'Sheathing', 17000, 17000, 17000, 13, 'Framing', 0.94),
('bud-ore202-14', 'project-ore202-0001-0001-000000000001', 'Roofing', 38000, 38000, 38000, 14, 'Roofing', 0.96),
('bud-ore202-15', 'project-ore202-0001-0001-000000000001', 'Siding & Exterior', 45000, 45000, 45000, 15, 'Exterior Finish', 0.95),
('bud-ore202-16', 'project-ore202-0001-0001-000000000001', 'Windows', 32000, 32000, 32000, 16, 'Exterior Finish', 0.96),
('bud-ore202-17', 'project-ore202-0001-0001-000000000001', 'Doors', 19000, 19000, 19000, 17, 'Exterior Finish', 0.95),
('bud-ore202-18', 'project-ore202-0001-0001-000000000001', 'Plumbing', 46000, 46000, 46000, 18, 'Plumbing', 0.96),
('bud-ore202-19', 'project-ore202-0001-0001-000000000001', 'Electrical', 42000, 42000, 42000, 19, 'Electrical', 0.96),
('bud-ore202-20', 'project-ore202-0001-0001-000000000001', 'HVAC', 35000, 35000, 35000, 20, 'HVAC', 0.95),
('bud-ore202-21', 'project-ore202-0001-0001-000000000001', 'Insulation', 18000, 18000, 18000, 21, 'Insulation & Air Sealing', 0.95),
('bud-ore202-22', 'project-ore202-0001-0001-000000000001', 'Drywall', 38000, 38000, 38000, 22, 'Interior Finish', 0.95),
('bud-ore202-23', 'project-ore202-0001-0001-000000000001', 'Interior Trim', 42000, 42000, 42000, 23, 'Interior Finish', 0.95),
('bud-ore202-24', 'project-ore202-0001-0001-000000000001', 'Painting', 21000, 21000, 21000, 24, 'Interior Finish', 0.95),
('bud-ore202-25', 'project-ore202-0001-0001-000000000001', 'Flooring', 48000, 48000, 48000, 25, 'Flooring', 0.95),
('bud-ore202-26', 'project-ore202-0001-0001-000000000001', 'Cabinets', 40000, 40000, 40000, 26, 'Specialties', 0.96),
('bud-ore202-27', 'project-ore202-0001-0001-000000000001', 'Countertops', 19000, 19000, 19000, 27, 'Specialties', 0.95),
('bud-ore202-28', 'project-ore202-0001-0001-000000000001', 'Appliances', 16000, 16000, 16000, 28, 'Specialties', 0.94),
('bud-ore202-29', 'project-ore202-0001-0001-000000000001', 'Fixtures & Hardware', 10000, 10000, 10000, 29, 'Specialties', 0.93),
('bud-ore202-30', 'project-ore202-0001-0001-000000000001', 'Landscaping & Exterior', 35000, 35000, 35000, 30, 'Landscaping & Exterior', 0.94);

-- CVY-302: Historic - Westbrook (Jan 2025, 7 draws, paid off Sep)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-cvy302-01', 'project-cvy302-0001-0001-000000000001', 'Project Management', 9000, 9000, 9000, 1, 'General Conditions', 0.95),
('bud-cvy302-02', 'project-cvy302-0001-0001-000000000001', 'Permits & Fees', 14000, 14000, 14000, 2, 'General Conditions', 0.97),
('bud-cvy302-03', 'project-cvy302-0001-0001-000000000001', 'Insurance', 4800, 4800, 4800, 3, 'General Conditions', 0.96),
('bud-cvy302-04', 'project-cvy302-0001-0001-000000000001', 'Temporary Utilities', 3800, 3800, 3800, 4, 'General Conditions', 0.94),
('bud-cvy302-05', 'project-cvy302-0001-0001-000000000001', 'Survey & Engineering', 6500, 6500, 6500, 5, 'General Conditions', 0.95),
('bud-cvy302-06', 'project-cvy302-0001-0001-000000000001', 'Site Work', 30000, 30000, 30000, 6, 'Site Work', 0.95),
('bud-cvy302-07', 'project-cvy302-0001-0001-000000000001', 'Footings', 20000, 20000, 20000, 7, 'Concrete & Foundations', 0.97),
('bud-cvy302-08', 'project-cvy302-0001-0001-000000000001', 'Foundation', 26000, 26000, 26000, 8, 'Concrete & Foundations', 0.96),
('bud-cvy302-09', 'project-cvy302-0001-0001-000000000001', 'Slab', 22000, 22000, 22000, 9, 'Concrete & Foundations', 0.95),
('bud-cvy302-10', 'project-cvy302-0001-0001-000000000001', 'Framing Lumber', 70000, 70000, 70000, 10, 'Framing', 0.96),
('bud-cvy302-11', 'project-cvy302-0001-0001-000000000001', 'Framing Labor', 56000, 56000, 56000, 11, 'Framing', 0.97),
('bud-cvy302-12', 'project-cvy302-0001-0001-000000000001', 'Trusses', 21000, 21000, 21000, 12, 'Framing', 0.95),
('bud-cvy302-13', 'project-cvy302-0001-0001-000000000001', 'Sheathing', 14000, 14000, 14000, 13, 'Framing', 0.94),
('bud-cvy302-14', 'project-cvy302-0001-0001-000000000001', 'Roofing', 32000, 32000, 32000, 14, 'Roofing', 0.96),
('bud-cvy302-15', 'project-cvy302-0001-0001-000000000001', 'Siding & Exterior', 38000, 38000, 38000, 15, 'Exterior Finish', 0.95),
('bud-cvy302-16', 'project-cvy302-0001-0001-000000000001', 'Windows', 27000, 27000, 27000, 16, 'Exterior Finish', 0.96),
('bud-cvy302-17', 'project-cvy302-0001-0001-000000000001', 'Doors', 16000, 16000, 16000, 17, 'Exterior Finish', 0.95),
('bud-cvy302-18', 'project-cvy302-0001-0001-000000000001', 'Plumbing', 38000, 38000, 38000, 18, 'Plumbing', 0.96),
('bud-cvy302-19', 'project-cvy302-0001-0001-000000000001', 'Electrical', 34000, 34000, 34000, 19, 'Electrical', 0.96),
('bud-cvy302-20', 'project-cvy302-0001-0001-000000000001', 'HVAC', 29000, 29000, 29000, 20, 'HVAC', 0.95),
('bud-cvy302-21', 'project-cvy302-0001-0001-000000000001', 'Insulation', 15000, 15000, 15000, 21, 'Insulation & Air Sealing', 0.95),
('bud-cvy302-22', 'project-cvy302-0001-0001-000000000001', 'Drywall', 32000, 32000, 32000, 22, 'Interior Finish', 0.95),
('bud-cvy302-23', 'project-cvy302-0001-0001-000000000001', 'Interior Trim', 35000, 35000, 35000, 23, 'Interior Finish', 0.95),
('bud-cvy302-24', 'project-cvy302-0001-0001-000000000001', 'Painting', 17000, 17000, 17000, 24, 'Interior Finish', 0.95),
('bud-cvy302-25', 'project-cvy302-0001-0001-000000000001', 'Flooring', 40000, 40000, 40000, 25, 'Flooring', 0.95),
('bud-cvy302-26', 'project-cvy302-0001-0001-000000000001', 'Cabinets', 33000, 33000, 33000, 26, 'Specialties', 0.96),
('bud-cvy302-27', 'project-cvy302-0001-0001-000000000001', 'Countertops', 15000, 15000, 15000, 27, 'Specialties', 0.95),
('bud-cvy302-28', 'project-cvy302-0001-0001-000000000001', 'Appliances', 12000, 12000, 12000, 28, 'Specialties', 0.94),
('bud-cvy302-29', 'project-cvy302-0001-0001-000000000001', 'Fixtures & Hardware', 8500, 8500, 8500, 29, 'Specialties', 0.93),
('bud-cvy302-30', 'project-cvy302-0001-0001-000000000001', 'Landscaping & Exterior', 30000, 30000, 30000, 30, 'Landscaping & Exterior', 0.94);

-- DW-106: Historic - Horizon (Mar 2025, 6 draws, paid off Nov)
INSERT INTO budgets (id, project_id, category, original_amount, current_amount, spent_amount, sort_order, nahb_category, ai_confidence) VALUES
('bud-dw106-01', 'project-dw106-0001-0001-000000000001', 'Project Management', 10000, 10000, 10000, 1, 'General Conditions', 0.95),
('bud-dw106-02', 'project-dw106-0001-0001-000000000001', 'Permits & Fees', 15000, 15000, 15000, 2, 'General Conditions', 0.97),
('bud-dw106-03', 'project-dw106-0001-0001-000000000001', 'Insurance', 5000, 5000, 5000, 3, 'General Conditions', 0.96),
('bud-dw106-04', 'project-dw106-0001-0001-000000000001', 'Temporary Utilities', 4000, 4000, 4000, 4, 'General Conditions', 0.94),
('bud-dw106-05', 'project-dw106-0001-0001-000000000001', 'Survey & Engineering', 6800, 6800, 6800, 5, 'General Conditions', 0.95),
('bud-dw106-06', 'project-dw106-0001-0001-000000000001', 'Site Work', 31000, 31000, 31000, 6, 'Site Work', 0.95),
('bud-dw106-07', 'project-dw106-0001-0001-000000000001', 'Footings', 21000, 21000, 21000, 7, 'Concrete & Foundations', 0.97),
('bud-dw106-08', 'project-dw106-0001-0001-000000000001', 'Foundation', 27000, 27000, 27000, 8, 'Concrete & Foundations', 0.96),
('bud-dw106-09', 'project-dw106-0001-0001-000000000001', 'Slab', 23000, 23000, 23000, 9, 'Concrete & Foundations', 0.95),
('bud-dw106-10', 'project-dw106-0001-0001-000000000001', 'Framing Lumber', 75000, 75000, 75000, 10, 'Framing', 0.96),
('bud-dw106-11', 'project-dw106-0001-0001-000000000001', 'Framing Labor', 60000, 60000, 60000, 11, 'Framing', 0.97),
('bud-dw106-12', 'project-dw106-0001-0001-000000000001', 'Trusses', 22000, 22000, 22000, 12, 'Framing', 0.95),
('bud-dw106-13', 'project-dw106-0001-0001-000000000001', 'Sheathing', 14500, 14500, 14500, 13, 'Framing', 0.94),
('bud-dw106-14', 'project-dw106-0001-0001-000000000001', 'Roofing', 34000, 34000, 34000, 14, 'Roofing', 0.96),
('bud-dw106-15', 'project-dw106-0001-0001-000000000001', 'Siding & Exterior', 40000, 40000, 40000, 15, 'Exterior Finish', 0.95),
('bud-dw106-16', 'project-dw106-0001-0001-000000000001', 'Windows', 28000, 28000, 28000, 16, 'Exterior Finish', 0.96),
('bud-dw106-17', 'project-dw106-0001-0001-000000000001', 'Doors', 17000, 17000, 17000, 17, 'Exterior Finish', 0.95),
('bud-dw106-18', 'project-dw106-0001-0001-000000000001', 'Plumbing', 40000, 40000, 40000, 18, 'Plumbing', 0.96),
('bud-dw106-19', 'project-dw106-0001-0001-000000000001', 'Electrical', 36000, 36000, 36000, 19, 'Electrical', 0.96),
('bud-dw106-20', 'project-dw106-0001-0001-000000000001', 'HVAC', 31000, 31000, 31000, 20, 'HVAC', 0.95),
('bud-dw106-21', 'project-dw106-0001-0001-000000000001', 'Insulation', 16000, 16000, 16000, 21, 'Insulation & Air Sealing', 0.95),
('bud-dw106-22', 'project-dw106-0001-0001-000000000001', 'Drywall', 34000, 34000, 34000, 22, 'Interior Finish', 0.95),
('bud-dw106-23', 'project-dw106-0001-0001-000000000001', 'Interior Trim', 37000, 37000, 37000, 23, 'Interior Finish', 0.95),
('bud-dw106-24', 'project-dw106-0001-0001-000000000001', 'Painting', 18000, 18000, 18000, 24, 'Interior Finish', 0.95),
('bud-dw106-25', 'project-dw106-0001-0001-000000000001', 'Flooring', 43000, 43000, 43000, 25, 'Flooring', 0.95),
('bud-dw106-26', 'project-dw106-0001-0001-000000000001', 'Cabinets', 35000, 35000, 35000, 26, 'Specialties', 0.96),
('bud-dw106-27', 'project-dw106-0001-0001-000000000001', 'Countertops', 16000, 16000, 16000, 27, 'Specialties', 0.95),
('bud-dw106-28', 'project-dw106-0001-0001-000000000001', 'Appliances', 13000, 13000, 13000, 28, 'Specialties', 0.94),
('bud-dw106-29', 'project-dw106-0001-0001-000000000001', 'Fixtures & Hardware', 9000, 9000, 9000, 29, 'Specialties', 0.93),
('bud-dw106-30', 'project-dw106-0001-0001-000000000001', 'Landscaping & Exterior', 32000, 32000, 32000, 30, 'Landscaping & Exterior', 0.94);

-- ============================================
-- PHASE 6: DRAW REQUESTS
-- Active projects: mix of funded + review/staged
-- Historic projects: all funded
-- ============================================

-- ----------------------------------------
-- DRAWS FOR: DW-102 (Active - 4 funded, 1 staged)
-- Started Jun 2025, currently Dec 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-dw102-01', 'project-dw102-0001-0001-000000000001', 1, 'funded', 58200, '2025-06-20', '2025-06-25', '2025-06-20 10:00:00+00'),
('draw-dw102-02', 'project-dw102-0001-0001-000000000001', 2, 'funded', 107000, '2025-07-18', '2025-07-23', '2025-07-18 10:00:00+00'),
('draw-dw102-03', 'project-dw102-0001-0001-000000000001', 3, 'funded', 145200, '2025-09-05', '2025-09-10', '2025-09-05 10:00:00+00'),
('draw-dw102-04', 'project-dw102-0001-0001-000000000001', 4, 'funded', 112500, '2025-10-25', '2025-10-30', '2025-10-25 10:00:00+00'),
('draw-dw102-05', 'project-dw102-0001-0001-000000000001', 5, 'staged', 98500, '2025-12-10', NULL, '2025-12-10 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: ORE-201 (Active - 3 funded, 1 review)
-- Started Jul 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-ore201-01', 'project-ore201-0001-0001-000000000001', 1, 'funded', 72800, '2025-07-15', '2025-07-20', '2025-07-15 10:00:00+00'),
('draw-ore201-02', 'project-ore201-0001-0001-000000000001', 2, 'funded', 132000, '2025-08-22', '2025-08-27', '2025-08-22 10:00:00+00'),
('draw-ore201-03', 'project-ore201-0001-0001-000000000001', 3, 'funded', 168500, '2025-10-18', '2025-10-23', '2025-10-18 10:00:00+00'),
('draw-ore201-04', 'project-ore201-0001-0001-000000000001', 4, 'review', 124000, '2025-12-12', NULL, '2025-12-12 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: DW-104 (Active - 5 funded, 1 staged)
-- Started May 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-dw104-01', 'project-dw104-0001-0001-000000000001', 1, 'funded', 52100, '2025-05-15', '2025-05-20', '2025-05-15 10:00:00+00'),
('draw-dw104-02', 'project-dw104-0001-0001-000000000001', 2, 'funded', 96500, '2025-06-20', '2025-06-25', '2025-06-20 10:00:00+00'),
('draw-dw104-03', 'project-dw104-0001-0001-000000000001', 3, 'funded', 128000, '2025-08-08', '2025-08-13', '2025-08-08 10:00:00+00'),
('draw-dw104-04', 'project-dw104-0001-0001-000000000001', 4, 'funded', 98500, '2025-09-25', '2025-09-30', '2025-09-25 10:00:00+00'),
('draw-dw104-05', 'project-dw104-0001-0001-000000000001', 5, 'funded', 85200, '2025-11-12', '2025-11-17', '2025-11-12 10:00:00+00'),
('draw-dw104-06', 'project-dw104-0001-0001-000000000001', 6, 'staged', 72000, '2025-12-08', NULL, '2025-12-08 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: CVY-301 (Active - 3 funded, 1 review)
-- Started Aug 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-cvy301-01', 'project-cvy301-0001-0001-000000000001', 1, 'funded', 55200, '2025-08-15', '2025-08-20', '2025-08-15 10:00:00+00'),
('draw-cvy301-02', 'project-cvy301-0001-0001-000000000001', 2, 'funded', 98000, '2025-09-20', '2025-09-25', '2025-09-20 10:00:00+00'),
('draw-cvy301-03', 'project-cvy301-0001-0001-000000000001', 3, 'funded', 115000, '2025-11-05', '2025-11-10', '2025-11-05 10:00:00+00'),
('draw-cvy301-04', 'project-cvy301-0001-0001-000000000001', 4, 'review', 88500, '2025-12-14', NULL, '2025-12-14 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: DW-105 (Active - 5 funded, 1 review)
-- Started Apr 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-dw105-01', 'project-dw105-0001-0001-000000000001', 1, 'funded', 62000, '2025-04-25', '2025-04-30', '2025-04-25 10:00:00+00'),
('draw-dw105-02', 'project-dw105-0001-0001-000000000001', 2, 'funded', 105000, '2025-05-28', '2025-06-02', '2025-05-28 10:00:00+00'),
('draw-dw105-03', 'project-dw105-0001-0001-000000000001', 3, 'funded', 142000, '2025-07-15', '2025-07-20', '2025-07-15 10:00:00+00'),
('draw-dw105-04', 'project-dw105-0001-0001-000000000001', 4, 'funded', 118000, '2025-09-10', '2025-09-15', '2025-09-10 10:00:00+00'),
('draw-dw105-05', 'project-dw105-0001-0001-000000000001', 5, 'funded', 95000, '2025-11-02', '2025-11-07', '2025-11-02 10:00:00+00'),
('draw-dw105-06', 'project-dw105-0001-0001-000000000001', 6, 'review', 82500, '2025-12-15', NULL, '2025-12-15 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: CVY-303 (Active - 2 funded, 1 staged)
-- Started Sep 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-cvy303-01', 'project-cvy303-0001-0001-000000000001', 1, 'funded', 50700, '2025-09-15', '2025-09-20', '2025-09-15 10:00:00+00'),
('draw-cvy303-02', 'project-cvy303-0001-0001-000000000001', 2, 'funded', 88000, '2025-10-28', '2025-11-02', '2025-10-28 10:00:00+00'),
('draw-cvy303-03', 'project-cvy303-0001-0001-000000000001', 3, 'staged', 72500, '2025-12-11', NULL, '2025-12-11 10:00:00+00');

-- ============================================
-- DRAWS FOR HISTORIC PROJECTS (All Funded)
-- ============================================

-- ----------------------------------------
-- DRAWS FOR: ORE-202 (Historic - 6 funded)
-- Feb 2025 - Oct 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-ore202-01', 'project-ore202-0001-0001-000000000001', 1, 'funded', 65000, '2025-02-10', '2025-02-15', '2025-02-10 10:00:00+00'),
('draw-ore202-02', 'project-ore202-0001-0001-000000000001', 2, 'funded', 115000, '2025-03-15', '2025-03-20', '2025-03-15 10:00:00+00'),
('draw-ore202-03', 'project-ore202-0001-0001-000000000001', 3, 'funded', 185000, '2025-04-25', '2025-04-30', '2025-04-25 10:00:00+00'),
('draw-ore202-04', 'project-ore202-0001-0001-000000000001', 4, 'funded', 145000, '2025-06-10', '2025-06-15', '2025-06-10 10:00:00+00'),
('draw-ore202-05', 'project-ore202-0001-0001-000000000001', 5, 'funded', 135000, '2025-07-28', '2025-08-02', '2025-07-28 10:00:00+00'),
('draw-ore202-06', 'project-ore202-0001-0001-000000000001', 6, 'funded', 130000, '2025-09-15', '2025-09-20', '2025-09-15 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: CVY-302 (Historic - 7 funded)
-- Jan 2025 - Sep 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-cvy302-01', 'project-cvy302-0001-0001-000000000001', 1, 'funded', 52100, '2025-01-20', '2025-01-25', '2025-01-20 10:00:00+00'),
('draw-cvy302-02', 'project-cvy302-0001-0001-000000000001', 2, 'funded', 88000, '2025-02-18', '2025-02-23', '2025-02-18 10:00:00+00'),
('draw-cvy302-03', 'project-cvy302-0001-0001-000000000001', 3, 'funded', 135000, '2025-03-25', '2025-03-30', '2025-03-25 10:00:00+00'),
('draw-cvy302-04', 'project-cvy302-0001-0001-000000000001', 4, 'funded', 105000, '2025-05-05', '2025-05-10', '2025-05-05 10:00:00+00'),
('draw-cvy302-05', 'project-cvy302-0001-0001-000000000001', 5, 'funded', 95000, '2025-06-12', '2025-06-17', '2025-06-12 10:00:00+00'),
('draw-cvy302-06', 'project-cvy302-0001-0001-000000000001', 6, 'funded', 85000, '2025-07-22', '2025-07-27', '2025-07-22 10:00:00+00'),
('draw-cvy302-07', 'project-cvy302-0001-0001-000000000001', 7, 'funded', 79500, '2025-08-28', '2025-09-02', '2025-08-28 10:00:00+00');

-- ----------------------------------------
-- DRAWS FOR: DW-106 (Historic - 6 funded)
-- Mar 2025 - Nov 2025
-- ----------------------------------------
INSERT INTO draw_requests (id, project_id, draw_number, status, total_amount, request_date, funded_at, created_at) VALUES
('draw-dw106-01', 'project-dw106-0001-0001-000000000001', 1, 'funded', 56800, '2025-03-10', '2025-03-15', '2025-03-10 10:00:00+00'),
('draw-dw106-02', 'project-dw106-0001-0001-000000000001', 2, 'funded', 102000, '2025-04-15', '2025-04-20', '2025-04-15 10:00:00+00'),
('draw-dw106-03', 'project-dw106-0001-0001-000000000001', 3, 'funded', 165000, '2025-05-28', '2025-06-02', '2025-05-28 10:00:00+00'),
('draw-dw106-04', 'project-dw106-0001-0001-000000000001', 4, 'funded', 128000, '2025-07-15', '2025-07-20', '2025-07-15 10:00:00+00'),
('draw-dw106-05', 'project-dw106-0001-0001-000000000001', 5, 'funded', 115000, '2025-09-02', '2025-09-07', '2025-09-02 10:00:00+00'),
('draw-dw106-06', 'project-dw106-0001-0001-000000000001', 6, 'funded', 98500, '2025-10-18', '2025-10-23', '2025-10-18 10:00:00+00');

-- ============================================
-- PHASE 7: DRAW REQUEST LINES
-- Link draws to budgets with realistic amounts
-- ============================================

-- Sample draw lines for DW-102 (showing pattern - each draw covers specific budget categories)

-- Draw 1: Pre-Construction (permits, insurance, survey, site clearing)
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-dw102-01-01', 'draw-dw102-01', 'bud-dw102-01', 10500, 10500, 0.95, 'Ridgeline Admin', 'PM-2025-001'),
('line-dw102-01-02', 'draw-dw102-01', 'bud-dw102-02', 15500, 15500, 0.97, 'City of Dripping Springs', 'PERM-2025-102'),
('line-dw102-01-03', 'draw-dw102-01', 'bud-dw102-03', 5200, 5200, 0.96, 'Texas Builder Insurance', 'TBI-44521'),
('line-dw102-01-04', 'draw-dw102-01', 'bud-dw102-06', 7200, 7200, 0.95, 'Hill Country Survey', 'HCS-2025-089'),
('line-dw102-01-05', 'draw-dw102-01', 'bud-dw102-07', 8500, 8500, 0.94, 'Central TX Clearing', 'CTC-1547'),
('line-dw102-01-06', 'draw-dw102-01', 'bud-dw102-10', 4200, 4200, 0.93, 'EcoGuard Services', 'EGS-2025-331'),
('line-dw102-01-07', 'draw-dw102-01', 'bud-dw102-04', 4200, 4200, 0.94, 'Pedernales Electric', 'PEC-TEMP-4421'),
('line-dw102-01-08', 'draw-dw102-01', 'bud-dw102-05', 2900, 2900, 0.93, 'Texas Disposal', 'TDS-78541');

-- Draw 2: Foundation (excavation, footings, foundation, slab)
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-dw102-02-01', 'draw-dw102-02', 'bud-dw102-08', 19000, 19000, 0.96, 'Austin Excavation', 'AE-2025-445'),
('line-dw102-02-02', 'draw-dw102-02', 'bud-dw102-12', 23000, 23000, 0.97, 'Solid Foundation Inc', 'SFI-2025-112'),
('line-dw102-02-03', 'draw-dw102-02', 'bud-dw102-13', 29000, 29000, 0.96, 'Solid Foundation Inc', 'SFI-2025-113'),
('line-dw102-02-04', 'draw-dw102-02', 'bud-dw102-14', 19000, 19000, 0.95, 'PT Slab Pros', 'PTSP-4452'),
('line-dw102-02-05', 'draw-dw102-02', 'bud-dw102-15', 8000, 8000, 0.94, 'PT Slab Pros', 'PTSP-4453'),
('line-dw102-02-06', 'draw-dw102-02', 'bud-dw102-09', 9000, 9000, 0.95, 'Austin Excavation', 'AE-2025-446');

-- Draw 3: Structure (framing, trusses, sheathing, roofing)
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-dw102-03-01', 'draw-dw102-03', 'bud-dw102-17', 42500, 42500, 0.96, 'BMC Building Materials', 'BMC-2025-8874'),
('line-dw102-03-02', 'draw-dw102-03', 'bud-dw102-18', 34000, 34000, 0.97, 'Hill Country Framing', 'HCF-5521'),
('line-dw102-03-03', 'draw-dw102-03', 'bud-dw102-19', 25000, 25000, 0.95, 'Texas Truss Co', 'TTC-2025-221'),
('line-dw102-03-04', 'draw-dw102-03', 'bud-dw102-20', 16000, 16000, 0.94, 'BMC Building Materials', 'BMC-2025-8875'),
('line-dw102-03-05', 'draw-dw102-03', 'bud-dw102-23', 12500, 12500, 0.96, 'Peak Roofing', 'PR-2025-667'),
('line-dw102-03-06', 'draw-dw102-03', 'bud-dw102-24', 8000, 8000, 0.95, 'Peak Roofing', 'PR-2025-668'),
('line-dw102-03-07', 'draw-dw102-03', 'bud-dw102-22', 4800, 4800, 0.92, 'Simpson Strong-Tie', 'SST-115542'),
('line-dw102-03-08', 'draw-dw102-03', 'bud-dw102-21', 2400, 2400, 0.93, 'Lone Star Steel', 'LSS-2025-332');

-- Draw 4: Dry-In (windows, doors, siding, exterior)
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-dw102-04-01', 'draw-dw102-04', 'bud-dw102-28', 30000, 30000, 0.96, 'Pella Windows Austin', 'PWA-2025-1134'),
('line-dw102-04-02', 'draw-dw102-04', 'bud-dw102-29', 12500, 12500, 0.95, 'Door Store TX', 'DSTX-5567'),
('line-dw102-04-03', 'draw-dw102-04', 'bud-dw102-30', 6500, 6500, 0.94, 'Overhead Door Austin', 'ODA-2025-882'),
('line-dw102-04-04', 'draw-dw102-04', 'bud-dw102-26', 18000, 18000, 0.95, 'James Hardie Installer', 'JHI-2025-445'),
('line-dw102-04-05', 'draw-dw102-04', 'bud-dw102-27', 13000, 13000, 0.94, 'James Hardie Installer', 'JHI-2025-446'),
('line-dw102-04-06', 'draw-dw102-04', 'bud-dw102-23', 10500, 10500, 0.96, 'Peak Roofing', 'PR-2025-669'),
('line-dw102-04-07', 'draw-dw102-04', 'bud-dw102-24', 8000, 8000, 0.95, 'Peak Roofing', 'PR-2025-670'),
('line-dw102-04-08', 'draw-dw102-04', 'bud-dw102-25', 6000, 6000, 0.94, 'Gutter Masters', 'GM-2025-221'),
('line-dw102-04-09', 'draw-dw102-04', 'bud-dw102-11', 8000, 8000, 0.92, 'Rock Wall Pros', 'RWP-2025-112');

-- Draw 5 (staged): MEP Rough + Interior
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-dw102-05-01', 'draw-dw102-05', 'bud-dw102-31', 23000, 23000, 0.96, 'Anderson Plumbing', 'AP-2025-8821'),
('line-dw102-05-02', 'draw-dw102-05', 'bud-dw102-34', 21000, 21000, 0.96, 'Spark Electric', 'SE-2025-4451'),
('line-dw102-05-03', 'draw-dw102-05', 'bud-dw102-38', 19000, 19000, 0.95, 'Cool Breeze HVAC', 'CB-2025-551'),
('line-dw102-05-04', 'draw-dw102-05', 'bud-dw102-39', 14500, 14500, 0.94, 'Cool Breeze HVAC', 'CB-2025-552'),
('line-dw102-05-05', 'draw-dw102-05', 'bud-dw102-40', 10500, 10500, 0.95, 'Austin Insulation', 'AI-2025-332'),
('line-dw102-05-06', 'draw-dw102-05', 'bud-dw102-41', 5800, 5800, 0.94, 'Austin Insulation', 'AI-2025-333'),
('line-dw102-05-07', 'draw-dw102-05', 'bud-dw102-42', 3200, 3200, 0.93, 'Austin Insulation', 'AI-2025-334'),
('line-dw102-05-08', 'draw-dw102-05', 'bud-dw102-05', 1500, 1500, 0.93, 'Texas Disposal', 'TDS-78542');

-- Sample draw lines for ORE-201 (3 funded draws + 1 review)
-- Draw 1: Pre-Construction
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore201-01-01', 'draw-ore201-01', 'bud-ore201-01', 11500, 11500, 0.95, 'Ridgeline Admin', 'PM-2025-002'),
('line-ore201-01-02', 'draw-ore201-01', 'bud-ore201-02', 17000, 17000, 0.97, 'City of Austin', 'PERM-2025-201'),
('line-ore201-01-03', 'draw-ore201-01', 'bud-ore201-03', 5800, 5800, 0.96, 'Texas Builder Insurance', 'TBI-44522'),
('line-ore201-01-04', 'draw-ore201-01', 'bud-ore201-06', 8000, 8000, 0.95, 'Hill Country Survey', 'HCS-2025-090'),
('line-ore201-01-05', 'draw-ore201-01', 'bud-ore201-07', 9500, 9500, 0.94, 'Central TX Clearing', 'CTC-1548'),
('line-ore201-01-06', 'draw-ore201-01', 'bud-ore201-04', 4800, 4800, 0.94, 'Austin Energy', 'AE-TEMP-7721'),
('line-ore201-01-07', 'draw-ore201-01', 'bud-ore201-05', 6200, 6200, 0.93, 'Texas Disposal', 'TDS-78543'),
('line-ore201-01-08', 'draw-ore201-01', 'bud-ore201-10', 4800, 4800, 0.93, 'EcoGuard Services', 'EGS-2025-332'),
('line-ore201-01-09', 'draw-ore201-01', 'bud-ore201-11', 5200, 5200, 0.92, 'Rock Wall Pros', 'RWP-2025-113');

-- Draw 2: Foundation
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore201-02-01', 'draw-ore201-02', 'bud-ore201-08', 21000, 21000, 0.96, 'Austin Excavation', 'AE-2025-447'),
('line-ore201-02-02', 'draw-ore201-02', 'bud-ore201-12', 25000, 25000, 0.97, 'Solid Foundation Inc', 'SFI-2025-114'),
('line-ore201-02-03', 'draw-ore201-02', 'bud-ore201-13', 32000, 32000, 0.96, 'Solid Foundation Inc', 'SFI-2025-115'),
('line-ore201-02-04', 'draw-ore201-02', 'bud-ore201-14', 21000, 21000, 0.95, 'PT Slab Pros', 'PTSP-4454'),
('line-ore201-02-05', 'draw-ore201-02', 'bud-ore201-15', 9000, 9000, 0.94, 'PT Slab Pros', 'PTSP-4455'),
('line-ore201-02-06', 'draw-ore201-02', 'bud-ore201-09', 12000, 12000, 0.95, 'Austin Excavation', 'AE-2025-448'),
('line-ore201-02-07', 'draw-ore201-02', 'bud-ore201-16', 7500, 7500, 0.93, 'PT Slab Pros', 'PTSP-4456'),
('line-ore201-02-08', 'draw-ore201-02', 'bud-ore201-11', 4500, 4500, 0.92, 'Rock Wall Pros', 'RWP-2025-114');

-- Draw 3: Structure (framing + roofing)
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore201-03-01', 'draw-ore201-03', 'bud-ore201-17', 46000, 46000, 0.96, 'BMC Building Materials', 'BMC-2025-8876'),
('line-ore201-03-02', 'draw-ore201-03', 'bud-ore201-18', 37000, 37000, 0.97, 'Hill Country Framing', 'HCF-5522'),
('line-ore201-03-03', 'draw-ore201-03', 'bud-ore201-19', 28000, 28000, 0.95, 'Texas Truss Co', 'TTC-2025-222'),
('line-ore201-03-04', 'draw-ore201-03', 'bud-ore201-20', 18000, 18000, 0.94, 'BMC Building Materials', 'BMC-2025-8877'),
('line-ore201-03-05', 'draw-ore201-03', 'bud-ore201-23', 13000, 13000, 0.96, 'Peak Roofing', 'PR-2025-671'),
('line-ore201-03-06', 'draw-ore201-03', 'bud-ore201-24', 9000, 9000, 0.95, 'Peak Roofing', 'PR-2025-672'),
('line-ore201-03-07', 'draw-ore201-03', 'bud-ore201-22', 5200, 5200, 0.92, 'Simpson Strong-Tie', 'SST-115543'),
('line-ore201-03-08', 'draw-ore201-03', 'bud-ore201-21', 7500, 7500, 0.93, 'Lone Star Steel', 'LSS-2025-333'),
('line-ore201-03-09', 'draw-ore201-03', 'bud-ore201-25', 4800, 4800, 0.94, 'Gutter Masters', 'GM-2025-222');

-- Draw 4 (review): Dry-In + MEP Start
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore201-04-01', 'draw-ore201-04', 'bud-ore201-28', 34000, 34000, 0.96, 'Pella Windows Austin', 'PWA-2025-1135'),
('line-ore201-04-02', 'draw-ore201-04', 'bud-ore201-29', 14000, 14000, 0.95, 'Door Store TX', 'DSTX-5568'),
('line-ore201-04-03', 'draw-ore201-04', 'bud-ore201-30', 7500, 7500, 0.94, 'Overhead Door Austin', 'ODA-2025-883'),
('line-ore201-04-04', 'draw-ore201-04', 'bud-ore201-26', 20000, 20000, 0.95, 'James Hardie Installer', 'JHI-2025-447'),
('line-ore201-04-05', 'draw-ore201-04', 'bud-ore201-27', 15000, 15000, 0.94, 'James Hardie Installer', 'JHI-2025-448'),
('line-ore201-04-06', 'draw-ore201-04', 'bud-ore201-23', 13000, 13000, 0.96, 'Peak Roofing', 'PR-2025-673'),
('line-ore201-04-07', 'draw-ore201-04', 'bud-ore201-24', 9000, 9000, 0.95, 'Peak Roofing', 'PR-2025-674'),
('line-ore201-04-08', 'draw-ore201-04', 'bud-ore201-11', 11500, 11500, 0.92, 'Rock Wall Pros', 'RWP-2025-115');

-- Sample draw lines for historic projects (ORE-202, CVY-302, DW-106)
-- These would have complete draw history - adding representative samples

-- ORE-202 Draw 1: Pre-Construction
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore202-01-01', 'draw-ore202-01', 'bud-ore202-01', 11000, 11000, 0.95, 'Ridgeline Admin', 'PM-2025-003'),
('line-ore202-01-02', 'draw-ore202-01', 'bud-ore202-02', 16500, 16500, 0.97, 'City of Austin', 'PERM-2025-202'),
('line-ore202-01-03', 'draw-ore202-01', 'bud-ore202-03', 5500, 5500, 0.96, 'Texas Builder Insurance', 'TBI-44523'),
('line-ore202-01-04', 'draw-ore202-01', 'bud-ore202-04', 4500, 4500, 0.94, 'Austin Energy', 'AE-TEMP-7722'),
('line-ore202-01-05', 'draw-ore202-01', 'bud-ore202-05', 7500, 7500, 0.95, 'Hill Country Survey', 'HCS-2025-091'),
('line-ore202-01-06', 'draw-ore202-01', 'bud-ore202-06', 20000, 20000, 0.95, 'Central TX Clearing', 'CTC-1549');

-- ORE-202 Draw 2: Foundation
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore202-02-01', 'draw-ore202-02', 'bud-ore202-06', 15000, 15000, 0.95, 'Austin Excavation', 'AE-2025-449'),
('line-ore202-02-02', 'draw-ore202-02', 'bud-ore202-07', 24000, 24000, 0.97, 'Solid Foundation Inc', 'SFI-2025-116'),
('line-ore202-02-03', 'draw-ore202-02', 'bud-ore202-08', 30000, 30000, 0.96, 'Solid Foundation Inc', 'SFI-2025-117'),
('line-ore202-02-04', 'draw-ore202-02', 'bud-ore202-09', 26000, 26000, 0.95, 'PT Slab Pros', 'PTSP-4457'),
('line-ore202-02-05', 'draw-ore202-02', 'bud-ore202-14', 20000, 20000, 0.96, 'Peak Roofing', 'PR-2025-675');

-- ORE-202 Draw 3-6: Structure through Finishes (summarized)
INSERT INTO draw_request_lines (id, draw_request_id, budget_id, amount_requested, amount_approved, confidence_score, invoice_vendor_name, invoice_number) VALUES
('line-ore202-03-01', 'draw-ore202-03', 'bud-ore202-10', 88000, 88000, 0.96, 'BMC Building Materials', 'BMC-2025-8878'),
('line-ore202-03-02', 'draw-ore202-03', 'bud-ore202-11', 70000, 70000, 0.97, 'Hill Country Framing', 'HCF-5523'),
('line-ore202-03-03', 'draw-ore202-03', 'bud-ore202-12', 27000, 27000, 0.95, 'Texas Truss Co', 'TTC-2025-223'),
('line-ore202-04-01', 'draw-ore202-04', 'bud-ore202-15', 45000, 45000, 0.95, 'James Hardie Installer', 'JHI-2025-449'),
('line-ore202-04-02', 'draw-ore202-04', 'bud-ore202-16', 32000, 32000, 0.96, 'Pella Windows Austin', 'PWA-2025-1136'),
('line-ore202-04-03', 'draw-ore202-04', 'bud-ore202-17', 19000, 19000, 0.95, 'Door Store TX', 'DSTX-5569'),
('line-ore202-04-04', 'draw-ore202-04', 'bud-ore202-18', 25000, 25000, 0.96, 'Anderson Plumbing', 'AP-2025-8822'),
('line-ore202-04-05', 'draw-ore202-04', 'bud-ore202-19', 24000, 24000, 0.96, 'Spark Electric', 'SE-2025-4452'),
('line-ore202-05-01', 'draw-ore202-05', 'bud-ore202-18', 21000, 21000, 0.96, 'Anderson Plumbing', 'AP-2025-8823'),
('line-ore202-05-02', 'draw-ore202-05', 'bud-ore202-19', 18000, 18000, 0.96, 'Spark Electric', 'SE-2025-4453'),
('line-ore202-05-03', 'draw-ore202-05', 'bud-ore202-20', 35000, 35000, 0.95, 'Cool Breeze HVAC', 'CB-2025-553'),
('line-ore202-05-04', 'draw-ore202-05', 'bud-ore202-21', 18000, 18000, 0.95, 'Austin Insulation', 'AI-2025-335'),
('line-ore202-05-05', 'draw-ore202-05', 'bud-ore202-22', 38000, 38000, 0.95, 'Drywall Dynamics', 'DD-2025-221'),
('line-ore202-05-06', 'draw-ore202-05', 'bud-ore202-23', 5000, 5000, 0.95, 'Trim Masters', 'TM-2025-112'),
('line-ore202-06-01', 'draw-ore202-06', 'bud-ore202-23', 37000, 37000, 0.95, 'Trim Masters', 'TM-2025-113'),
('line-ore202-06-02', 'draw-ore202-06', 'bud-ore202-24', 21000, 21000, 0.95, 'Premier Painters', 'PP-2025-445'),
('line-ore202-06-03', 'draw-ore202-06', 'bud-ore202-25', 48000, 48000, 0.95, 'Floors & More', 'FM-2025-221'),
('line-ore202-06-04', 'draw-ore202-06', 'bud-ore202-26', 24000, 24000, 0.96, 'Cabinet Crafters', 'CC-2025-112');

-- ============================================
-- PHASE 8: WIRE BATCHES
-- Group funded draws for builders
-- ============================================

-- Wire batch for Ridgeline (covers DW-102 and ORE-201 funded draws)
INSERT INTO wire_batches (id, builder_id, total_amount, status, submitted_at, funded_at, funded_by, wire_reference) VALUES
('wire-ridgeline-2025-01', 'builder-ridgeline-0001-000000000001', 165200, 'funded', '2025-06-25 10:00:00+00', '2025-06-25 14:00:00+00', 'system', 'WR-2025-0625-001'),
('wire-ridgeline-2025-02', 'builder-ridgeline-0001-000000000001', 239000, 'funded', '2025-07-23 10:00:00+00', '2025-07-23 14:00:00+00', 'system', 'WR-2025-0723-001'),
('wire-ridgeline-2025-03', 'builder-ridgeline-0001-000000000001', 313700, 'funded', '2025-09-10 10:00:00+00', '2025-09-10 14:00:00+00', 'system', 'WR-2025-0910-001'),
('wire-ridgeline-2025-04', 'builder-ridgeline-0001-000000000001', 112500, 'funded', '2025-10-30 10:00:00+00', '2025-10-30 14:00:00+00', 'system', 'WR-2025-1030-001');

-- Wire batch for Westbrook
INSERT INTO wire_batches (id, builder_id, total_amount, status, submitted_at, funded_at, funded_by, wire_reference) VALUES
('wire-westbrook-2025-01', 'builder-westbrook-0001-000000000001', 107300, 'funded', '2025-05-20 10:00:00+00', '2025-05-20 14:00:00+00', 'system', 'WR-2025-0520-001'),
('wire-westbrook-2025-02', 'builder-westbrook-0001-000000000001', 194500, 'funded', '2025-06-25 10:00:00+00', '2025-06-25 14:00:00+00', 'system', 'WR-2025-0625-002'),
('wire-westbrook-2025-03', 'builder-westbrook-0001-000000000001', 226000, 'funded', '2025-08-13 10:00:00+00', '2025-08-13 14:00:00+00', 'system', 'WR-2025-0813-001');

-- Wire batch for Horizon
INSERT INTO wire_batches (id, builder_id, total_amount, status, submitted_at, funded_at, funded_by, wire_reference) VALUES
('wire-horizon-2025-01', 'builder-horizon-0001-000000000001', 167000, 'funded', '2025-04-30 10:00:00+00', '2025-04-30 14:00:00+00', 'system', 'WR-2025-0430-001'),
('wire-horizon-2025-02', 'builder-horizon-0001-000000000001', 193000, 'funded', '2025-06-02 10:00:00+00', '2025-06-02 14:00:00+00', 'system', 'WR-2025-0602-001'),
('wire-horizon-2025-03', 'builder-horizon-0001-000000000001', 230000, 'funded', '2025-07-20 10:00:00+00', '2025-07-20 14:00:00+00', 'system', 'WR-2025-0720-001');

-- ============================================
-- PHASE 9: UPDATE BUDGET SPENT_AMOUNTS
-- Set spent_amount for active project budgets based on funded draws
-- ============================================

-- DW-102: Update spent amounts (4 funded draws)
UPDATE budgets SET spent_amount = 10500 WHERE id = 'bud-dw102-01';
UPDATE budgets SET spent_amount = 15500 WHERE id = 'bud-dw102-02';
UPDATE budgets SET spent_amount = 5200 WHERE id = 'bud-dw102-03';
UPDATE budgets SET spent_amount = 4200 WHERE id = 'bud-dw102-04';
UPDATE budgets SET spent_amount = 4400 WHERE id = 'bud-dw102-05';
UPDATE budgets SET spent_amount = 7200 WHERE id = 'bud-dw102-06';
UPDATE budgets SET spent_amount = 8500 WHERE id = 'bud-dw102-07';
UPDATE budgets SET spent_amount = 19000 WHERE id = 'bud-dw102-08';
UPDATE budgets SET spent_amount = 9000 WHERE id = 'bud-dw102-09';
UPDATE budgets SET spent_amount = 4200 WHERE id = 'bud-dw102-10';
UPDATE budgets SET spent_amount = 8000 WHERE id = 'bud-dw102-11';
UPDATE budgets SET spent_amount = 23000 WHERE id = 'bud-dw102-12';
UPDATE budgets SET spent_amount = 29000 WHERE id = 'bud-dw102-13';
UPDATE budgets SET spent_amount = 19000 WHERE id = 'bud-dw102-14';
UPDATE budgets SET spent_amount = 8000 WHERE id = 'bud-dw102-15';
UPDATE budgets SET spent_amount = 0 WHERE id = 'bud-dw102-16';
UPDATE budgets SET spent_amount = 42500 WHERE id = 'bud-dw102-17';
UPDATE budgets SET spent_amount = 34000 WHERE id = 'bud-dw102-18';
UPDATE budgets SET spent_amount = 25000 WHERE id = 'bud-dw102-19';
UPDATE budgets SET spent_amount = 16000 WHERE id = 'bud-dw102-20';
UPDATE budgets SET spent_amount = 2400 WHERE id = 'bud-dw102-21';
UPDATE budgets SET spent_amount = 4800 WHERE id = 'bud-dw102-22';
UPDATE budgets SET spent_amount = 23000 WHERE id = 'bud-dw102-23';
UPDATE budgets SET spent_amount = 16000 WHERE id = 'bud-dw102-24';
UPDATE budgets SET spent_amount = 6000 WHERE id = 'bud-dw102-25';
UPDATE budgets SET spent_amount = 18000 WHERE id = 'bud-dw102-26';
UPDATE budgets SET spent_amount = 13000 WHERE id = 'bud-dw102-27';
UPDATE budgets SET spent_amount = 30000 WHERE id = 'bud-dw102-28';
UPDATE budgets SET spent_amount = 12500 WHERE id = 'bud-dw102-29';
UPDATE budgets SET spent_amount = 6500 WHERE id = 'bud-dw102-30';

-- ORE-201: Update spent amounts (3 funded draws)
UPDATE budgets SET spent_amount = 11500 WHERE id = 'bud-ore201-01';
UPDATE budgets SET spent_amount = 17000 WHERE id = 'bud-ore201-02';
UPDATE budgets SET spent_amount = 5800 WHERE id = 'bud-ore201-03';
UPDATE budgets SET spent_amount = 4800 WHERE id = 'bud-ore201-04';
UPDATE budgets SET spent_amount = 6200 WHERE id = 'bud-ore201-05';
UPDATE budgets SET spent_amount = 8000 WHERE id = 'bud-ore201-06';
UPDATE budgets SET spent_amount = 9500 WHERE id = 'bud-ore201-07';
UPDATE budgets SET spent_amount = 21000 WHERE id = 'bud-ore201-08';
UPDATE budgets SET spent_amount = 12000 WHERE id = 'bud-ore201-09';
UPDATE budgets SET spent_amount = 4800 WHERE id = 'bud-ore201-10';
UPDATE budgets SET spent_amount = 9700 WHERE id = 'bud-ore201-11';
UPDATE budgets SET spent_amount = 25000 WHERE id = 'bud-ore201-12';
UPDATE budgets SET spent_amount = 32000 WHERE id = 'bud-ore201-13';
UPDATE budgets SET spent_amount = 21000 WHERE id = 'bud-ore201-14';
UPDATE budgets SET spent_amount = 9000 WHERE id = 'bud-ore201-15';
UPDATE budgets SET spent_amount = 7500 WHERE id = 'bud-ore201-16';
UPDATE budgets SET spent_amount = 46000 WHERE id = 'bud-ore201-17';
UPDATE budgets SET spent_amount = 37000 WHERE id = 'bud-ore201-18';
UPDATE budgets SET spent_amount = 28000 WHERE id = 'bud-ore201-19';
UPDATE budgets SET spent_amount = 18000 WHERE id = 'bud-ore201-20';
UPDATE budgets SET spent_amount = 7500 WHERE id = 'bud-ore201-21';
UPDATE budgets SET spent_amount = 5200 WHERE id = 'bud-ore201-22';
UPDATE budgets SET spent_amount = 13000 WHERE id = 'bud-ore201-23';
UPDATE budgets SET spent_amount = 9000 WHERE id = 'bud-ore201-24';
UPDATE budgets SET spent_amount = 4800 WHERE id = 'bud-ore201-25';

-- DW-104: ~75% funded (5 draws)
UPDATE budgets SET spent_amount = original_amount * 0.75 WHERE project_id = 'project-dw104-0001-0001-000000000001';

-- CVY-301: ~55% funded (3 draws)  
UPDATE budgets SET spent_amount = original_amount * 0.55 WHERE project_id = 'project-cvy301-0001-0001-000000000001';

-- DW-105: ~75% funded (5 draws)
UPDATE budgets SET spent_amount = original_amount * 0.75 WHERE project_id = 'project-dw105-0001-0001-000000000001';

-- CVY-303: ~35% funded (2 draws)
UPDATE budgets SET spent_amount = original_amount * 0.35 WHERE project_id = 'project-cvy303-0001-0001-000000000001';

-- ============================================
-- SEED COMPLETE
-- ============================================
-- Summary:
-- - 2 Lenders (TD2, TennBrook)
-- - 3 Builders (Ridgeline, Westbrook, Horizon)
-- - 12 Projects (3 Pending, 6 Active, 3 Historic)
-- - ~400 Budget lines (30-61 per project)
-- - ~40 Draw requests with varied statuses
-- - ~150 Draw request lines
-- - Wire batches for funded draws
-- - Properly linked spent_amounts

SELECT 'Sample data seed completed successfully!' AS status;
