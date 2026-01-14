# n8n Workflows

TD3 uses a self-hosted n8n instance for automation and AI-powered processing. The web application handles file parsing and column detection, then sends extracted data to n8n webhooks for AI processing and database insertion.

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web App       │────▶│   n8n Workflow  │────▶│   Supabase      │
│                 │     │                 │     │                 │
│ • Parse Excel   │     │ • Filter rows   │     │ • Store data    │
│ • Detect columns│     │ • AI processing │     │ • Audit trail   │
│ • User confirms │     │ • Insert data   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   OpenAI        │
                        │                 │
                        │ • Row filtering │
                        │ • NAHB mapping  │
                        │ • Category match│
                        └─────────────────┘
```

---

## Webhook Endpoints

Base URL: `https://n8n.srv1208741.hstgr.cloud/webhook`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/budget-import` | POST | Import budget spreadsheet data |
| `/td3-draw-process` | POST | AI invoice matching for draws (post-creation) |
| `/td3-invoice-process` | POST | Extract data from invoice PDFs and callback to TD3 |
| `/td3-invoice-disambiguate` | POST | AI disambiguation when multiple candidates score similarly |
| `/td3-wire-notification` | POST | Notify bookkeeper of pending wires |

**Note:** The webapp now creates `draw_request` and `draw_request_lines` directly in Supabase with client-side fuzzy matching. N8N is called *after* creation for optional AI invoice matching.

---

## Budget Import Webhook

**URL:** `POST https://n8n.srv1208741.hstgr.cloud/webhook/budget-import`

### Payload Format

```json
{
  "type": "budget",
  "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "columns": {
    "category": {
      "header": "Item",
      "values": [
        "Muddy River - Lot # 3",
        "Item",
        "Land",
        "Permits",
        "Excavation",
        "SURVEYING",
        "",
        "TOTALS"
      ]
    },
    "amount": {
      "header": "Rough Budget",
      "values": [
        null,
        null,
        50000,
        15000,
        19246.12,
        5000,
        0,
        450000
      ]
    }
  },
  "metadata": {
    "fileName": "Muddy River 2025(Lot 3 Budget).csv",
    "sheetName": "Sheet1",
    "totalRows": 111
  }
}
```

### Workflow Processing Steps

1. **Receive Webhook** - Parse JSON payload
2. **Filter Valid Rows** - Use OpenAI to identify which rows are actual budget items:
   - Skip header rows ("Item", "Description")
   - Skip total/subtotal rows ("TOTALS", "TOTAL CONSTRUCTION")
   - Skip empty rows
   - Skip section headers ("CONSTRUCTION COSTS")
3. **Map to NAHB Codes** - Use OpenAI to standardize categories:
   - "Excavation" → "02100 - Earthwork"
   - "Rough Lumber & Siding" → "06100 - Rough Carpentry"
   - "Roofing" → "07300 - Roofing"
4. **Insert to Supabase** - Create budget records:

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
  $projectId,
  $nahbCategory,
  $originalCategory,
  $amount,
  $amount,
  0,
  $majorCategory,
  $subcategory,
  $costCode,
  $confidence
)
```

5. **Return Response**

```json
{
  "success": true,
  "imported": 45,
  "skipped": 30,
  "message": "Budget imported successfully"
}
```

---

## Draw Processing Webhook (Post-Creation)

**URL:** `POST https://n8n.srv1208741.hstgr.cloud/webhook/td3-draw-process`

The webapp creates draw requests and lines directly in Supabase using client-side fuzzy matching. N8N is called *after* creation for AI-powered invoice matching.

### Payload Format (Enriched)

```json
{
  "drawRequestId": "uuid-of-created-draw",
  "projectId": "uuid-of-project",
  "lines": [
    {
      "lineId": "uuid-of-draw-line",
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
```

### Workflow Processing Steps

1. **Receive Webhook** - Parse enriched payload with line IDs
2. **Fetch Invoices** - Get uploaded invoices from Supabase Storage
3. **AI Invoice Matching** - Use OpenAI to match invoices to draw lines:
   - Input: Line categories (builder + NAHB) + invoice details
   - Output: `[{lineId, invoiceUrl, confidence, flags}]`
4. **Update Draw Lines** - Set invoice data and flags:

