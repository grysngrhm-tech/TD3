# TD3 Technical Architecture

This document provides detailed technical information for developers and AI agents working on the TD3 system.

---

## System Components

### 1. Web Application (Next.js)

**Purpose:** User interface for managing construction loans throughout their lifecycle, from origination through payoff.

**Key Responsibilities:**
- Loan lifecycle management (Pending → Active → Historic)
- Client-side spreadsheet parsing with SheetJS (xlsx-js-style)
- Smart column detection using multi-signal pattern analysis
- Intelligent row boundary detection with visual classification
- Interactive column mapping and row range selection UI
- Project/budget/draw data display
- Webhook calls to n8n workflows

**Technology:**
- Next.js 14 with App Router
- React 18 with hooks
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI for accessible components
- xlsx-js-style for Excel parsing with formatting support

### 2. n8n Workflows (AI Processing)

**Purpose:** Backend automation that receives spreadsheet data from the webapp and uses OpenAI to process, standardize, and insert data into Supabase.

**Key Responsibilities:**
- Receive column data from webapp webhooks
- Use OpenAI to filter valid rows and identify budget items
- Standardize builder categories to NAHB cost codes
- Match draw request categories to existing budget lines
- Insert processed data into Supabase tables

### 3. Supabase (Database + Auth)

**Purpose:** PostgreSQL database storing all application data with Row Level Security.

**Key Responsibilities:**
- Store projects, budgets, draw requests, invoices
- Maintain audit trail of all changes
- Provide real-time subscriptions for UI updates

### 4. OpenAI (AI Processing)

**Purpose:** Intelligent text processing called from n8n workflows.

**Key Responsibilities:**
- Identify valid budget rows vs. headers/totals/empty rows
- Map builder budget categories to NAHB cost codes
- Match draw request line items to existing budget categories

---

## Loan Lifecycle System

TD3 tracks loans through three stages:

| Stage | Description | Primary Tab |
|-------|-------------|-------------|
| **Pending** | Loan in origination - collecting documents, budget review | Origination |
| **Active** | Loan funded - tracking draws and payments | Status |
| **Historic** | Loan completed - paid off or rejected | Performance |

### Stage Transitions

```
┌──────────────┐   "Loan Documents  ┌──────────────┐    "Payoff         ┌──────────────┐
│   PENDING    │ ────────────────▶  │    ACTIVE    │ ────────────────▶  │   HISTORIC   │
│              │    Recorded"       │              │    Approved"       │              │
│  Origination │    Checkbox        │  Draw Mgmt   │    Checkbox        │  Analytics   │
└──────────────┘                    └──────────────┘                    └──────────────┘
       │                                                                       ▲
       │                           Rejected                                    │
       └───────────────────────────────────────────────────────────────────────┘
```

### Stage Transition Controls

**Pending → Active:**
- **Control**: "Loan Documents Recorded" checkbox in Origination tab
- **Optional**: Link to uploaded loan agreement document
- **Behavior**: Checking updates `lifecycle_stage` to 'active' and records `stage_changed_at`

**Active → Historic:**
- **Control**: "Payoff Approved" checkbox in Status tab (active loans only)
- **Optional**: Link to uploaded payoff documentation
- **Behavior**: Checking updates `lifecycle_stage` to 'historic' and records payoff date

### UI Implementation

- **Home Page**: iOS-style segmented control to filter by stage (default: Active)
- **Dashboard Page**: Staging area for draw management and builder operations
- **Loan Page**: Tabbed interface with progressive disclosure based on stage
- **Stage Indicator**: Visual badges on project tiles

---

## Draw Funding System

TD3 implements a comprehensive draw request workflow that handles the entire process from invoice upload through wire transfer.

### Draw Request Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DRAFT     │────▶│   REVIEW    │────▶│   STAGED    │────▶│PENDING_WIRE │────▶│   FUNDED    │
│             │     │             │     │             │     │             │     │             │
│ Upload Draw │     │ User Review │     │ Ready to    │     │ Bookkeeper  │     │ Wire Sent   │
│ & Invoices  │     │ & Edit      │     │ Fund        │     │ Processing  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Draw Status Values

| Status | Description | User Action |
|--------|-------------|-------------|
| `review` | Draw created, awaiting user review | Edit amounts, assign categories, attach invoices |
| `staged` | Draw approved, grouped with builder's other draws | None - waiting for other draws |
| `pending_wire` | All builder draws approved, sent to bookkeeper | Bookkeeper processes wire |
| `funded` | Wire sent, draw complete | Locked - no further edits |

### Key Features

**1. Intelligent Category Matching**
- Fuzzy matching algorithm with 0.6 threshold
- Levenshtein distance for typo handling
- Tokenized word matching for word order variations
- Matches against `builder_category_raw` first, then NAHB categories

**2. Cascading Dropdowns for Unmatched Lines**
- First dropdown: NAHB Category (filtered to available budgets)
- Second dropdown: Budget items in selected category
- Auto-filters to exclude already-assigned budgets

**3. Invoice Management**
- Drag-and-drop upload on draw request page
- Thumbnail previews with modal viewer
- N8N-powered AI invoice-to-category matching
- Re-run matching capability from review page

**4. Builder-Based Wire Batching**
- Multiple draws for same builder grouped into single wire
- Staging dashboard shows draws organized by builder
- One wire per builder regardless of loan count

### Draw Request Pages

| Page | Path | Purpose |
|------|------|---------|
| New Draw Request | `/draws/new` | Upload draw spreadsheet and invoices |
| Draw Review | `/draws/[id]` | Review, edit, and approve draw request |
| Staging Dashboard | `/staging` | Central hub for all draw operations |

### Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HOME PAGE                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    [DASHBOARD] Button                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                     STAGING DASHBOARD                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ ││
│  │  │New Loan  │  │New Draw  │  │New Builder│  │  [HOME] Button   │ ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ ││
│  │                                                                  ││
│  │  ┌──────────────────────────────────────────────────────────┐   ││
│  │  │            DRAWS BY BUILDER                               │   ││
│  │  │  Builder A: [Draw 1] [Draw 2] [Stage All]                │   ││
│  │  │  Builder B: [Draw 1] [Stage All]                         │   ││
│  │  └──────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Details

### Budget Import Flow (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUDGET IMPORT SEQUENCE                             │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: USER UPLOADS SPREADSHEET
────────────────────────────────
User clicks "Upload Budget" and selects an Excel/CSV file.

Step 2: WEBAPP PARSES & DETECTS COLUMNS (Enhanced)
──────────────────────────────────────────────────
Client-side JavaScript (lib/spreadsheet.ts) uses xlsx-js-style to:
  1. Parse the file with cell styles (bold, borders)
  2. Analyze column data patterns (30 rows sample)
  3. Auto-detect Category column (leftmost text column with diverse values)
  4. Auto-detect Amount column (first column with 10+ real numbers)
  5. Display interactive preview with column highlighting

Step 3: SMART ROW BOUNDARY DETECTION (New)
──────────────────────────────────────────
The system analyzes each row using multiple signals:

  Classification Types:
  • HEADER (H) - Row contains header keywords, no amounts
  • TOTAL (T) - Row contains total keywords or sum matches
  • CLOSING (C) - Row contains closing cost keywords (weighted)
  • DATA - Normal budget line item
  • EMPTY - No category content

  Detection Signals:
  • Keyword analysis (headers, totals, closing costs)
  • Position-based scoring (early rows likely headers)
  • Excel formatting (bold text indicates headers/totals)
  • Amount sum matching (running total detection)
  • Gap detection (section breaks)

  Closing Cost Keyword Weights:
  • Strong (40pts): interest, realtor, closing cost(s)
  • Medium (25pts): finance, loan fee, points, origination
  • Weak (15pts): title, escrow, recording, appraisal fee

Step 4: USER CONFIRMS & ADJUSTS
───────────────────────────────
User can:
  • Click column headers to remap Category/Amount
  • Click rows to adjust selection boundaries
  • Drag handles to resize the selected range
  • Use keyboard shortcuts (↑↓ adjust start, Shift+↑↓ adjust end, R reset)
  • View classification badges (H/T/C) on each row

Step 5: WEBAPP SENDS TO N8N WEBHOOK
───────────────────────────────────
POST to: NEXT_PUBLIC_N8N_BUDGET_WEBHOOK

Payload format:
{
  "type": "budget",
  "projectId": "uuid-of-project",
  "columns": {
    "category": {
      "header": "Item",
      "values": ["Land", "Excavation", "Foundation", ...]  // Only selected rows
    },
    "amount": {
      "header": "Rough Budget",
      "values": [50000, 19246, 35000, ...]  // Only selected rows
    }
  },
  "metadata": {
    "fileName": "Builder Budget.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 75,
    "selectedRows": 45  // Count after filtering
  }
}

Step 6: N8N WORKFLOW PROCESSES DATA
───────────────────────────────────
The workflow:
  1. Receives pre-filtered data (headers/totals already excluded)
  2. Maps categories to NAHB codes using AI
  3. Inserts into Supabase budgets table

Step 7: RETURN TO LOAN PAGE
───────────────────────────
After successful import, user returns to the loan's Origination tab
to review and edit the budget in the BudgetEditor component.
```

### Draw Request Import Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DRAW REQUEST IMPORT SEQUENCE                         │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: USER UPLOADS DRAW SPREADSHEET
─────────────────────────────────────
User navigates to /draws/new (from Dashboard, Builder Page, or Active Loan tab).
Drag-drop or click to select Excel/CSV file with draw amounts.

Step 2: WEBAPP PARSES & USER MAPS COLUMNS
─────────────────────────────────────────
ImportPreview modal shows spreadsheet with column detection.
User maps Category and Amount columns, selects row range.

Step 3: FUZZY MATCHING TO BUDGETS (Client-Side)
───────────────────────────────────────────────
For each draw category, the system finds the best matching budget:

  Matching Strategy (in order of priority):
  1. Exact match (score = 1.0)
  2. Contains match - one string contains the other (score = 0.9)
  3. Tokenized word match - common words across strings (score = 0.65-0.9)
  4. Levenshtein distance - character-level similarity (score = 0.56-0.8)

  Threshold: score >= 0.6 required for auto-match
  
  Example Matches:
  • "Framing Labor" → "Framing - Labor" (tokenized match)
  • "Electrical" → "Electrical Rough" (contains match)
  • "Plumning" → "Plumbing" (Levenshtein: 1 edit)

Step 4: CREATE DRAW REQUEST & LINES IN SUPABASE
───────────────────────────────────────────────
The webapp directly creates:
  1. draw_request record with status='review'
  2. draw_request_lines with budget_id (if matched) or flags=['NO_BUDGET_MATCH']

Step 5: UPLOAD INVOICES TO STORAGE
──────────────────────────────────
Any attached invoices are uploaded to Supabase Storage:
  Path: invoices/{projectId}/{drawId}/{uuid}-{filename}

Step 6: OPTIONAL N8N AI PROCESSING
──────────────────────────────────
After lines are created, webhook sent to N8N with enriched payload:
{
  "drawRequestId": "uuid",
  "projectId": "uuid",
  "lines": [
    {
      "lineId": "uuid",
      "builderCategory": "Framing Labor",
      "nahbCategory": "Framing",
      "nahbSubcategory": "Framing Labor",
      "costCode": "0400",
      "budgetAmount": 50000,
      "remainingAmount": 32500,
      "amountRequested": 12500
    }
  ],
  "invoiceCount": 3
}

N8N can perform AI invoice matching and update flags.

Step 7: REDIRECT TO REVIEW PAGE
───────────────────────────────
User is redirected to /draws/{drawId} to review and approve.
```

