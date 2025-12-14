# n8n Workflow Building Task

## Overview

You are tasked with building two n8n workflows that power the TD3 construction draw management web application. The webapp has already been built with a smart spreadsheet upload UI that:

1. Parses Excel/CSV files client-side using SheetJS
2. Auto-detects Category and Amount columns using pattern analysis
3. Lets users confirm/adjust column mappings
4. Extracts only the selected columns and sends them to n8n webhooks

Your job is to build the n8n workflows that receive this data, use AI to process it, and insert it into Supabase.

---

## Documentation References

All technical details are documented in the TD3 repository:

| Document | Location | Contents |
|----------|----------|----------|
| **Architecture Overview** | `docs/ARCHITECTURE.md` | Complete system design, data flow diagrams, webhook payloads, database schema |
| **Webhook Specs** | `n8n/workflows/README.md` | Exact payload formats, processing steps, OpenAI prompts, SQL queries |
| **Database Schema** | `supabase/README.md` | All table structures, relationships, common queries |
| **Type Definitions** | `types/README.md` | TypeScript types for all database entities |

**READ THESE DOCUMENTS BEFORE BUILDING.** They contain the exact webhook payload formats and database insert queries you'll need.

---

## Legacy Workflows (Reference Only)

Two legacy workflows exist that demonstrate n8n patterns for this use case. **DO NOT reuse these directly** - they use n8n DataTables instead of Supabase, and have a different trigger mechanism (form upload vs webhook). However, they show the AI classification patterns you should follow.

### Legacy Workflow 1: "New Project/Budget Upload" (`WIeRKIMyXFaHg3AQ`)

**Flow:**
```
Form Trigger (file upload) 
  → Extract from File 
  → Normalize Budget Rows (Code node)
  → Upsert Projects (DataTable)
  → Map Category to NAHB (OpenAI)
  → Flatten NAHB Mapping (Code node)
  → Upsert Budget Lines (DataTable)
```

**Key Pattern - NAHB Classification Prompt:**
The OpenAI node uses a detailed prompt with the full NAHB cost code taxonomy. The prompt:
- Lists all valid cost codes (0100-1600 with subcategories)
- Requires exact output format: `{nahb_code, nahb_category, nahb_subcategory, confidence}`
- Returns "UNKNOWN" for low-confidence matches (<0.4)
- Uses `gpt-4.1-mini` with temperature 0.2 for consistency

**Key Pattern - Normalize Rows (Code node):**
```javascript
return items.map(item => {
  const row = item.json;
  return {
    json: {
      project_code: row['Project Code'],
      builder_category_raw: row['Builder Category'],
      budget_amount: Number(row['Budget Amount'] || 0),
      // ... other fields
    }
  };
});
```

### Legacy Workflow 2: "Draw Upload 2.0" (`ainNGNiXrFkytveN`)

This is a complex workflow that processes both draw request spreadsheets AND invoice PDFs, using AI to match invoices to budget categories.

**Flow Diagram:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INVOICE PROCESSING BRANCH                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Form Trigger ──► Split Invoices ──► Upload to OpenAI Files ──► Wait       │
│       │               to Items              │                      │        │
│       │                  │                  │                      │        │
│       │                  ▼                  ▼                      ▼        │
│       │          Upload to Drive    Build Responses Body ──► Call OpenAI   │
│       │               │                                     Responses API  │
│       │               │                                          │         │
│       │               ▼                                          ▼         │
│       │        Build Invoice Map                          Parse Response   │
│       │               │                                          │         │
│       │               └──────────────────┐    ┌──────────────────┘         │
│       │                                  ▼    ▼                             │
├───────┼──────────────────────────► Merge + Drive Map                       │
│       │                                  │                                  │
├───────┼──────────────────────────────────┼──────────────────────────────────┤
│                          DRAW TEMPLATE BRANCH                               │
├─────────────────────────────────────────────────────────────────────────────┤
│       │                                  │                                  │
│       └──► Extract CSV ──► Get Budget Lines ──► Build CSV JSON             │
│                                                       │                     │
│                                                       └─────────┐          │
│                                                                 ▼          │
├─────────────────────────────────────────────────────────────────────────────┤
│                          AI MATCHING & DATABASE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                    Invoice Matching Agent   │
│                        Merge ────────────────────►     (GPT-4.1)           │
│                          │                              │                   │
│                          ▼                              ▼                   │
│                  Build Final Draw Request ◄────── Merge + Drive Map        │
│                          │                                                  │
│                          ▼                                                  │
│                  Build Draw Request Lines                                   │
│                          │                                                  │
│                          ▼                                                  │
│                  Upsert to Database                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Pattern - Invoice Extraction Prompt (OpenAI Responses API):**
```
Extract every invoice from the attached files and return ONLY a JSON array
with one object per invoice using this exact schema (no extra text, no markdown):

[
  {
    "file_name": "string",
    "vendor_name": "string or null",
    "invoice_number": "string or null",
    "invoice_date": "YYYY-MM-DD or null",
    "total_amount": number or null,
    "line_items": [
      {
        "description": "string",
        "line_total": number or null
      }
    ],
    "project_reference": "string or null",
    "flags": ["string"]
  }
]
```

