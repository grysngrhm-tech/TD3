# TD3 Technical Architecture

This document provides detailed technical information for developers and AI agents working on the TD3 system.

---

## System Components

### 1. Web Application (Next.js)

**Purpose:** User interface for uploading spreadsheets, viewing projects, and managing draw requests.

**Key Responsibilities:**
- Client-side spreadsheet parsing with SheetJS
- Smart column detection using pattern analysis
- Interactive column mapping UI
- Project/budget/draw data display
- Webhook calls to n8n workflows

**Technology:**
- Next.js 14 with App Router
- React 18 with hooks
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI for accessible components

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

## Data Flow Details

### Budget Import Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUDGET IMPORT SEQUENCE                             │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: USER UPLOADS SPREADSHEET
────────────────────────────────
User clicks "Upload Budget" and selects an Excel/CSV file.
The file typically has this structure:

    | Item                  | Rough Budget | Adjust | Final Budget | 17-Jul | Aug  |
    |-----------------------|--------------|--------|--------------|--------|------|
    | Land                  | 50,000       |        | 50,000       | -      | -    |
    | Excavation            | 19,246       |        | 19,246       | 19,246 | -    |
    | Foundation            | 35,000       |        | 35,000       | -      | -    |
    | ...                   |              |        |              |        |      |


Step 2: WEBAPP PARSES & DETECTS COLUMNS
───────────────────────────────────────
Client-side JavaScript (lib/spreadsheet.ts) uses SheetJS to:
  1. Parse the file into a 2D array
  2. Analyze column data patterns (30 rows sample)
  3. Auto-detect Category column (leftmost text column with diverse values)
  4. Auto-detect Amount column (first column with 10+ real numbers)
  5. Display interactive preview with column highlighting


Step 3: USER CONFIRMS & SUBMITS
───────────────────────────────
User can:
  - Adjust column mappings by clicking column headers
  - Select the target project from dropdown
  - Click "Submit" to send data to n8n


Step 4: WEBAPP SENDS TO N8N WEBHOOK
───────────────────────────────────
POST to: NEXT_PUBLIC_N8N_BUDGET_WEBHOOK

Payload format:
{
  "type": "budget",
  "projectId": "uuid-of-project",
  "columns": {
    "category": {
      "header": "Item",
      "values": ["Land", "Excavation", "Foundation", "", "TOTALS", ...]
    },
    "amount": {
      "header": "Rough Budget",
      "values": [50000, 19246, 35000, 0, 450000, ...]
    }
  },
  "metadata": {
    "fileName": "Builder Budget.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 75
  }
}


Step 5: N8N WORKFLOW PROCESSES DATA
───────────────────────────────────
The workflow must:

  5a. FILTER VALID ROWS
      Use OpenAI to identify which rows are actual budget items vs:
      - Header rows ("Item", "Description", etc.)
      - Summary/total rows ("TOTALS", "SUBTOTAL", etc.)
      - Empty rows
      - Section headers ("CONSTRUCTION COSTS", etc.)
      
      Prompt example:
      "Given this list of budget categories, return the indices of rows 
       that are actual budget line items (not headers, totals, or empty):
       [categories array]"

  5b. STANDARDIZE TO NAHB CODES
      For each valid budget item, map to NAHB cost codes:
      
      Prompt example:
      "Map these builder budget categories to NAHB cost codes:
       - 'Excavation' → '02100 - Earthwork'
       - 'Rough Lumber & Siding' → '06100 - Rough Carpentry'
       etc."

  5c. INSERT INTO SUPABASE
      For each valid item, insert into 'budgets' table:
      {
        project_id: payload.projectId,
        category: nahbCategory,
        builder_category_raw: originalCategory,
        original_amount: amount,
        current_amount: amount,
        spent_amount: 0,
        nahb_category: nahbMajorCategory,
        nahb_subcategory: nahbSubcategory,
        cost_code: nahbCode,
        ai_confidence: confidenceScore
      }


