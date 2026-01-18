# Supabase Setup

TD3 uses Supabase for PostgreSQL database, authentication, and file storage.

**Project ID:** `uewqcbmaiuofdfvqmbmq`

---

## Database Schema

### Core Tables

```
projects
├── id (UUID, PK)
├── name (TEXT)
├── project_code (TEXT)         -- Auto-generated: "DW-244"
├── builder_id (UUID, FK → builders)  -- Links to builder entity
├── lender_id (UUID, FK → lenders)    -- Required for activation (Pending→Active)
├── borrower_name (TEXT)              -- Auto-filled from builder.borrower_name
├── subdivision_name (TEXT)     -- e.g., "Discovery West"
├── subdivision_abbrev (TEXT)   -- e.g., "DW"
├── lot_number (TEXT)           -- e.g., "244"
├── address (TEXT)              -- Property address
├── loan_amount (DECIMAL)
├── lifecycle_stage (TEXT)      -- pending, active, historic
├── stage_changed_at (TIMESTAMP)
├── square_footage (DECIMAL)
├── appraised_value (DECIMAL)   -- Estimated value for LTV calculation
├── -- Term Sheet Fields --
├── interest_rate_annual (DECIMAL) -- Default: 11% (stored as 0.11)
├── origination_fee_pct (DECIMAL)  -- Default: 2% (stored as 0.02)
├── fee_escalation_pct (DECIMAL)   -- Default: 0.25%/month after 6mo (stored as 0.0025)
├── document_fee (DECIMAL)         -- Default: $1000
├── loan_term_months (INTEGER)     -- Default: 12
├── loan_start_date (DATE)         -- Used for fee escalation calculations
├── maturity_date (DATE)           -- Calculated: loan_start_date + loan_term_months
├── loan_docs_recorded (BOOLEAN)   -- True when loan docs executed
├── loan_docs_recorded_at (TIMESTAMP)
├── status (TEXT)               -- active, closed, default
└── created_at, updated_at

budgets
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── subcategory_id (UUID, FK → nahb_subcategories) -- NEW: ID-based FK
├── category (TEXT)             -- Standardized NAHB category
├── builder_category_raw (TEXT) -- Original from spreadsheet
├── original_amount (DECIMAL)
├── current_amount (DECIMAL)    -- After change orders
├── spent_amount (DECIMAL)      -- Sum of funded draws
├── remaining_amount (DECIMAL)  -- Generated: current - spent
├── nahb_category (TEXT)        -- Major category (legacy text)
├── nahb_subcategory (TEXT)     -- Subcategory name (legacy text)
├── cost_code (TEXT)            -- e.g., "0210" (legacy text)
├── ai_confidence (DECIMAL)     -- 0-1 mapping confidence
└── created_at, updated_at

draw_requests
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── draw_number (INTEGER)
├── status (TEXT)               -- review, staged, pending_wire, funded
├── total_amount (DECIMAL)
├── request_date (DATE)
├── funded_at (TIMESTAMP)       -- When wire was sent
├── wire_batch_id (UUID, FK)    -- Groups draws per wire
├── notes (TEXT)
└── created_at, updated_at

draw_request_lines
├── id (UUID, PK)
├── draw_request_id (UUID, FK → draw_requests, ON DELETE CASCADE)
├── budget_id (UUID, FK → budgets, ON DELETE SET NULL)  -- NULL if unmatched
├── amount_requested (DECIMAL)
├── amount_approved (DECIMAL)
├── matched_invoice_amount (DECIMAL)
├── variance (DECIMAL)          -- Difference from invoice
├── invoice_file_url (TEXT)
├── invoice_file_name (TEXT)
├── invoice_vendor_name (TEXT)
├── invoice_number (TEXT)
├── confidence_score (DECIMAL)  -- AI matching confidence
├── flags (TEXT)                -- JSON array: NO_BUDGET_MATCH, OVER_BUDGET, etc.
├── notes (TEXT)                -- Original category if unmatched
└── created_at

NOTE: budget_id uses ON DELETE SET NULL (not CASCADE) to preserve draw line items
when budgets are reimported. This protects historical funded draw records.
Application logic additionally prevents deletion of budgets with funded draws.

wire_batches
├── id (UUID, PK)
├── builder_id (UUID, FK → builders)
├── status (TEXT)               -- pending, sent, confirmed
├── total_amount (DECIMAL)
├── wire_date (DATE)
├── confirmation_number (TEXT)
├── notes (TEXT)
└── created_at

invoices
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── draw_request_id (UUID, FK → draw_requests)
├── draw_request_line_id (UUID, FK → draw_request_lines)
├── vendor_name (TEXT)
├── invoice_number (TEXT)
├── invoice_date (DATE)
├── amount (DECIMAL)
├── matched_to_category (TEXT)
├── matched_to_nahb_code (TEXT)
├── confidence_score (DECIMAL)
├── file_path (TEXT)
├── file_url (TEXT)
├── status (TEXT)               -- pending, matched, verified
└── created_at, updated_at

nahb_cost_codes (LEGACY)
├── code (TEXT, PK)             -- e.g., "02100"
├── category (TEXT)             -- Major category
├── subcategory (TEXT)
├── parent_code (TEXT)
└── sort_order (INTEGER)

nahb_categories (NEW - Hierarchical)
├── id (UUID, PK)
├── code (VARCHAR(4), UNIQUE)   -- e.g., "0100", "0200"
├── name (VARCHAR(100))         -- e.g., "General Conditions"
├── sort_order (INTEGER)
└── created_at

nahb_subcategories (NEW - Hierarchical)
├── id (UUID, PK)
├── category_id (UUID, FK → nahb_categories)
├── code (VARCHAR(4), UNIQUE)   -- e.g., "0110", "0120"
├── name (VARCHAR(100))         -- e.g., "Project Management & Admin"
├── sort_order (INTEGER)
└── created_at

builders
├── id (UUID, PK)
├── company_name (TEXT)         -- Builder company name
├── borrower_name (TEXT)        -- Auto-fills to project.borrower_name
├── phone (TEXT)                -- Contact phone
├── email (TEXT)                -- Contact email
├── address (TEXT)
├── city (TEXT)
├── state (TEXT)
├── zip (TEXT)
├── bank_name (TEXT)            -- For wire transfers, shown in project origination
├── bank_routing_number (TEXT)
├── bank_account_number (TEXT)
├── is_active (BOOLEAN)
├── notes (TEXT)                -- Internal notes
└── created_at, updated_at

lenders
├── id (UUID, PK)
├── name (TEXT)                 -- Display name (e.g., "TD2", "TenBrook")
├── code (TEXT)                 -- Short code (TD2, TENBROOK, TENNANT)
├── is_active (BOOLEAN)
└── created_at

audit_events
├── id (UUID, PK)
├── entity_type (TEXT)          -- project, budget, draw_request, etc.
├── entity_id (UUID)
├── action (TEXT)               -- create, update, delete, approve
├── actor (TEXT)                -- User identifier
├── old_data (JSONB)
├── new_data (JSONB)
├── metadata (JSONB)
└── created_at (immutable)

approvals
├── id (UUID, PK)
├── draw_request_id (UUID, FK → draw_requests)
├── step_number (INTEGER)
├── approved_by (TEXT)
├── decision (TEXT)             -- approved, rejected, pending
├── comments (TEXT)
├── decided_at (TIMESTAMP)
└── created_at

documents
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── draw_request_id (UUID, FK → draw_requests)
├── invoice_id (UUID, FK → invoices)
├── file_name (TEXT)
├── file_path (TEXT)
├── file_url (TEXT)
├── file_size (INTEGER)
├── mime_type (TEXT)
├── file_hash (TEXT)            -- For duplicate detection
└── uploaded_at
```