**Key Pattern - Invoice Matching Agent System Prompt:**
The Invoice Matching Agent is an AI that receives:
- `invoices_array`: Parsed invoices from OpenAI (vendor, amounts, line items)
- `csv_rows`: Draw template lines with NAHB mappings

It matches invoice line items to budget categories using:
- Builder category text
- NAHB code/category/subcategory
- Description keywords and vendor name
- Amounts: `line_total` vs `draw_amount`

**Output Structure:**
```json
{
  "matched_invoices": [
    {
      "file_name": "string",
      "vendor_name": "string",
      "invoice_number": "string",
      "invoice_date": "string",
      "total_amount": number,
      "matched_amount": number,
      "line_items": [
        {
          "description": "string",
          "line_total": number,
          "matched_to_builder_category": "string",
          "matched_to_nahb_code": "string",
          "confidence_score": 0.95
        }
      ]
    }
  ],
  "matching_report": {
    "total_invoices": number,
    "total_invoice_amount": number,
    "total_draw_amount": number,
    "total_matched_amount": number,
    "unmatched_invoices_count": number,
    "overall_confidence_score": number
  },
  "unmatched_line_items": [
    {
      "source": "invoice" | "draw_line",
      "builder_category": "string",
      "line_total": number,
      "reason_unmatched": "string"
    }
  ]
}
```

---

## NEW Workflows to Build

### Workflow 1: TD3 Budget Import

**Webhook Path:** `/budget-import`

**Trigger:** Webhook (receives POST from webapp)

**Input Payload:**
```json
{
  "type": "budget",
  "projectId": "uuid-of-existing-project",
  "columns": {
    "category": {
      "header": "Item",
      "values": ["Land", "Excavation", "Foundation", "TOTALS", "", ...]
    },
    "amount": {
      "header": "Rough Budget", 
      "values": [50000, 19246, 35000, 450000, 0, ...]
    }
  },
  "metadata": {
    "fileName": "Builder Budget.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 111
  }
}
```

**Processing Steps:**

1. **Webhook Trigger** - Receive JSON payload

2. **Filter Valid Rows (OpenAI)**
   Use AI to identify which indices are actual budget items:
   ```
   Given this list of budget categories, return a JSON array of indices 
   (0-based) that are actual budget line items.
   
   Exclude: headers ("Item"), totals ("TOTALS"), section headers, empty rows
   
   Categories: [array from payload]
   Return: [2, 3, 5, 7, ...]
   ```

3. **Filter to Valid Items (Code node)**
   Keep only items at the returned indices with amount > 0

4. **Map to NAHB Codes (OpenAI)**
   For each valid category, map to NAHB using the full cost code taxonomy.
   Use the same prompt pattern from the legacy workflow.
   
   Output per item:
   ```json
   {
     "original": "Excavation",
     "nahb_code": "0270",
     "nahb_category": "Site Work",
     "nahb_subcategory": "Excavation",
     "confidence": 0.95
   }
   ```

