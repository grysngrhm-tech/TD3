# TypeScript Types

This folder contains TypeScript type definitions for the TD3 application.

## Files

### `database.ts`

Auto-generated Supabase types plus custom helper types.

**Generated Types (from Supabase schema):**
- `Database` - Root type with all table definitions
- Table Row/Insert/Update types for each table

**Helper Type Aliases:**
```typescript
// Row types (for reading)
export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type Budget = Database["public"]["Tables"]["budgets"]["Row"]
export type DrawRequest = Database["public"]["Tables"]["draw_requests"]["Row"]
export type DrawRequestLine = Database["public"]["Tables"]["draw_request_lines"]["Row"]
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Approval = Database["public"]["Tables"]["approvals"]["Row"]
export type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"]
export type NahbCostCode = Database["public"]["Tables"]["nahb_cost_codes"]["Row"]

// Insert types (for creating)
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"]
export type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"]
// ... etc
```

**Custom Types:**
```typescript
// Validation result structure
export type ValidationResult = {
  overages: Array<{ budgetId, category, requested, remaining, overage }>
  missingDocs: Array<{ lineId, category, amount }>
  duplicateInvoices: Array<{ invoiceId, vendor, amount, matchedWith }>
  categoryMismatches: Array<{ lineId, expected, actual }>
  flags: string[]
  isValid: boolean
}

// Extended types with relations
export type DrawRequestWithDetails = DrawRequest & {
  project?: Project
  invoices?: Invoice[]
  documents?: Document[]
}
```

## Regenerating Types

If the Supabase schema changes, regenerate types:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Generate types from your project
npx supabase gen types typescript --project-id uewqcbmaiuofdfvqmbmq > types/database.ts
```

**Note:** After regenerating, you may need to re-add custom helper types at the bottom of the file.

## Usage

```typescript
import type { Project, Budget, DrawRequest } from '@/types/database'

// Typing function parameters
async function createBudget(data: BudgetInsert): Promise<Budget> {
  // ...
}

// Typing API responses
const projects: Project[] = await supabase
  .from('projects')
  .select('*')
```

## Key Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `projects` | Construction loans | name, project_code, builder_name, loan_amount |
| `budgets` | Budget line items | category, original_amount, spent_amount, nahb_category |
| `draw_requests` | Draw request headers | draw_number, status, total_amount |
| `draw_request_lines` | Individual draw items | budget_id, amount_requested, confidence_score |
| `invoices` | Invoice records | vendor_name, amount, matched_to_category |
| `nahb_cost_codes` | NAHB reference taxonomy | code, category, subcategory |
| `audit_events` | Immutable audit trail | entity_type, entity_id, action, actor |