### Draw Review Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DRAW REVIEW SEQUENCE                               │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: LOAD DRAW REQUEST
─────────────────────────
Page loads:
  • Draw request details and status
  • All draw_request_lines with linked budgets
  • Project budgets (for unmatched line assignment)
  • NAHB categories and subcategories (for cascading dropdowns)
  • Attached invoices

Step 2: DISPLAY UNMATCHED LINES (IF ANY)
────────────────────────────────────────
Lines without budget_id shown in warning section:
  • Original category name from spreadsheet
  • Amount requested
  • Cascading dropdown: [Category ▼] [Budget ▼]
  
Dropdown filtering:
  • Category dropdown shows only NAHB categories with available budgets
  • Budget dropdown filters by selected category
  • Both exclude budgets already assigned to other draw lines

Step 3: USER REVIEWS MATCHED LINES
──────────────────────────────────
Table displays for matched lines:
  | Builder Category | Budget | Remaining | Draw Request | Flags | Invoice |
  |------------------|--------|-----------|--------------|-------|---------|
  | Framing Labor    | $50,000| $32,500   | $12,500 (edit)| ⚠️    | 📎      |

Step 4: USER CAN EDIT/ATTACH
────────────────────────────
  • Click amount to edit
  • Click "Attach Invoices" to upload more
  • Click "Re-run Invoice Matching" to trigger N8N again

Step 5: APPROVE DRAW
────────────────────
User clicks "Stage for Funding" → status changes to 'staged'
Draw appears in builder's staging group on Dashboard.
```

---

## Column Detection Algorithm

The webapp uses multi-signal pattern analysis (`lib/spreadsheet.ts`):

### Category Detection
1. Scan columns left-to-right
2. For each column, analyze first 30 rows
3. Count text values vs. numeric values
4. First column where >40% are text AND has >3 unique values = Category
5. Prioritize if header contains keywords: "item", "category", "description"

### Amount Detection
1. After finding Category, scan remaining columns
2. Require column to have **10+ real numbers** (not just placeholders like "-")
3. Currency patterns: "$1,234.56", "1234", "(500)" for negatives
4. Prioritize columns with keywords: "budget", "amount", "cost", "total"
5. First matching column = Amount

### Row Boundary Detection (New)

Multi-signal analysis determines the data range:

**Signal Scoring:**
```typescript
// Header Detection
headerScore += 50  // if has header keyword
headerScore += 20  // if bold without amount
headerScore += 10  // if has category but no amount
headerScore += 25  // if in first 3 rows
headerScore += 15  // if follows gap

// Total Detection
totalScore += 40   // if has total keyword
totalScore += 20   // if bold
totalScore += 15   // if amount matches running sum

// Closing Cost Detection (weighted by keyword)
closingScore += keyword.weight  // 15/25/40 based on keyword
closingScore += 10              // if bold
```

**Classification Thresholds:**
- Header: headerScore >= 50
- Total: totalScore >= 45
- Closing: closingScore >= 35
- Data: has category but below thresholds

---

## Database Schema Overview

### Core Tables

```sql
-- Builders: Builder/contractor company information
builders (
  id                  UUID PRIMARY KEY,
  company_name        TEXT NOT NULL,
  borrower_name       TEXT,            -- Personal guarantor
  email               TEXT,
  phone               TEXT,
  address_street      TEXT,
  address_city        TEXT,
  address_state       TEXT,
  address_zip         TEXT,
  bank_name           TEXT,
  bank_routing_number TEXT,            -- Masked on display
  bank_account_number TEXT,            -- Masked on display
  bank_account_name   TEXT,
  notes               TEXT,
  created_at          TIMESTAMP,
  updated_at          TIMESTAMP
)

-- Lenders: Lending entities (for multi-lender support and future RLS)
lenders (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,    -- 'TD2', 'TENBROOK', 'TENNANT'
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP
)

-- Projects: Top-level entity for each construction loan
projects (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  project_code    TEXT,           -- Auto-generated: "DW-244"
  builder_id      UUID REFERENCES builders,  -- FK to builders table
  lender_id       UUID REFERENCES lenders,   -- FK to lenders table
  borrower_name   TEXT,           -- Auto-filled from builder profile
  subdivision_name TEXT,
  subdivision_abbrev TEXT,        -- e.g., "DW"
  lot_number      TEXT,           -- e.g., "244"
  loan_amount     DECIMAL,
  lifecycle_stage TEXT,           -- pending, active, historic
  stage_changed_at TIMESTAMP,
  square_footage  DECIMAL,
  appraised_value DECIMAL,
  payoff_date     DATE,           -- For historic loans
  payoff_amount   DECIMAL,        -- For historic loans
  -- Term Sheet Fields
  interest_rate_annual DECIMAL,   -- Default: 11%
  origination_fee_pct DECIMAL,    -- Default: 2%
  fee_escalation_pct DECIMAL,     -- Default: 0.25% per month after 6mo
  document_fee DECIMAL,           -- Default: $1000
  loan_term_months INTEGER,       -- Default: 12
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMP
)

-- Budgets: Line items within a project budget
budgets (
  id                  UUID PRIMARY KEY,
  project_id          UUID REFERENCES projects,
  subcategory_id      UUID REFERENCES nahb_subcategories,  -- NEW: FK to hierarchical table
  cost_code           TEXT,               -- NAHB code like "0210" (legacy text)
  category            TEXT NOT NULL,      -- Display category name
  nahb_category       TEXT,               -- Legacy: NAHB major category name
  nahb_subcategory    TEXT,               -- Legacy: NAHB subcategory name
  builder_category_raw TEXT,              -- Original from spreadsheet
  original_amount     DECIMAL,
  current_amount      DECIMAL,            -- After change orders
  spent_amount        DECIMAL DEFAULT 0,  -- Sum of funded draws
  remaining_amount    DECIMAL GENERATED,  -- current - spent
  ai_confidence       DECIMAL,            -- 0-1 confidence in mapping
  sort_order          INTEGER
)