```sql
UPDATE draw_request_lines
SET 
  invoice_file_url = $invoiceUrl,
  invoice_vendor_name = $vendorName,
  matched_invoice_amount = $invoiceAmount,
  confidence_score = $confidence,
  flags = $flags
WHERE id = $lineId
```

5. **Return Response**

```json
{
  "success": true,
  "matchedLines": 10,
  "unmatchedLines": 2,
  "flaggedLines": 3
}
```

### Client-Side Fuzzy Matching (Pre-N8N)

The webapp performs category matching before calling N8N:

**Matching Algorithm:**
1. Exact match (score = 1.0)
2. Contains match (score = 0.9)
3. Tokenized word match (score = 0.65-0.9)
4. Levenshtein distance (score = 0.56-0.8)

**Threshold:** 0.6 minimum for auto-match

This ensures most categories are matched instantly without AI, with N8N only needed for invoice processing.

---

## OpenAI Prompts Reference

### Prompt: Filter Valid Budget Rows

```
System: You are a budget data processor for construction lending. Your job is to 
identify which rows in a spreadsheet are actual budget line items vs headers, 
totals, or empty rows.

User: Given this list of budget categories from a spreadsheet, return a JSON array 
containing ONLY the indices (0-based) of rows that are actual budget line items.

Exclude:
- Header rows (like "Item", "Description", "Category")
- Total/subtotal rows (like "TOTALS", "TOTAL CONSTRUCTION", "GRAND TOTAL")
- Section headers (like "CONSTRUCTION COSTS", "SOFT COSTS")
- Rows with empty/blank category names

IMPORTANT: Include rows with $0 amounts! A budget category with $0 is valid - 
it represents an unfunded or placeholder line item. Only exclude if the 
category NAME itself is empty, not if the amount is zero.

Categories: ["Muddy River - Lot # 3", "Item", "Land", "Permits", "Excavation", ...]

Return format: [2, 3, 4, 5, 7, ...]
```

### Prompt: Map to NAHB Codes

```
System: You are an expert in construction cost codes. Map builder budget categories 
to NAHB (National Association of Home Builders) standard cost codes.

User: Map these builder budget categories to NAHB codes. For each category, provide:
- code: NAHB cost code (e.g., "02100")
- category: Major NAHB category
- subcategory: NAHB subcategory
- confidence: 0-1 confidence in mapping

Categories: ["Excavation", "Rough Lumber & Siding", "Roofing", ...]

Return JSON array:
[
  {"original": "Excavation", "code": "02100", "category": "Site Work", "subcategory": "Earthwork", "confidence": 0.95},
  ...
]
```

### Prompt: Match Draw to Budget

```
System: You match draw request line items to existing budget categories. The draw 
categories may use different naming than the budget, so use semantic matching.

User: Match these draw request categories to the existing budget lines.

Draw categories: ["Excavation", "Rough Lumber", "Roofing Labor"]

Existing budget lines:
[
  {"id": "uuid1", "category": "Site Work - Earthwork", "builder_category_raw": "Excavation"},
  {"id": "uuid2", "category": "Rough Carpentry", "builder_category_raw": "Rough Lumber & Siding"},
  ...
]

Return JSON array of matches:
[
  {"drawIndex": 0, "budgetId": "uuid1", "confidence": 0.95},
  {"drawIndex": 1, "budgetId": "uuid2", "confidence": 0.85},
  ...
]

For unmatched items, set budgetId to null.
```

---

## Setup Instructions

### 1. Create Workflows in n8n

Create two workflows:
- **TD3 - Budget Import**
- **TD3 - Draw Import**

### 2. Configure Credentials

**Supabase:**
- Name: `TD3 Supabase`
- URL: `https://[project-id].supabase.co`
- API Key: Service role key (not anon key)

**OpenAI:**
- Name: `TD3 OpenAI`
- API Key: Your OpenAI API key
- Model: `gpt-4o-mini` (cost-effective for this use case)

### 3. Set Webhook Paths

In each workflow's Webhook trigger node:
- Budget: Path = `budget-import`
- Draw: Path = `draw-import`

### 4. Activate Workflows

Toggle both workflows to active status.

### 5. Update Environment Variables

