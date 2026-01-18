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
export type Builder = Database["public"]["Tables"]["builders"]["Row"]
export type Lender = Database["public"]["Tables"]["lenders"]["Row"]

// Insert types (for creating)
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"]
export type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"]
export type BuilderInsert = Database["public"]["Tables"]["builders"]["Insert"]
export type BuilderUpdate = Database["public"]["Tables"]["builders"]["Update"]
// ... etc
```

**Custom Types:**
```typescript
// Loan lifecycle stages
export type LifecycleStage = 'pending' | 'active' | 'historic'

// Document types for origination
export type DocumentType = 'floorplan' | 'valuation' | 'loan_agreement' | 'insurance' | 'other'

// Draw request status values
export type DrawStatus = 'draft' | 'review' | 'staged' | 'pending_wire' | 'funded' | 'rejected'

// Draw line flag codes
export type DrawLineFlag = 
  | 'AMOUNT_MISMATCH'    // Invoice total doesn't match requested
  | 'NO_INVOICE'         // No invoice attached
  | 'OVER_BUDGET'        // Would exceed remaining budget
  | 'LOW_CONFIDENCE'     // AI confidence < 70%
  | 'DUPLICATE_INVOICE'  // Invoice already used
  | 'NO_BUDGET_MATCH'    // Category not found in budget

// Human-readable flag labels
export const DRAW_FLAG_LABELS: Record<DrawLineFlag, string> = {
  AMOUNT_MISMATCH: 'Invoice total doesn\'t match requested amount',
  NO_INVOICE: 'No invoice attached',
  OVER_BUDGET: 'Would exceed remaining budget',
  LOW_CONFIDENCE: 'Low confidence in AI match',
  DUPLICATE_INVOICE: 'Invoice already used in previous draw',
  NO_BUDGET_MATCH: 'Category not found in budget'
}

// Human-readable status labels
export const DRAW_STATUS_LABELS: Record<DrawStatus, string> = {
  draft: 'Draft',
  review: 'Ready for Review',
  staged: 'Staged for Funding',
  pending_wire: 'Pending Wire',
  funded: 'Funded',
  rejected: 'Rejected'
}

// Default term sheet configuration (with extension fee support)
export const DEFAULT_TERM_SHEET = {
  interest_rate_annual: 0.11,           // 11%
  origination_fee_pct: 0.02,            // 2%
  fee_escalation_pct: 0.0025,           // +0.25% per month after 6 months
  fee_escalation_after_months: 6,       // Fee escalation starts after month 6
  fee_rate_at_month_7: 0.0225,          // 2.25% at month 7
  extension_fee_month: 13,              // Extension fee applies at month 13
  extension_fee_rate: 0.059,            // 5.90% at extension
  post_extension_escalation: 0.004,     // +0.40% per month after 13 months
  document_fee: 1000,                   // $1000
  loan_term_months: 12                  // 12 months
}

// Extended project type with lifecycle
export type ProjectWithLifecycle = Project & {
  lifecycle_stage: LifecycleStage
  stage_changed_at: string | null
  square_footage: number | null
  appraised_value: number | null
  ltv_ratio: number | null
  cost_per_sqft: number | null
}

// Project with builder relation
export type ProjectWithBuilder = Project & {
  builder?: Builder | null
}

// Project with budget totals for list views
export type ProjectWithBudget = Project & {
  lifecycle_stage: LifecycleStage
  total_budget: number
  total_spent: number
  builder?: Builder | null
  lender?: Lender | null
}

// Project with draws for Builder Timeline
export type ProjectWithDraws = Project & {
  draws: DrawRequest[]
  lender?: Lender | null
  total_budget: number
  total_spent: number
}

// Draw with project relation for staging views
export type DrawWithProject = DrawRequest & {
  project?: Project | null
}

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

### Financial Calculation Types (lib/calculations.ts)