-- NAHB Categories: Hierarchical parent categories (NEW)
nahb_categories (
  id          UUID PRIMARY KEY,
  code        VARCHAR(4) UNIQUE,  -- e.g., "0100", "0200"
  name        VARCHAR(100),       -- e.g., "General Conditions"
  sort_order  INTEGER,
  created_at  TIMESTAMP
)

-- NAHB Subcategories: Child categories with FK to parent (NEW)
nahb_subcategories (
  id          UUID PRIMARY KEY,
  category_id UUID REFERENCES nahb_categories,
  code        VARCHAR(4) UNIQUE,  -- e.g., "0110", "0120"
  name        VARCHAR(100),       -- e.g., "Project Management & Admin"
  sort_order  INTEGER,
  created_at  TIMESTAMP
)

-- Draw Requests: Header record for draw submissions
draw_requests (
  id              UUID PRIMARY KEY,
  project_id      UUID REFERENCES projects,
  draw_number     INTEGER,
  status          TEXT,             -- review, staged, pending_wire, funded
  total_amount    DECIMAL,
  request_date    DATE,
  funded_at       TIMESTAMP,        -- When wire was sent
  wire_batch_id   UUID REFERENCES wire_batches,  -- Groups draws per wire
  notes           TEXT,
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP
)

-- Draw Request Lines: Individual line items in a draw
draw_request_lines (
  id                    UUID PRIMARY KEY,
  draw_request_id       UUID REFERENCES draw_requests,
  budget_id             UUID REFERENCES budgets,    -- Link to budget line
  amount_requested      DECIMAL,
  amount_approved       DECIMAL,
  matched_invoice_amount DECIMAL,
  variance              DECIMAL,                    -- Difference from invoice
  invoice_file_url      TEXT,
  invoice_file_name     TEXT,
  invoice_vendor_name   TEXT,
  invoice_number        TEXT,
  confidence_score      DECIMAL,                    -- AI matching confidence
  flags                 TEXT,                       -- JSON array of flag codes
  notes                 TEXT,                       -- Original category if unmatched
  created_at            TIMESTAMP
)

-- Wire Batches: Groups draws for single wire per builder
wire_batches (
  id              UUID PRIMARY KEY,
  builder_id      UUID REFERENCES builders,
  status          TEXT,             -- pending, sent, confirmed
  total_amount    DECIMAL,
  wire_date       DATE,
  confirmation_number TEXT,
  notes           TEXT,
  created_at      TIMESTAMP
)

-- Documents: Supporting files for loans
documents (
  id            UUID PRIMARY KEY,
  project_id    UUID REFERENCES projects,
  draw_request_id UUID REFERENCES draw_requests,  -- Optional link to draw
  document_type TEXT,             -- floorplan, valuation, loan_agreement, insurance, other
  file_name     TEXT,
  file_path     TEXT,
  file_url      TEXT,
  file_size     INTEGER,
  uploaded_at   TIMESTAMP
)
```

### NAHB Category Hierarchy

The system uses 16 major categories with 118 subcategories, including "Other" catch-all subcategories for each category:

| Code | Category | Subcategories |
|------|----------|---------------|
| 0100 | General Conditions | 12 subcategories (0110-0199) |
| 0200 | Site Work | 15 subcategories (0210-0299) |
| 0300 | Concrete & Foundations | 8 subcategories (0310-0399) |
| 0400 | Framing | 7 subcategories (0410-0499) |
| 0500 | Roofing | 3 subcategories (0510-0599) |
| 0600 | Exterior Finishes | 9 subcategories (0610-0699) |
| 0700 | Windows & Doors | 7 subcategories (0710-0799) |
| 0800 | Plumbing | 7 subcategories (0810-0899) |
| 0900 | HVAC / Mechanical | 6 subcategories (0910-0999) |
| 1000 | Electrical & Low Voltage | 12 subcategories (1010-1099) |
| 1100 | Insulation & Drywall | 4 subcategories (1110-1199) |
| 1200 | Interior Finishes | 10 subcategories (1210-1299) |
| 1300 | Flooring | 7 subcategories (1310-1399) |
| 1400 | Countertops | 4 subcategories (1410-1499) |
| 1500 | Appliances | 2 subcategories (1510-1599) |
| 1600 | Landscaping & Exterior Amenities | 7 subcategories (1610-1699) |

### Document Types

| Type | Label | Purpose |
|------|-------|---------|
| `floorplan` | Floor Plans / Construction Drawings | Building plans |
| `valuation` | Valuation Document | Appraisal or BPO |
| `loan_agreement` | Loan Agreement | Signed loan docs |
| `insurance` | Insurance Certificate | Builder's risk policy |
| `other` | Other Document | Miscellaneous |

### Draw Line Flags

| Flag | Description | Auto-Generated |
|------|-------------|----------------|
| `NO_BUDGET_MATCH` | Category not found in project budget | Yes - during import |
| `OVER_BUDGET` | Request exceeds remaining budget | Yes - during import |
| `AMOUNT_MISMATCH` | Invoice total doesn't match requested | N8N processing |
| `NO_INVOICE` | No invoice attached to line | N8N processing |
| `LOW_CONFIDENCE` | AI confidence < 70% | N8N processing |
| `DUPLICATE_INVOICE` | Invoice already used in previous draw | N8N processing |

### Draw Request Status Values

| Status | Description | Next Status |
|--------|-------------|-------------|
| `review` | Draw uploaded, awaiting user review | staged |
| `staged` | User approved, waiting for other builder draws | pending_wire |
| `pending_wire` | All builder draws ready, sent to bookkeeper | funded |
| `funded` | Wire sent, draw locked | (terminal) |

### Default Term Sheet

New loans default to standard terms:
- 11% annual interest rate
- 2% origination fee
- 0.25% monthly escalation after 6 months
- $1,000 document fee
- 12-month term

---

## Financial Calculations

TD3 provides comprehensive financial calculation capabilities across two modules:

### lib/calculations.ts

Core financial metrics for loan analysis:

#### Income Calculation
```typescript
calculateLoanIncome(project, draws): { fee: number, interest: number, total: number }
```
- **Origination Fee**: `loan_amount × origination_fee_pct`
- **Interest**: Sum of (draw_amount × daily_rate × days_outstanding) for each paid draw

#### IRR Calculation
```typescript
calculateIRR(draws, payoffAmount, payoffDate): number | null
```
- Uses Newton-Raphson method to solve for IRR
- Cash outflows: Each draw (negative, with date)
- Cash inflow: Payoff amount (positive, with payoff_date)
- Returns annualized IRR as decimal (0.15 = 15%)

#### LTV Color Coding
```typescript
getLTVColor(ltv: number): string
```
- **≤65%** → Green (low risk)
- **66-74%** → Yellow (moderate risk)
- **≥75%** → Red (high risk)

#### Amortization Schedule
```typescript
calculateAmortizationSchedule(drawLines, project, payoffDate?): AmortizationRow[]
```
- Calculates interest accrual per draw line
- Tracks daily interest based on outstanding principal
- Includes fee rate at each draw date
- Returns comprehensive schedule with running balances

#### Payoff Breakdown
```typescript
calculatePayoffBreakdown(drawLines, project, terms, payoffDate): PayoffBreakdown
```
Returns detailed payoff statement:
- Principal balance
- Accrued interest (with days count)
- Per diem rate
- Finance fee (based on current fee rate)
- Document fee
- Total payoff amount

#### Payoff Projection
```typescript
projectPayoffAtDate(currentBreakdown, loanStartDate, terms, futureDate): PayoffBreakdown
generateProjectionData(drawLines, project, terms, currentDate, projectionMonths): ProjectionDataPoint[]
```
- Projects payoff at future dates
- Generates data for Nivo charts
- Includes fee rate progression, cumulative interest, and total payoff

---

### lib/loanTerms.ts

Centralized loan terms management with hierarchical resolution.

#### Term Resolution Hierarchy
```
1. Project-specific values (highest priority)
2. Lender overrides
3. System defaults (lowest priority)
```

#### Fee Calculation Formula

Implements the exact Excel formula for fee escalation:

```
=IF(month <= 6,
    0.02,                                    // Months 1-6: 2.00%
  IF(month <= 12,
    0.0225 + ((month - 7) * 0.0025),        // Months 7-12: 2.25% + 0.25%/month
    IF(month = 13,
      0.059,                                 // Month 13: 5.90% (extension jump)
      0.059 + ((month - 13) * 0.004)        // Months 14+: 5.90% + 0.40%/month
    )))