5. **Insert to Supabase (Supabase node or HTTP Request)**
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
     $nahbSubcategory,  -- Use subcategory as primary category
     $originalCategory,
     $amount,
     $amount,
     0,
     $nahbCategory,
     $nahbSubcategory,
     $nahbCode,
     $confidence
   )
   ```

6. **Return Response**
   ```json
   {"success": true, "imported": 45, "skipped": 30}
   ```

---

### Workflow 2: TD3 Draw Import (with Invoice Processing)

**Webhook Path:** `/draw-import`

**Trigger:** Webhook (receives POST from webapp)

**IMPORTANT:** This workflow must process BOTH the draw spreadsheet data AND invoice PDFs submitted by the builder. The AI must match invoice line items to budget categories to validate the draw request.

**Input Payload:**
```json
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
  "invoices": [
    {
      "fileName": "Invoice_Excavation.pdf",
      "fileData": "base64-encoded-pdf-content"
    },
    {
      "fileName": "Foundation_Receipt.pdf", 
      "fileData": "base64-encoded-pdf-content"
    }
  ],
  "metadata": {
    "fileName": "July Draw.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 75
  }
}
```

**Processing Steps:**

#### Branch 1: Invoice Processing Pipeline

1. **Extract Invoice Files** - Split base64 invoices into individual binary items

2. **Upload to OpenAI Files** - Use OpenAI Files API to upload each PDF
   ```javascript
   // Node: Upload to OpenAI Files
   // Type: @n8n/n8n-nodes-langchain.openAi
   // Resource: file
   // Purpose: user_data
   ```

3. **Wait** - Brief pause (3 seconds) for OpenAI to process uploads

4. **Build Responses Body** - Construct OpenAI Responses API request:
   ```javascript
   const pdfFileIds = items.map(item => item.json.id).filter(id => !!id);
   
   const prompt = `
   Extract every invoice from the attached files and return ONLY a JSON array
   with one object per invoice using this exact schema:
   
   [
     {
       "file_name": "string",
       "vendor_name": "string or null",
       "invoice_number": "string or null",
       "invoice_date": "YYYY-MM-DD or null",
       "total_amount": number or null,
       "line_items": [
         { "description": "string", "line_total": number or null }
       ],
       "project_reference": "string or null",
       "flags": ["string"]
     }
   ]
   `;
   
   return [{
     json: {
       body: {
         model: "gpt-4o-mini",
         input: [{
           role: "user",
           content: [
             { type: "input_text", text: prompt },
             ...pdfFileIds.map(id => ({ type: "input_file", file_id: id }))
           ]
         }],
         text: { format: { type: "json_object" } }
       }
     }
   }];
   ```

5. **Call OpenAI Responses** - HTTP Request to `/v1/responses`

6. **Parse OpenAI Response** - Extract the parsed invoice JSON

#### Branch 2: Draw Template Processing

7. **Get Existing Budgets (Supabase)** - Fetch budget lines for this project:
   ```sql
   SELECT id, category, builder_category_raw, nahb_category, nahb_subcategory, 
          cost_code, original_amount, spent_amount,
          (original_amount - spent_amount) as remaining_amount
   FROM budgets
   WHERE project_id = $projectId
   ```

8. **Filter Valid Rows (OpenAI)** - Same as budget import (filter headers/totals)

9. **Build CSV JSON** - Create enriched draw lines with NAHB mappings:
   ```javascript
   // For each draw line with amount > 0:
   // - Look up matching budget line by category
   // - Attach NAHB code/category/subcategory
   // - Output: { builder_category, draw_amount, nahb_code, nahb_category, ... }
   ```

#### Merge & Match

10. **Merge** - Combine parsed invoices with draw template data

11. **Invoice Matching Agent (AI)** - Use AI agent to match invoice line items to draw lines:
    
    **System Prompt:**
    ```
    You are an expert construction draw-review analyst.
    
    INPUT:
    - invoices_array: Parsed invoices with vendor, amounts, line items
    - csv_rows: Draw template lines with NAHB mappings
    
    TASK:
    For each invoice line item, match it to the most appropriate draw line using:
    - builder_category text similarity
    - nahb_code / nahb_category / nahb_subcategory
    - description keywords and vendor_name
    - amounts: line_total vs draw_amount
    
    OUTPUT (JSON):
    {
      "matched_invoices": [...],
      "matching_report": {
        "total_invoices": n,
        "total_invoice_amount": n,
        "total_draw_amount": n,
        "total_matched_amount": n,
        "unmatched_invoices_count": n,
        "overall_confidence_score": 0.0-1.0
      },
      "unmatched_line_items": [...]
    }
    ```

12. **Build Final Draw Request** - Construct the complete draw request object:
    ```javascript
    {
      draw_request_id: generateId(),
      project_id: projectId,
      draw_number: drawNumber,
      total_requested_amount: sum(draw_amounts),
      status: 'pending',
      invoices_json: matchedInvoices,
      matching_report_json: matchingReport
    }
    ```

#### Database Inserts

13. **Create Draw Request (Supabase)**:
    ```sql
    INSERT INTO draw_requests (
      project_id, draw_number, total_amount, status, request_date,
      matching_report, overall_confidence
    ) VALUES (
      $projectId, $drawNumber, $totalAmount, 'pending', NOW(),
      $matchingReportJson, $overallConfidence
    ) RETURNING id
    ```

14. **Create Draw Lines (Supabase)** - For each matched item with amount > 0:
    ```sql
    INSERT INTO draw_request_lines (
      draw_request_id,
      budget_id,
      builder_category,
      amount_requested,
      matched_invoice_amount,
      variance,
      invoice_vendor_name,
      invoice_number,
      invoice_date,
      confidence_score,
      flags
    ) VALUES (
      $drawRequestId,
      $budgetId,
      $builderCategory,
      $drawAmount,
      $matchedAmount,
      $variance,
      $vendorName,
      $invoiceNumber,
      $invoiceDate,
      $confidence,
      $flags
    )
    ```

15. **Update Budget Spent (Supabase)** - Only for approved draws:
    ```sql
    UPDATE budgets 
    SET spent_amount = spent_amount + $amount 
    WHERE id = $budgetId
    ```

16. **Return Response**:
    ```json
    {
      "success": true,
      "drawRequestId": "uuid",
      "linesCreated": 12,
      "matchingReport": {
        "totalInvoices": 5,
        "totalInvoiceAmount": 52813.12,
        "totalDrawAmount": 52813.12,
        "matchedAmount": 51500.00,
        "unmatchedCount": 1,
        "overallConfidence": 0.87
      }
    }
    ```

---

## Configuration Requirements

### Credentials Needed

1. **Supabase**
   - Project URL: `https://uewqcbmaiuofdfvqmbmq.supabase.co`
   - API Key: Use service role key (not anon key) for server-side inserts
   
