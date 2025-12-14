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
├── project_code (TEXT)         -- e.g., "DW-244"
├── builder_name (TEXT)
├── borrower_name (TEXT)
├── subdivision_name (TEXT)     -- e.g., "Discovery West"
├── subdivision_abbrev (TEXT)   -- e.g., "DW"
├── lot_number (TEXT)           -- e.g., "244"
├── loan_amount (DECIMAL)
├── interest_rate_annual (DECIMAL)
├── loan_start_date (DATE)
├── maturity_date (DATE)
├── status (TEXT)               -- active, closed, default
└── created_at, updated_at

budgets
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── category (TEXT)             -- Standardized NAHB category
├── builder_category_raw (TEXT) -- Original from spreadsheet
├── original_amount (DECIMAL)
├── current_amount (DECIMAL)    -- After change orders
├── spent_amount (DECIMAL)      -- Sum of funded draws
├── remaining_amount (DECIMAL)  -- Generated: current - spent
├── nahb_category (TEXT)        -- Major category
├── nahb_subcategory (TEXT)
├── cost_code (TEXT)            -- e.g., "02100"
├── ai_confidence (DECIMAL)     -- 0-1 mapping confidence
└── created_at, updated_at

draw_requests
├── id (UUID, PK)
├── project_id (UUID, FK → projects)
├── draw_number (INTEGER)
├── status (TEXT)               -- pending, approved, funded
├── total_amount (DECIMAL)
├── request_date (DATE)
├── notes (TEXT)
└── created_at, updated_at

draw_request_lines
├── id (UUID, PK)
├── draw_request_id (UUID, FK → draw_requests)
├── budget_id (UUID, FK → budgets)
├── amount_requested (DECIMAL)
├── amount_approved (DECIMAL)
├── confidence_score (DECIMAL)  -- AI matching confidence
├── invoice_vendor_name (TEXT)
├── invoice_number (TEXT)
├── invoice_amount (DECIMAL)
├── flags (TEXT)                -- Validation warnings
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

nahb_cost_codes
├── code (TEXT, PK)             -- e.g., "02100"
├── category (TEXT)             -- Major category
├── subcategory (TEXT)
├── parent_code (TEXT)
└── sort_order (INTEGER)

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
          └─< draw_requests ─┬─< draw_request_lines ─── budgets
                             │
                             └─< invoices
                             │
                             └─< approvals
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