In Vercel (or `.env.local`):
```
NEXT_PUBLIC_N8N_BUDGET_WEBHOOK=https://n8n.srv1208741.hstgr.cloud/webhook/budget-import
NEXT_PUBLIC_N8N_DRAW_WEBHOOK=https://n8n.srv1208741.hstgr.cloud/webhook/draw-import
```

---

## Error Handling

### Webhook Errors

If n8n returns an error, the webapp will:
1. Display error message to user
2. Allow retry

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 on webhook | Workflow not active | Activate workflow in n8n |
| Supabase insert fails | Missing project_id | Ensure project exists first |
| OpenAI timeout | Large payload | Reduce row count or split batches |
| No matches found | Category mismatch | Check spelling, use fuzzy matching |
| $0 categories not importing | Code node filtering | Ensure filter only excludes empty category names, not $0 amounts |
| Invalid JSON response | Model error | Use `gpt-4o` model (not gpt-5.x which doesn't support temperature) |

### Budget Import Filtering Rules

The webapp pre-filters data before sending to N8N:

**Budget Imports:**
- **Include**: Any row with a valid category name (even if amount is $0, blank, or null)
- **Exclude**: Rows with empty/blank category names
- Rationale: $0 budget categories are valid placeholders for unfunded line items

**Draw Imports:**
- **Include**: Rows with valid category name AND positive amount
- **Exclude**: Rows with empty category OR $0/blank amount
- Rationale: A $0 draw request doesn't make sense

---

## Invoice Processing Webhook

**URL:** `POST https://n8n.srv1208741.hstgr.cloud/webhook/td3-invoice-process`

This workflow extracts data from uploaded invoice files using GPT-4o-mini and sends the results back to TD3 for deterministic matching.

### Environment Variables

**TD3 side (.env.local / Vercel):**
```
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.srv1208741.hstgr.cloud/webhook
N8N_CALLBACK_SECRET=your-shared-secret-here
```

**n8n side (Environment Settings):**
```
TD3_WEBHOOK_SECRET=your-shared-secret-here   # Must match TD3's N8N_CALLBACK_SECRET
TD3_API_URL=https://td3.vercel.app           # Base URL for callbacks
```

### Payload Format

```json
{
  "invoiceId": "uuid-of-invoice-record",
  "fileUrl": "https://supabase.co/storage/v1/object/sign/documents/...",
  "fileName": "invoice-001.pdf",
  "callbackUrl": "https://td3.vercel.app/api/invoices/process-callback",
  "drawRequestId": "uuid-of-draw-request",
  "projectId": "uuid-of-project",
  "projectCode": "DW-244"
}
```

### Workflow Processing Steps

1. **Receive Webhook** - Parse JSON payload
2. **Download Invoice** - Fetch file from signed URL
3. **Upload to OpenAI** - Send file to OpenAI Files API
4. **Extract with GPT-4o-mini** - Extract structured data:
   - vendorName, invoiceNumber, invoiceDate, amount
   - context (semantic description of work)
   - keywords (normalized search terms)
   - trade (electrical, plumbing, hvac, etc.)
   - workType (labor, materials, equipment, mixed)
5. **Callback to TD3** - Send extracted data to callbackUrl:

```json
{
  "invoiceId": "uuid",
  "n8nExecutionId": "execution-id",
  "success": true,
  "extractedData": {
    "vendorName": "ABC Electric LLC",
    "invoiceNumber": "INV-2024-001",
    "invoiceDate": "2024-01-15",
    "amount": 12500.00,
    "context": "Electrical panel upgrade and wiring for 200amp service",
    "keywords": ["electrical", "panel", "wiring", "200amp"],
    "trade": "electrical",
    "workType": "mixed",
    "confidence": 0.95
  }
}
```

6. **TD3 Matching** - TD3 runs deterministic matching:
   - Amount score (50% weight): How close is invoice amount to draw line amount?
   - Trade score (20% weight): Does extracted trade match budget category?
   - Keyword score (15% weight): Do keywords overlap with category tokens?
   - Training score (15% weight): Has this vendor matched this category before?

7. **Classification & Application:**
   - SINGLE_MATCH (≥85% score, ≥15% gap): Auto-apply match
   - MULTIPLE_CANDIDATES (close scores): Flag for review
   - AMBIGUOUS/NO_CANDIDATES: Flag for manual review

### Security

The callback endpoint verifies requests using a shared secret:
- n8n sends: `X-TD3-Webhook-Secret: <TD3_WEBHOOK_SECRET>`
- TD3 checks: `process.env.N8N_CALLBACK_SECRET`

Both must be set to the same value for callbacks to succeed.

---

## Testing

### Test Budget Import

```bash
curl -X POST https://n8n.srv1208741.hstgr.cloud/webhook/budget-import \
  -H "Content-Type: application/json" \
  -d '{
    "type": "budget",
    "projectId": "test-project-id",
    "columns": {
      "category": {"header": "Item", "values": ["Land", "Foundation", "Framing"]},
      "amount": {"header": "Budget", "values": [50000, 35000, 75000]}
    },
    "metadata": {"fileName": "test.csv", "sheetName": "Sheet1", "totalRows": 3}
  }'
```

### Test Draw Import

```bash
curl -X POST https://n8n.srv1208741.hstgr.cloud/webhook/draw-import \
  -H "Content-Type: application/json" \
  -d '{
    "type": "draw",
    "projectId": "test-project-id",
    "drawNumber": 1,
    "columns": {
      "category": {"header": "Item", "values": ["Land", "Foundation"]},
      "amount": {"header": "Draw 1", "values": [25000, 10000]}
    },
    "metadata": {"fileName": "draw1.csv", "sheetName": "Sheet1", "totalRows": 2}
  }'
```

### Test Invoice Process

```bash
curl -X POST https://n8n.srv1208741.hstgr.cloud/webhook/td3-invoice-process \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "test-invoice-id",
    "fileUrl": "https://example.com/invoice.pdf",
    "fileName": "invoice.pdf",
    "callbackUrl": "https://td3.vercel.app/api/invoices/process-callback",
    "drawRequestId": "test-draw-id",
    "projectId": "test-project-id",
    "projectCode": "TEST-001"
  }'
```

---

## Invoice Disambiguation Webhook

**URL:** `POST https://n8n.srv1208741.hstgr.cloud/webhook/td3-invoice-disambiguate`

This workflow is triggered when deterministic matching identifies multiple viable candidates with similar scores. It uses GPT-4o-mini to select the best match based on semantic analysis of the invoice context.

### When This Workflow is Called

After invoice extraction completes, TD3 classifies the match result:
- **SINGLE_MATCH** (≥85% score, ≥15% gap): Auto-apply → No AI needed
- **MULTIPLE_CANDIDATES** (close scores): → **Triggers this workflow**
- **AMBIGUOUS/NO_CANDIDATES**: Flag for manual review → No AI needed

### Payload Format

```json
{
  "invoiceId": "uuid-of-invoice-record",
  "callbackUrl": "https://td3.vercel.app/api/invoices/disambiguate-callback",
  "extractedData": {
    "vendorName": "ABC Electric LLC",
    "amount": 12500.00,
    "context": "Electrical panel upgrade and wiring for 200amp service",
    "keywords": ["electrical", "panel", "wiring", "200amp"],
    "trade": "electrical",
    "workType": "mixed",
    "vendorType": "subcontractor"
  },
  "candidates": [
    {
      "drawLineId": "uuid-of-draw-line-1",
      "budgetId": "uuid-of-budget",
      "budgetCategory": "Electrical - Rough",
      "nahbCategory": "16000 - Electrical",
      "amountRequested": 12000,
      "scores": {
        "amount": 0.85,
        "trade": 0.90,
        "keywords": 0.75,
        "training": 0.60,
        "composite": 0.82
      },
      "factors": {
        "amountVariance": 0.042,
        "amountVarianceAbsolute": 500,
        "tradeMatch": true,
        "keywordMatches": ["electrical", "wiring"],
        "vendorPreviousMatch": false,
        "trainingReason": null
      }
    },
    {
      "drawLineId": "uuid-of-draw-line-2",
      "budgetId": "uuid-of-budget-2",
      "budgetCategory": "Electrical - Finish",
      "nahbCategory": "16000 - Electrical",
      "amountRequested": 13000,
      "scores": {
        "amount": 0.80,
        "trade": 0.90,
        "keywords": 0.70,
        "training": 0.60,
        "composite": 0.79
      },
      "factors": {
        "amountVariance": 0.038,
        "amountVarianceAbsolute": 500,
        "tradeMatch": true,
        "keywordMatches": ["electrical"],
        "vendorPreviousMatch": false,
        "trainingReason": null
      }
    }
  ]
}
```

### Workflow Processing Steps

1. **Receive Webhook** - Parse JSON payload with invoice data and candidates
2. **Build AI Prompt** - Construct context-rich prompt with:
   - Invoice vendor name, amount, work context
   - Extracted trade and keywords
   - All candidate categories with scores and factors
3. **Call OpenAI** - GPT-4o-mini selects best match:
   - Analyzes vendor name for trade hints (e.g., "ABC Electric" → electrical)
   - Compares work context to candidate categories
   - Considers keyword alignment and amount variance
   - Returns structured JSON with selection and reasoning
4. **Parse Response** - Validate AI selection:
   - Ensure selected drawLineId exists in candidates
   - Extract confidence score and reasoning
5. **Callback to TD3** - Send result to `/api/invoices/disambiguate-callback`

### Callback Payload

**Success:**
```json
{
  "invoiceId": "uuid",
  "n8nExecutionId": "execution-id",
  "success": true,
  "disambiguation": {
    "selectedDrawLineId": "uuid-of-best-match",
    "selectedCategory": "Electrical - Rough",
    "selectedBudgetId": "uuid-of-budget",
    "confidence": 0.85,
    "reasoning": "Invoice from ABC Electric for panel upgrade aligns with Electrical - Rough category which covers rough-in electrical work. The amount variance is minimal (4%) and trade match is exact.",
    "factors": ["trade_match", "vendor_name_hint", "work_context_alignment"],
    "originalScores": {
      "amount": 0.85,
      "trade": 0.90,
      "keywords": 0.75,
      "training": 0.60,
      "composite": 0.82
    }
  }
}
```

**Failure:**
```json
{
  "invoiceId": "uuid",
  "n8nExecutionId": "execution-id",
  "success": false,
  "error": "AI could not select a match"
}
```

### TD3 Callback Handling

The `/api/invoices/disambiguate-callback` endpoint:
1. Verifies webhook secret
2. Validates selected draw line exists
3. Updates invoice with `ai_matched` status
4. Updates draw line with invoice data
5. Records decision in `invoice_match_decisions` audit trail
6. Reconciles NO_INVOICE flags across the draw

### Match Status Flow

```
pending → ai_processing → ai_matched (success)
                       → needs_review (failure)
```

### Test Disambiguation

```bash
curl -X POST https://n8n.srv1208741.hstgr.cloud/webhook/td3-invoice-disambiguate \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "test-invoice-id",
    "callbackUrl": "https://td3.vercel.app/api/invoices/disambiguate-callback",
    "extractedData": {
      "vendorName": "ABC Electric LLC",
      "amount": 12500,
      "context": "Electrical panel upgrade",
      "keywords": ["electrical", "panel"],
      "trade": "electrical"
    },
    "candidates": [
      {
        "drawLineId": "line-1",
        "budgetId": "budget-1",
        "budgetCategory": "Electrical - Rough",
        "nahbCategory": "16000 - Electrical",
        "amountRequested": 12000,
        "scores": {"amount": 0.85, "trade": 0.9, "keywords": 0.75, "training": 0.6, "composite": 0.82},
        "factors": {"amountVariance": 0.04, "amountVarianceAbsolute": 500, "tradeMatch": true, "keywordMatches": ["electrical"], "vendorPreviousMatch": false, "trainingReason": null}
      },
      {
        "drawLineId": "line-2",
        "budgetId": "budget-2",
        "budgetCategory": "Electrical - Finish",
        "nahbCategory": "16000 - Electrical",
        "amountRequested": 13000,
        "scores": {"amount": 0.80, "trade": 0.9, "keywords": 0.70, "training": 0.6, "composite": 0.79},
        "factors": {"amountVariance": 0.04, "amountVarianceAbsolute": 500, "tradeMatch": true, "keywordMatches": ["electrical"], "vendorPreviousMatch": false, "trainingReason": null}
      }
    ]
  }'
```