2. **OpenAI**
   - API Key: Existing `OpenAi account` credential
   - Models used:
     - `gpt-4o-mini` for NAHB classification and row filtering
     - `gpt-4.1` for Invoice Matching Agent (more complex reasoning)

3. **Google Drive (Optional)** - For permanent invoice storage
   - If you want to store invoice PDFs permanently, configure Google Drive OAuth

### Webhook Setup

After building, the webapp will call these URLs:
- Budget: `https://grysngrhm.app.n8n.cloud/webhook/budget-import`
- Draw: `https://grysngrhm.app.n8n.cloud/webhook/draw-import`

Set these paths in the Webhook trigger nodes.

---

## NAHB Cost Code Reference

Use this exact taxonomy in the classification prompt:

```
0100 – General Conditions
  0110 Project Management & Admin
  0120 Temporary Facilities
  0130 Jobsite Services
  0140 Temporary / ARC Required Fencing
  0150 Construction Cleanup & Final Clean
  0160 Permits & Fees
  0170 General Liability Insurance
  0180 Builder's Risk / Property Insurance

0200 – Site Work
  0210 Lot Acquisition
  0220 Clear & Grub
  0230 Surveying
  0240 Engineering (Civil)
  0250 Design Review Fees / Compliance Deposits
  0260 Landscape Design
  0270 Excavation
  0280 Backfill
  0290 Trenching & Utilities
  0295 Final Grading

0300 – Concrete & Foundations
  0310 Footings & Foundation Walls
  0320 Foundation Waterproofing
  0330 Interior Slabs
  0340 Gravel Base Material
  0350 Rain Drain Piping
  0360 Concrete Flatwork (Driveways, Patios)

0400 – Framing
  0410 Framing Lumber
  0420 Framing Labor
  0430 Exterior Doors & Windows Install
  0440 Stair & Guardrail Framing
  0450 Roof Sheathing / Roof Framing Prep

0500 – Roofing
  0510 Roofing
  0520 Gutters & Downspouts

0600 – Exterior Finishes
  0610 Stucco
  0620 Masonry Veneer
  0630 Siding Labor
  0640 Exterior Painting
  0650 Deck Tile / Porcelain Paver Systems
  0660 Deck & Stairway Railings

0700 – Windows & Doors
  0710 Windows (Materials)
  0720 Exterior Doors (Materials)
  0730 Interior Doors – Slabs
  0740 Interior Doors – Prep & Hang
  0750 Door Hardware

0800 – Plumbing
  0810 Plumbing Rough-In & Finish
  0820 Plumbing Fixtures
  0830 Shower Glass
  0840 Bath Accessories
  0850 ADU Plumbing Extras

0900 – HVAC / Mechanical
  0910 Mechanical Rough-in & Finish
  0920 Sheet Metal / Ducting
  0930 Fireplaces & Surrounds
  0940 Mini-split / ADU Split System

1000 – Electrical & Low Voltage
  1010 Electrical Rough-In & Finish
  1020 Light Fixtures
  1030 Low Voltage Rough-In
  1040 Smart Home / Controls

1100 – Insulation & Drywall
  1110 Insulation
  1120 Drywall
  1130 Interior Paint

1200 – Interior Finishes
  1210 Interior Trim
  1220 Finish Carpentry
  1230 Accent Walls
  1240 Cabinetry (Materials)
  1250 Cabinetry Install
  1260 Closets & Shelving
  1270 Mirrors
  1280 Fireplace & Mantels

1300 – Flooring
  1310 Hardwood
  1320 Carpet Materials
  1330 Carpet Install
  1340 Tile Labor
  1350 Tile Materials

1400 – Countertops
  1410 Quartz Countertops

1500 – Appliances
  1510 Appliances

1600 – Landscaping & Exterior Amenities
  1610 Landscape & Irrigation
  1620 Paver Patios
  1630 Firepit
  1640 Fence
  1650 Front & Back Patios
```