```

| Month | Fee Rate | Type |
|-------|----------|------|
| 1-6 | 2.00% | Base |
| 7 | 2.25% | Escalation |
| 8 | 2.50% | Escalation |
| 9 | 2.75% | Escalation |
| 10 | 3.00% | Escalation |
| 11 | 3.25% | Escalation |
| 12 | 3.50% | Escalation |
| 13 | 5.90% | Extension (2% jump) |
| 14 | 6.30% | Post-extension |
| 15 | 6.70% | Post-extension |
| ... | +0.40%/mo | Post-extension |

#### Key Functions

```typescript
// Calculate fee rate at specific month
calculateFeeRateAtMonth(month: number, terms: LoanTerms): number

// Get month number from loan start date
getMonthNumber(loanStartDate: Date, targetDate: Date): number

// Get next fee increase date and rates
getNextFeeIncreaseDate(loanStartDate, currentDate, terms): { date, newRate, currentRate }

// Generate complete fee schedule
generateFeeSchedule(loanStartDate, throughMonth, terms): FeeScheduleEntry[]

// Maturity urgency indicators
getUrgencyLevel(daysToMaturity: number): 'critical' | 'urgent' | 'warning' | 'caution' | 'normal'
getUrgencyColor(level: UrgencyLevel): string
```

#### Default Term Sheet

```typescript
DEFAULT_TERM_SHEET = {
  interest_rate_annual: 0.11,           // 11%
  origination_fee_pct: 0.02,            // 2%
  fee_escalation_pct: 0.0025,           // +0.25% per month after 6 months
  fee_escalation_after_months: 6,
  fee_rate_at_month_7: 0.0225,          // 2.25%
  extension_fee_month: 13,              // Month 13
  extension_fee_rate: 0.059,            // 5.90%
  post_extension_escalation: 0.004,     // +0.40% per month after 13 months
  document_fee: 1000,                   // $1,000
  loan_term_months: 12,                 // 12 months
}
```

---

### lib/anomalyDetection.ts

Automated anomaly detection for budget and draw analysis:

```typescript
detectAnomalies(budgets, drawLines, project): Anomaly[]
```

**Anomaly Types:**
| Type | Description | Severity |
|------|-------------|----------|
| `SPENDING_SPIKE` | Single draw > 50% of category budget | warning |
| `VELOCITY_HIGH` | Spending faster than typical pace | warning |
| `OVER_BUDGET` | Category exceeded budget | critical |
| `LARGE_VARIANCE` | Draw variance from invoice > 10% | error |
| `DORMANT_CATEGORY` | Budget allocated but no draws in 90+ days | info |

---

## UI Components

### Key Files

| Component | Path | Purpose |
|-----------|------|---------|
| `StageSelector` | `app/components/ui/StageSelector.tsx` | iOS-style lifecycle filter |
| `StageStatsBar` | `app/components/ui/StageStatsBar.tsx` | Stage-specific metrics with visual elements |
| `FilterSidebar` | `app/components/ui/FilterSidebar.tsx` | Toggle-based filter (Builder/Subdivision/Lender) |
| `ProjectTile` | `app/components/ui/ProjectTile.tsx` | Loan card with stage-specific display |
| `LoanPageTabs` | `app/components/projects/LoanPageTabs.tsx` | Tabbed loan interface |
| `OriginationTab` | `app/components/projects/OriginationTab.tsx` | Loan setup with lifecycle controls |
| `LoanStatusTab` | `app/components/projects/LoanStatusTab.tsx` | Active loan status with financial reports |
| `BudgetEditor` | `app/components/projects/BudgetEditor.tsx` | Inline budget editing with cascading dropdowns |
| `DocumentUploadSection` | `app/components/projects/DocumentUploadSection.tsx` | Document management |
| `SpreadsheetViewer` | `app/components/ui/SpreadsheetViewer.tsx` | Interactive import preview |
| `ImportPreview` | `app/components/import/ImportPreview.tsx` | Import modal with fuzzy matching |
| `BuilderInfoCard` | `app/components/builders/BuilderInfoCard.tsx` | Compact builder info with edit mode |
| `BuilderLoanGrid` | `app/components/builders/BuilderLoanGrid.tsx` | Builder's loan portfolio display |

### Financial Report Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ReportToggle` | `app/components/ui/ReportToggle.tsx` | 3-way toggle (Budget/Amortization/Payoff) |
| `ViewModeSelector` | `app/components/ui/ViewModeSelector.tsx` | Table/Cards/Chart view mode selector |
| `ReportDetailPanel` | `app/components/ui/ReportDetailPanel.tsx` | Slide-out panel for drill-down details |
| `ProgressBudgetReport` | `app/components/projects/ProgressBudgetReport.tsx` | Multi-view budget analysis |
| `AmortizationTable` | `app/components/projects/AmortizationTable.tsx` | Draw-by-draw interest schedule |
| `PayoffReport` | `app/components/projects/PayoffReport.tsx` | Three-view payoff system |
| `PolymorphicLoanDetails` | `app/components/projects/PolymorphicLoanDetails.tsx` | Context-aware stats tile |
| `BudgetSparkline` | `app/components/ui/BudgetSparkline.tsx` | Mini trend charts for budget lines |