### Relationships

```
projects ─┬─< budgets
          │
          ├─< draw_requests ─┬─< draw_request_lines ─── budgets
          │                  │
          │                  ├─< invoices
          │                  │
          │                  └─< approvals
          │
          ├──── builders (FK: builder_id)
          │
          └──── lenders (FK: lender_id)
```

---

## Quick Start

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Schema SQL

Execute the schema SQL in Supabase SQL Editor. Contact the repository owner for the complete schema file.

### 3. Create Storage Bucket

Create a bucket named `documents`:
- Public: No (use signed URLs)
- File size limit: 10MB
- Allowed MIME types: `application/pdf`, `image/*`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### 4. Configure Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Common Queries

### Get Project with Budget Summary

```sql
SELECT 
  p.*,
  COALESCE(SUM(b.current_amount), 0) as total_budget,
  COALESCE(SUM(b.spent_amount), 0) as total_spent,
  COUNT(DISTINCT dr.id) as draw_count
FROM projects p
LEFT JOIN budgets b ON b.project_id = p.id
LEFT JOIN draw_requests dr ON dr.project_id = p.id
WHERE p.id = $1
GROUP BY p.id
```

### Get Draw Request with Lines

```sql
SELECT 
  dr.*,
  json_agg(
    json_build_object(
      'id', drl.id,
      'budget_category', b.category,
      'amount_requested', drl.amount_requested,
      'confidence', drl.confidence_score
    )
  ) as lines
FROM draw_requests dr
LEFT JOIN draw_request_lines drl ON drl.draw_request_id = dr.id
LEFT JOIN budgets b ON b.id = drl.budget_id
WHERE dr.id = $1
GROUP BY dr.id
```