```typescript
// Draw line with date for amortization calculations
export type DrawLineWithDate = {
  amount: number
  date: string
  drawNumber?: number
}

// Amortization schedule row (compound interest)
export type AmortizationRow = {
  date: Date
  drawNumber: number | null      // null for month-end or payoff rows
  type: 'draw' | 'month_end' | 'payoff' | 'current'
  description: string
  drawAmount: number             // Draw amount only (0 for non-draw rows)
  days: number                   // Days since LAST ACCRUAL event
  accruedInterest: number        // Interest accrued THIS period
  totalInterest: number          // Cumulative compound interest
  feeRate: number                // Current fee rate (with escalation)
  principal: number              // Sum of all draws to date
  totalBalance: number           // Principal + totalInterest (compound)
}

// Complete payoff breakdown
export type PayoffBreakdown = {
  principalBalance: number
  accruedInterest: number
  daysOfInterest: number
  perDiem: number
  financeFee: number
  documentFee: number
  credits: number
  totalPayoff: number
  goodThroughDate: Date
  feeRate: number
  feeRatePct: string
  isExtension: boolean
  monthNumber: number
}

// Data point for projection charts
export type ProjectionDataPoint = {
  month: number
  date: string
  feeRate: number
  cumulativeFee: number
  cumulativeInterest: number
  totalPayoff: number
  isActual: boolean
  isCurrentMonth: boolean
}
```

### Loan Terms Types (lib/loanTerms.ts)

```typescript
// Complete loan terms structure
export type LoanTerms = {
  interestRateAnnual: number
  baseFee: number
  feeEscalationPct: number
  feeEscalationAfterMonths: number
  feeRateAtMonth7: number
  extensionFeeMonth: number
  extensionFeeRate: number
  postExtensionEscalation: number
  documentFee: number
  loanTermMonths: number
}

// Urgency levels for maturity tracking
export type UrgencyLevel = 'critical' | 'urgent' | 'warning' | 'caution' | 'normal'
```

### Anomaly Detection Types (lib/anomalyDetection.ts)

```typescript
// Types of detectable anomalies
export type AnomalyType =
  | 'SPENDING_SPIKE'      // Single draw > 50% of category budget
  | 'VELOCITY_HIGH'       // Spending faster than typical pace
  | 'OVER_BUDGET'         // Category exceeded budget
  | 'LARGE_VARIANCE'      // Draw variance from invoice > 10%
  | 'DORMANT_CATEGORY'    // Budget allocated but no draws in 60+ days

// Anomaly object
export type Anomaly = {
  type: AnomalyType
  severity: 'info' | 'warning' | 'critical'
  budgetId?: string
  drawId?: string
  message: string
  suggestion?: string
}
```

### Report UI Types

```typescript
// Report type for toggle control
export type ReportType = 'budget' | 'amortization' | 'payoff'

// View mode for report display
export type ViewMode = 'table' | 'cards' | 'chart'

// Detail panel content types
export type DetailItemType = 'budgetLine' | 'draw' | 'anomaly'
```

### Builder Timeline Types

```typescript
// Timeline view mode toggle
export type TimelineViewMode = 'spreadsheet' | 'gantt'

// Lender group for timeline sections
export type LenderGroup = {
  lenderId: string
  lender: Lender | null
  projects: ProjectWithDraws[]
}

// Staged draw mapping by project
export type StagedDrawsByProject = Map<string, DrawWithProject[]>
```

### Draw Dashboard Types

```typescript
// Draw status filter values
export type DrawStatus = 'all' | 'review' | 'staged' | 'pending_wire'

// Builder with aggregated staged draws
export type BuilderWithDraws = Builder & {
  stagedDraws: DrawWithProject[]
  totalAmount: number
}

// Wire batch with related data
export type WireBatchWithDetails = WireBatch & {
  builder?: Builder
  draws?: DrawWithProject[]
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
| `projects` | Construction loans | name, project_code, builder_id, lender_id, loan_amount, lifecycle_stage |
| `builders` | Builder/contractor companies | company_name, borrower_name, bank_name, phone, email |
| `lenders` | Lending entities | name, code (TD2, TENBROOK, TENNANT), is_active |
| `budgets` | Budget line items | category, original_amount, spent_amount, nahb_category, builder_category_raw |
| `draw_requests` | Draw request headers | draw_number, status (review/staged/pending_wire/funded), total_amount, funded_at |
| `draw_request_lines` | Individual draw items | budget_id, amount_requested, flags (JSON array), notes |
| `wire_batches` | Wire groupings per builder | builder_id, status, total_amount, wire_date |
| `invoices` | Invoice records | vendor_name, amount, matched_to_category, draw_request_line_id, status |
| `nahb_categories` | NAHB parent categories | code, name, sort_order |
| `nahb_subcategories` | NAHB child categories | category_id, code, name |
| `audit_events` | Immutable audit trail | entity_type, entity_id, action, actor |