---

## Success Criteria

### Budget Import Workflow
- [ ] Receives webhook POST at `/budget-import`
- [ ] Filters out non-budget rows (headers, totals, empty)
- [ ] Maps each category to NAHB codes with confidence scores
- [ ] Inserts valid items into Supabase `budgets` table
- [ ] Returns JSON response with import count

### Draw Import Workflow
- [ ] Receives webhook POST at `/draw-import`
- [ ] **Processes invoice PDFs through OpenAI Files API**
- [ ] **Extracts vendor, amounts, and line items from invoices**
- [ ] Fetches existing budgets for the project
- [ ] **Matches invoice line items to draw categories using AI**
- [ ] **Calculates variance between draw amounts and invoice amounts**
- [ ] Creates `draw_requests` record with matching report
- [ ] Creates `draw_request_lines` records with invoice matching data
- [ ] Updates `spent_amount` on matched budgets (when approved)
- [ ] Returns JSON response with draw request ID and matching report

### Testing
Test with curl commands from `n8n/workflows/README.md`:
```bash
# Budget
curl -X POST https://grysngrhm.app.n8n.cloud/webhook/budget-import \
  -H "Content-Type: application/json" \
  -d '{"type":"budget","projectId":"test-id","columns":{...}}'

# Draw (with invoices)
curl -X POST https://grysngrhm.app.n8n.cloud/webhook/draw-import \
  -H "Content-Type: application/json" \
  -d '{
    "type":"draw",
    "projectId":"test-id",
    "drawNumber":1,
    "columns":{...},
    "invoices":[
      {"fileName":"invoice1.pdf","fileData":"base64..."}
    ]
  }'
```

---

## Getting Started

1. Read `docs/ARCHITECTURE.md` for complete system understanding
2. Review `n8n/workflows/README.md` for exact payload formats
3. Check `supabase/README.md` for database schema
4. Create Supabase credentials in n8n if not exists
5. **Build Budget Import workflow first (simpler - no invoices)**
6. **Build Draw Import workflow second (complex - invoice processing)**
7. Test with curl, then activate for webapp integration

---

## Webapp UI Updates Needed

**Note:** The current webapp UI only supports spreadsheet upload. To fully support the draw import workflow with invoice processing, the webapp needs to be updated to:

1. Add an invoice upload field to the Draw Import modal
2. Support multiple file uploads (PDFs)
3. Convert uploaded files to base64 for the webhook payload
4. Display the matching report returned by the workflow

This is a separate task from the n8n workflow building.