### Draw System Pages

| Page | Path | Purpose |
|------|------|---------|
| `DrawRequestPage` | `app/draws/new/page.tsx` | New draw upload with cascading builder→project selection |
| `DrawDetailPage` | `app/draws/[id]/page.tsx` | Draw review with cascading category assignment |
| `StagingPage` | `app/staging/page.tsx` | Central dashboard for draw management |

---

## Enhanced Financial Reports

TD3 includes three comprehensive financial report types, accessible via a 3-way toggle on the loan status page.

### Report Toggle System

```
┌─────────────────────────────────────────────────────────────┐
│  [  Budget  ] [  Amortization  ] [  Payoff  ]               │
│       ▼                                                      │
│  Three independent reports with polymorphic stats tile       │
└─────────────────────────────────────────────────────────────┘
```

### 1. Progress Budget Report

Multi-view budget analysis with intelligent features:

**Table View:**
- Grouped rows by NAHB major category (collapsible)
- Sortable columns (Code, Category, Budget, Drawn, Remaining, % Complete)
- Sticky header and footer with totals
- Smart condensing (zero-value rows auto-collapse)
- Sparkline trend charts per budget line
- Click-to-drill-down for detailed view

**Cards View:**
- Summary cards with key metrics per category
- Visual progress indicators
- Anomaly badges for flagged items

**Chart View:**
- Sankey diagram showing budget flow from categories to draws
- Visual representation of budget allocation and spending

### 2. Amortization Table

Draw-by-draw interest accrual tracking:

**Table View:**
- Chronological draw listing with:
  - Draw date and number
  - Draw amount
  - Days since last draw
  - Interest accrued
  - Fee rate badge (shows escalation)
  - Running balance
- Summary header with:
  - Principal balance
  - Total interest
  - Per diem rate
  - Total payoff

**Cards View:**
- Summary metric cards for quick reference
- Principal, interest, per diem, days outstanding

**Chart View:**
- Timeline bar chart showing draws and interest accrual
- Visual zones for fee escalation periods

### 3. Payoff Report

Three-view interactive payoff system:

**View 1: Payoff Statement**
- Professional payoff letter format
- Principal balance
- Accrued interest (with days)
- Finance fee (with current rate)
- Document fee
- Credits
- Total payoff amount
- Good-through date
- Per diem for additional days
- "Complete Loan" functionality for historic transition

**View 2: What-If Calculator**
- Interactive date selector
- Real-time payoff projections
- Days until selected date
- Additional interest calculation
- New fee rate if different
- Projected total
- Quick-select buttons (7 days, 14 days, 30 days, End of Month)

**View 3: Fee & Interest Projection Chart**
- Nivo line chart with three data series:
  - Fee Rate (% over time)
  - Cumulative Interest ($ over time)
  - Total Payoff ($ over time)
- Interactive tooltip with exact values
- Visual markers for:
  - Current month (highlighted)
  - Extension month (month 13)
  - Actual vs projected data
- 18-month projection window

### Polymorphic Loan Details

The stats tile above reports adapts based on active report:

| Report | Stats Displayed |
|--------|-----------------|
| **Budget** | Budget Total, Total Spent, Remaining, % Complete, Anomaly Count |
| **Amortization** | Principal Balance, Total Interest, Per Diem, Days Outstanding, Current Fee Rate |
| **Payoff** | Estimated Payoff, Principal, Accrued Interest, Per Diem, Fee Rate, Days to Maturity |

### View Mode Persistence

