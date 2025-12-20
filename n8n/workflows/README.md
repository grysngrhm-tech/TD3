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