### Insert Budget from n8n

```sql
INSERT INTO budgets (
  project_id,
  category,
  builder_category_raw,
  original_amount,
  current_amount,
  spent_amount,
  nahb_category,
  nahb_subcategory,
  cost_code,
  ai_confidence
) VALUES (
  $project_id,
  $nahb_standardized_category,
  $original_builder_category,
  $amount,
  $amount,
  0,
  $nahb_major_category,
  $nahb_subcategory,
  $nahb_code,
  $ai_confidence_score
)
```

### Delete Unprotected Budgets for Project (Used Before Re-Import)

```sql
-- First, identify protected budgets (those with funded/pending_wire draws)
WITH protected_budgets AS (
  SELECT DISTINCT b.id
  FROM budgets b
  JOIN draw_request_lines drl ON drl.budget_id = b.id
  JOIN draw_requests dr ON dr.id = drl.draw_request_id
  WHERE b.project_id = $project_id
    AND dr.status IN ('funded', 'pending_wire')
)
-- Then delete only unprotected budgets
DELETE FROM budgets 
WHERE project_id = $project_id
  AND id NOT IN (SELECT id FROM protected_budgets);
```

This is used by:
1. **ImportPreview** - When "Replace existing budget" checkbox is checked (excludes protected budgets)
2. **BudgetEditor** - When "Clear All" button is clicked

**Note:** Budgets with funded draws are protected and cannot be deleted. The application shows a warning listing protected categories.

### Get Categories with Subcategories (For Dropdowns)

```sql
-- Get all categories
SELECT id, code, name FROM nahb_categories ORDER BY sort_order;

-- Get subcategories for a specific category
SELECT id, code, name 
FROM nahb_subcategories 
WHERE category_id = $category_id 
ORDER BY sort_order;
```

### Get Draw Lines for Amortization (With Funded Draws)

```sql
-- Get draw lines with dates for amortization calculations
SELECT 
  drl.amount_approved AS amount,
  COALESCE(dr.funded_at, dr.request_date) AS date,
  dr.draw_number
FROM draw_request_lines drl
JOIN draw_requests dr ON dr.id = drl.draw_request_id
WHERE dr.project_id = $project_id
  AND dr.status = 'funded'
ORDER BY dr.funded_at, dr.draw_number;
```

### Get Project with Term Sheet

```sql
-- Get project with all term sheet fields
SELECT 
  id,
  name,
  loan_amount,
  loan_start_date,
  maturity_date,
  interest_rate_annual,
  origination_fee_pct,
  fee_escalation_pct,
  document_fee,
  loan_term_months,
  lifecycle_stage
FROM projects
WHERE id = $project_id;
```

### Get Budget Summary with Anomaly Data

```sql
-- Get budgets with spend rates for anomaly detection
SELECT 
  b.*,
  CASE 
    WHEN b.current_amount > 0 
    THEN (b.spent_amount::float / b.current_amount * 100) 
    ELSE 0 
  END as percent_spent,
  (b.current_amount - b.spent_amount) as remaining_amount,
  nc.name as category_name
FROM budgets b
LEFT JOIN nahb_categories nc ON b.nahb_category = nc.name
WHERE b.project_id = $project_id
ORDER BY b.sort_order;
```

---

## Row Level Security (RLS)

Currently RLS is disabled for development. For production:

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- etc.

-- Create policies based on user authentication
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM project_members WHERE project_id = id
  ));
```

---

## Migrations

For schema changes, use Supabase migrations:

```bash
# Create a new migration
supabase migration new add_column_to_budgets

# Apply migrations
supabase db push

# Generate updated types
npx supabase gen types typescript --project-id uewqcbmaiuofdfvqmbmq > types/database.ts
```