Step 6: RETURN SUCCESS TO WEBAPP
────────────────────────────────
Response: { success: true, imported: 45, skipped: 30 }
Webapp shows toast notification and refreshes project list.
```

---

### Draw Request Import Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DRAW REQUEST IMPORT SEQUENCE                          │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: USER UPLOADS DRAW SPREADSHEET
─────────────────────────────────────
User clicks "Upload Draw", selects project and draw number.
The file typically reuses the budget format with draw columns added.


Step 2: WEBAPP PARSES & USER SELECTS DRAW COLUMN
────────────────────────────────────────────────
Same parsing as budget, but user selects:
  - Category column (same as budget)
  - Amount column (the specific draw date column, e.g., "17-Jul")


Step 3: WEBAPP SENDS TO N8N WEBHOOK
───────────────────────────────────
POST to: NEXT_PUBLIC_N8N_DRAW_WEBHOOK

Payload format:
{
  "type": "draw",
  "projectId": "uuid-of-project",
  "drawNumber": 3,
  "columns": {
    "category": {
      "header": "Item",
      "values": ["Land", "Excavation", "Foundation", ...]
    },
    "amount": {
      "header": "17-Jul",
      "values": [0, 19246, 0, ...]
    }
  },
  "metadata": {
    "fileName": "July Draw.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 75
  }
}


Step 4: N8N WORKFLOW PROCESSES DRAW
───────────────────────────────────

  4a. FILTER VALID ROWS (same as budget)

  4b. MATCH TO EXISTING BUDGET LINES
      Query Supabase for existing budgets for this project:
      SELECT id, category, builder_category_raw FROM budgets 
      WHERE project_id = ?
      
      Use OpenAI to match draw categories to budget categories:
      "Match these draw categories to the existing budget categories:
       Draw categories: ['Excavation', 'Rough Lumber', ...]
       Budget categories: [{id, category}, ...]
       Return: [{drawCategory, budgetId, confidence}]"

  4c. CREATE DRAW REQUEST
      Insert into 'draw_requests':
      {
        project_id: payload.projectId,
        draw_number: payload.drawNumber,
        status: 'pending',
        total_amount: sum of amounts
      }

  4d. CREATE DRAW REQUEST LINES
      For each matched item with amount > 0:
      Insert into 'draw_request_lines':
      {
        draw_request_id: newDrawId,
        budget_id: matchedBudgetId,
        amount_requested: amount,
        confidence_score: matchConfidence
      }

  4e. UPDATE BUDGET SPENT AMOUNTS
      UPDATE budgets 
      SET spent_amount = spent_amount + drawAmount
      WHERE id = budgetId
```

---

## Database Schema Overview

### Core Tables

```sql
-- Projects: Top-level entity for each construction loan
projects (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  project_code    TEXT,          -- e.g., "DW-244"
  builder_name    TEXT,
  borrower_name   TEXT,
  subdivision_name TEXT,
  subdivision_abbrev TEXT,       -- e.g., "DW"
  lot_number      TEXT,          -- e.g., "244"
  loan_amount     DECIMAL,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMP
)

-- Budgets: Line items within a project budget
budgets (
  id                  UUID PRIMARY KEY,
  project_id          UUID REFERENCES projects,
  category            TEXT NOT NULL,      -- Standardized NAHB category
  builder_category_raw TEXT,              -- Original category from spreadsheet
  original_amount     DECIMAL,
  current_amount      DECIMAL,            -- After change orders
  spent_amount        DECIMAL DEFAULT 0,  -- Sum of funded draws
  remaining_amount    DECIMAL GENERATED,  -- current - spent
  nahb_category       TEXT,               -- Major NAHB category
  nahb_subcategory    TEXT,
  cost_code           TEXT,               -- NAHB code like "06100"
  ai_confidence       DECIMAL             -- 0-1 confidence in mapping
)

-- Draw Requests: Monthly funding requests
draw_requests (
  id            UUID PRIMARY KEY,
  project_id    UUID REFERENCES projects,
  draw_number   INTEGER NOT NULL,
  status        TEXT DEFAULT 'pending',   -- pending, approved, funded
  total_amount  DECIMAL,
  request_date  DATE,
  notes         TEXT
)

-- Draw Request Lines: Individual items in a draw
draw_request_lines (
  id                UUID PRIMARY KEY,
  draw_request_id   UUID REFERENCES draw_requests,
  budget_id         UUID REFERENCES budgets,
  amount_requested  DECIMAL NOT NULL,
  amount_approved   DECIMAL,
  confidence_score  DECIMAL,              -- AI matching confidence
  invoice_vendor_name TEXT,               -- Extracted from invoice
  invoice_amount    DECIMAL,
  flags             TEXT                  -- Validation warnings
)
```

### Relationship Diagram

```
projects
    │
    ├──< budgets (1:many)
    │       │
    │       └──< draw_request_lines (many)
    │
    └──< draw_requests (1:many)
            │
            └──< draw_request_lines (1:many)
```