User's preferred view mode (Table/Cards/Chart) is persisted to localStorage per report type, providing consistent experience across sessions.

### Builder Page Features

The Builder Page (`/builders/[id]`) provides a centralized view for managing builder relationships:

- **Header**: Company name, borrower name, total loans count, active loans count
- **BuilderInfoCard**: Compact 4-column layout with:
  - Company & Contact info (email/phone as clickable links)
  - Mailing address
  - Banking information (routing/account numbers masked)
  - Collapsible notes section
- **BuilderLoanGrid**: Stage-filterable loan portfolio with StageStatsBar

### FilterSidebar Features

Toggle-based 3-way filter with persistent selections:

- **3-Way Toggle**: Builder | Subdivision | Lender (all visible at once)
- **Dynamic Options**: Shows options for currently selected category
- **Persistent Selections**: Selections persist across category switches
- **Active Filter Chips**: Dismissible chips at top showing all active filters
- **Dot Indicators**: Visual dots on toggle buttons when category has active filters
- **Clear Controls**: Clear individual categories or all filters at once

### StageStatsBar Features

Stage-specific metrics with visual elements:

| Stage | Metrics | Visual Element |
|-------|---------|----------------|
| **Pending** | Pipeline Value, Avg LTV, Count | LTV distribution bar (green ≤65%, yellow 66-74%, red ≥75%) |
| **Active** | Total Committed, Total Drawn, Count | Animated utilization progress bar |
| **Historic** | Total Funded, Total Income, Avg IRR | IRR with color coding |

### SpreadsheetViewer Features

- **Color-Coded Columns**: Blue = Category, Red = Amount
- **Row Range Selection**: Yellow highlight for selected rows
- **Classification Badges**: H (Header), T (Total), C (Closing)
- **Drag Handles**: Resize selection by dragging ≡ icons
- **Click-to-Toggle**: Click rows to move nearest boundary (intelligent proximity)
- **Keyboard Shortcuts**: ↑↓ (start), Shift+↑↓ (end), R (reset)
- **Excel Formatting**: Preserves bold text and borders from original file
- **Shortcut Legend**: `?` icon with hover/click tooltip for keyboard shortcuts

### BudgetEditor Features

- **Cascading Dropdowns**: Category dropdown filters Subcategory options
- **Auto-Fill**: Selecting Subcategory auto-fills Code and Category
- **Clear All Button**: Delete entire budget for a project (with confirmation)
- **Inline Editing**: Edit amounts, builder categories, and standardized codes
- **AI Confidence Indicator**: Visual dots showing mapping confidence (green/yellow/red)
- **Auto-Open Subcategory**: When category changes, subcategory dropdown auto-opens

### ImportPreview Features

- **Auto-Delete Checkbox**: Option to replace existing budget on upload
- **Existing Budget Detection**: Shows count of existing items when project selected
- **Project Selection**: Cascading builder → project dropdowns for draw imports
- **Sheet Selection**: Choose which Excel sheet to import from multi-sheet workbooks
- **Real-time Stats**: Shows row count and total amount before submission
- **Auto-Deselect Columns**: Selecting a new category/amount column auto-deselects previous
- **Invoice Upload**: Drag-drop invoice files with thumbnail preview (draw imports)

### Fuzzy Matching Algorithm

The `ImportPreview` component uses multi-strategy fuzzy matching for draw-to-budget category matching:

```typescript
function fuzzyMatchScore(input: string, target: string): number
```

**Matching Strategies (in priority order):**

| Strategy | Score | Example |
|----------|-------|---------|
| Exact match | 1.0 | "Framing" = "Framing" |
| Contains match | 0.9 | "Electrical" ⊆ "Electrical Rough" |
| Tokenized words | 0.65-0.9 | "Framing Labor" ≈ "Framing - Labor" |
| Levenshtein | 0.56-0.8 | "Plumning" ≈ "Plumbing" (1 edit) |

**Threshold**: 0.6 minimum score required for auto-match

**Implementation:**
- `levenshteinDistance()` - Edit distance calculation
- `fuzzyMatchScore()` - Multi-strategy scoring
- `findBestBudgetMatch()` - Finds best budget above threshold

### Draw Review Page Features

- **Unmatched Lines Section**: Warning banner with cascading dropdowns
- **Cascading Category Assignment**:
  - First dropdown: NAHB Categories (filtered to those with available budgets)
  - Second dropdown: Budgets in selected category (excludes already-assigned)
- **Inline Amount Editing**: Click to edit draw amounts
- **Invoice Management**: Compact "Attach Invoices" button, "Re-run Invoice Matching"
- **Status-Based Controls**: Stage for Funding, Reject buttons based on status
- **Flag Display**: Visual indicators for OVER_BUDGET, NO_INVOICE, LOW_CONFIDENCE, etc.

---

## Webhook Payload Reference

### Budget Import Webhook

```typescript
type BudgetImportPayload = {
  type: 'budget'
  projectId: string              // UUID of target project
  columns: {
    category: {
      header: string             // Original column header
      values: string[]           // Selected row values only
    }
    amount: {
      header: string             // Original column header
      values: (number | null)[]  // Selected row values only
    }
  }
  metadata: {
    fileName: string             // Original file name
    sheetName: string            // Excel sheet name
    totalRows: number            // Total rows in file
    selectedRows: number         // Rows after filtering
  }
}
```

### Draw Import Webhook (N8N Processing)

The webapp creates draw_request and draw_request_lines directly in Supabase, then optionally calls N8N for AI invoice matching with an enriched payload:

```typescript
type DrawProcessingPayload = {
  drawRequestId: string          // UUID of created draw request
  projectId: string              // UUID of target project
  lines: Array<{
    lineId: string               // UUID of draw_request_line
    builderCategory: string      // Original category from spreadsheet
    nahbCategory: string | null  // Matched NAHB category
    nahbSubcategory: string | null
    costCode: string | null      // NAHB cost code
    budgetAmount: number         // Total budget for this category
    remainingAmount: number      // Budget remaining before this draw
    amountRequested: number      // Amount requested in this draw
  }>
  invoiceCount: number           // Number of uploaded invoices
}
```

N8N can then:
1. Match invoices to budget categories using AI
2. Update draw_request_lines with invoice details
3. Generate additional flags (AMOUNT_MISMATCH, DUPLICATE_INVOICE, etc.)

### Legacy Draw Import Webhook (Direct Column Data)

```typescript
type DrawImportPayload = {
  type: 'draw'
  projectId: string              // UUID of target project
  drawNumber: number             // e.g., 1, 2, 3
  columns: {
    category: {
      header: string
      values: string[]
    }
    amount: {
      header: string             // Usually a date like "17-Jul"
      values: (number | null)[]
    }
  }
  metadata: {
    fileName: string
    sheetName: string
    totalRows: number
    selectedRows: number
  }
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env.local (local development)
# Vercel Environment Variables (production)

# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n Webhook URLs
NEXT_PUBLIC_N8N_BUDGET_WEBHOOK=https://grysngrhm.app.n8n.cloud/webhook/budget-import
NEXT_PUBLIC_N8N_DRAW_WEBHOOK=https://grysngrhm.app.n8n.cloud/webhook/draw-import
```

---

## File Reference

### Core Libraries

| File | Purpose |
|------|---------|
| `lib/spreadsheet.ts` | Excel parsing, column/row detection, formatting extraction |
| `lib/supabase.ts` | Supabase client initialization |
| `lib/projectCode.ts` | Project code generation (e.g., "DW-244") |
| `lib/calculations.ts` | Financial calculations (income, IRR, LTV, amortization, payoff) |
| `lib/loanTerms.ts` | Loan term management, fee calculation, urgency levels |
| `lib/anomalyDetection.ts` | Budget and draw anomaly detection |
| `lib/validations.ts` | Draw request validation and flag generation |
| `lib/polymorphic.ts` | Polymorphic UI utilities |

### UI Components

| File | Purpose |
|------|---------|
| `app/components/import/ImportPreview.tsx` | Import modal with fuzzy matching for draws/budgets |
| `app/components/ui/SpreadsheetViewer.tsx` | Interactive spreadsheet table with row analysis |
| `app/components/ui/FilterSidebar.tsx` | Toggle-based filter component |
| `app/components/ui/StageStatsBar.tsx` | Stage-specific metrics with visual elements |
| `app/components/ui/ProjectTile.tsx` | Loan card with income/IRR for historic |
| `app/components/ui/ReportToggle.tsx` | 3-way report type selector |
| `app/components/ui/ViewModeSelector.tsx` | Table/Cards/Chart view mode toggle |
| `app/components/ui/ReportDetailPanel.tsx` | Slide-out panel for drill-down details |
| `app/components/ui/BudgetSparkline.tsx` | Mini trend charts for budget lines |

### Project Components

| File | Purpose |
|------|---------|
| `app/components/builders/BuilderInfoCard.tsx` | Compact builder info with edit mode |
| `app/components/builders/BuilderLoanGrid.tsx` | Builder's loan portfolio |
| `app/components/projects/OriginationTab.tsx` | Loan origination with lifecycle transition controls |
| `app/components/projects/LoanStatusTab.tsx` | Active loan status with financial reports |
| `app/components/projects/BudgetEditor.tsx` | Editable budget with cascading dropdowns |
| `app/components/projects/ProgressBudgetReport.tsx` | Multi-view budget analysis with Sankey diagram |
| `app/components/projects/AmortizationTable.tsx` | Draw-by-draw interest schedule |
| `app/components/projects/PayoffReport.tsx` | Three-view interactive payoff system |
| `app/components/projects/PolymorphicLoanDetails.tsx` | Context-aware stats tile |

### Pages

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home page with Dashboard navigation |
| `app/staging/page.tsx` | Staging dashboard for draw management |
| `app/draws/new/page.tsx` | New draw request with cascading builder→project |
| `app/draws/[id]/page.tsx` | Draw review with cascading category assignment |
| `app/builders/[id]/page.tsx` | Builder detail page with draw button |
| `app/projects/[id]/page.tsx` | Loan detail page with draw request button |
| `app/projects/new/page.tsx` | New loan creation |

### Types

| File | Purpose |
|------|---------|
| `types/database.ts` | Supabase types + DrawLineFlag + DrawStatus + DEFAULT_TERM_SHEET |

---

## Common Issues & Solutions

### Column Detection Misses Budget Column
- **Cause:** Column has < 10 real numbers
- **Solution:** User can manually click column header to map it

### Row Detection Includes Headers
- **Cause:** Header keywords not matching or low score
- **Solution:** Click rows to manually adjust boundaries, or drag handles

### "Title Fees" Flagged as Closing Cost
- **Cause:** "title" keyword triggered closing cost detection
- **Solution:** Fixed with weighted keyword scoring - "title" now only adds 15 points (threshold is 35)

### Empty Categories Being Imported
- **Cause:** Row detection included empty rows
- **Solution:** Row boundary detection now excludes rows without category content

### Drag Handles Not Working
- **Cause:** React state closure issues
- **Solution:** Fixed with proper ref handling in event listeners

### Duplicate Budget Items on Re-Import
- **Cause:** Uploading new budget to project with existing items
- **Solution:** Use "Replace existing budget" checkbox in ImportPreview, or "Clear All" button in BudgetEditor before importing

### Category Dropdown Not Showing Correct Value After Import
- **Cause:** AI returned category with code prefix (e.g., "0800 – Plumbing") instead of just name
- **Solution:** Updated AI prompt to return only names without codes; BudgetEditor uses ID-based matching