---

## Column Detection Algorithm

The webapp uses pattern analysis to auto-detect columns (`lib/spreadsheet.ts`):

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

### Why 10+ Numbers Threshold?
- Prevents empty columns with just a few values from being detected
- Typical budgets have 30-100 line items, so 10 is a safe minimum
- Avoids selecting columns that only have totals/subtotals

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

### n8n Workflow Requirements

Each n8n workflow needs:
1. **Webhook Trigger** - Receives POST from webapp
2. **Supabase Credentials** - API key + URL for database operations
3. **OpenAI Credentials** - API key for GPT-4o-mini calls

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
      values: string[]           // All category values (incl. empty/headers)
    }
    amount: {
      header: string             // Original column header
      values: (number | null)[]  // Parsed numeric values
    }
  }
  metadata: {
    fileName: string             // Original file name
    sheetName: string            // Excel sheet name
    totalRows: number            // Total data rows
  }
}
```

### Draw Import Webhook

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
  }
}
```

---

## n8n Workflow Implementation Guide

### Budget Import Workflow Steps

1. **Webhook Trigger**
   - Method: POST
   - Path: `/budget-import`
   - Response: Respond immediately (workflow runs async)

2. **Extract Arrays**
   - Parse `body.columns.category.values` and `body.columns.amount.values`
   - Zip into array of `{category, amount}` objects

3. **OpenAI: Filter Valid Rows**
   ```
   System: You are a budget data processor. Identify valid budget line items.
   User: Given this list of budget categories, return a JSON array of indices 
         that are actual budget items (not headers, totals, subtotals, or empty):
         Categories: [...]
   Response: [0, 2, 5, 7, 8, ...]  // indices of valid rows
   ```

4. **Filter to Valid Items**
   - Keep only items at returned indices
   - Skip items with $0 amount

5. **OpenAI: Map to NAHB Codes**
   ```
   System: You map builder budget categories to NAHB cost codes.
   User: Map these categories to NAHB format {code, category, subcategory}:
         [list of categories]
   Response: [{original, code, category, subcategory, confidence}, ...]
   ```

6. **Supabase: Bulk Insert**
   - Insert all mapped items into `budgets` table
   - Include `project_id` from payload

7. **Return Success**
   - Return count of imported items

### Draw Import Workflow Steps

1. **Webhook Trigger** (same pattern)

2. **Supabase: Get Existing Budgets**
   ```sql
   SELECT id, category, builder_category_raw 
   FROM budgets 
   WHERE project_id = $projectId
   ```

3. **OpenAI: Match Categories**
   ```
   System: You match draw request categories to existing budget categories.
   User: Match these draw categories to budget categories:
         Draw: [category names from payload]
         Budget: [{id, category, builder_category_raw}, ...]
   Response: [{drawIndex, budgetId, confidence}, ...]
   ```

4. **Supabase: Create Draw Request**
   ```sql
   INSERT INTO draw_requests (project_id, draw_number, total_amount, status)
   VALUES ($projectId, $drawNumber, $totalAmount, 'pending')
   RETURNING id
   ```

5. **Supabase: Create Draw Lines**
   - For each matched item with amount > 0
   - Insert into `draw_request_lines`

6. **Supabase: Update Budget Spent**
   ```sql
   UPDATE budgets 
   SET spent_amount = spent_amount + $amount
   WHERE id = $budgetId
   ```

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/spreadsheet.ts` | SheetJS parsing, column detection, export formatting |
| `lib/supabase.ts` | Supabase client initialization |
| `app/components/import/ImportPreview.tsx` | Main import modal with column mapping |
| `app/components/ui/SpreadsheetViewer.tsx` | Interactive spreadsheet table |
| `app/page.tsx` | Dashboard with Upload Budget/Draw buttons |
| `types/database.ts` | Supabase generated TypeScript types |

---

## Common Issues & Solutions

### Column Detection Misses Budget Column
- **Cause:** Column has < 10 real numbers
- **Solution:** User can manually click column header to map it

### Empty Categories Being Imported
- **Cause:** n8n workflow not filtering invalid rows
- **Solution:** Add OpenAI step to identify valid budget items

### Draw Not Matching to Budget
- **Cause:** Category names differ between budget and draw spreadsheet
- **Solution:** Use fuzzy matching in OpenAI prompt, store raw category for reference
