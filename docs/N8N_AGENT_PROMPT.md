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

**Flow:**
```
Form Trigger (draw template + invoices)
  → Extract CSV rows
  → Parse invoices with OpenAI Vision
  → Invoice Matching Agent (matches invoices to budget categories)
  → Create draw request + lines in database
```

**Key Pattern - Invoice Matching Agent:**
Uses an AI agent to match invoice line items to existing budget categories using:
- Builder category text matching
- NAHB code/category matching
- Description keywords
- Amount proximity

**Note:** The new webapp doesn't upload invoices during draw submission (that's a future feature). The new draw workflow is simpler - just receive categories and amounts, match to existing budgets, create draw records.

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

### Workflow 2: TD3 Draw Import

**Webhook Path:** `/draw-import`

**Trigger:** Webhook (receives POST from webapp)

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
  "metadata": {
    "fileName": "July Draw.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 75
  }
}
```

**Processing Steps:**

1. **Webhook Trigger** - Receive JSON payload

2. **Get Existing Budgets (Supabase)**
   ```sql
   SELECT id, category, builder_category_raw, nahb_category, cost_code, remaining_amount
   FROM budgets
   WHERE project_id = $projectId
   ```

3. **Filter Valid Rows (OpenAI)** - Same as budget import

4. **Match to Budget Lines (OpenAI)**
   ```
   Match these draw categories to existing budget lines.
   
   Draw categories: ["Excavation", "Rough Lumber", ...]
   
   Budget lines: [{id, category, builder_category_raw, cost_code}, ...]
   
   Return matches: [{drawIndex, budgetId, confidence}, ...]
   ```

5. **Create Draw Request (Supabase)**
   ```sql
   INSERT INTO draw_requests (project_id, draw_number, total_amount, status)
   VALUES ($projectId, $drawNumber, $totalAmount, 'pending')
   RETURNING id
   ```

6. **Create Draw Lines (Supabase)** - For each matched item with amount > 0:
   ```sql
   INSERT INTO draw_request_lines (draw_request_id, budget_id, amount_requested, confidence_score)
   VALUES ($drawRequestId, $budgetId, $amount, $confidence)
   ```

7. **Update Budget Spent (Supabase)**
   ```sql
   UPDATE budgets SET spent_amount = spent_amount + $amount WHERE id = $budgetId
   ```

8. **Return Response**
   ```json
   {"success": true, "drawRequestId": "uuid", "linesCreated": 12}
   ```

---

## Configuration Requirements

### Credentials Needed

1. **Supabase**
   - Project URL: `https://uewqcbmaiuofdfvqmbmq.supabase.co`
   - API Key: Use service role key (not anon key) for server-side inserts
   
2. **OpenAI**
   - API Key: Existing `OpenAi account` credential
   - Model: `gpt-4o-mini` (cost-effective for classification)

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
- [ ] Fetches existing budgets for the project
- [ ] Matches draw categories to budget lines
- [ ] Creates `draw_requests` record
- [ ] Creates `draw_request_lines` records linked to budgets
- [ ] Updates `spent_amount` on matched budgets
- [ ] Returns JSON response with draw request ID

### Testing
Test with curl commands from `n8n/workflows/README.md`:
```bash
# Budget
curl -X POST https://grysngrhm.app.n8n.cloud/webhook/budget-import \
  -H "Content-Type: application/json" \
  -d '{"type":"budget","projectId":"test-id","columns":{...}}'

# Draw
curl -X POST https://grysngrhm.app.n8n.cloud/webhook/draw-import \
  -H "Content-Type: application/json" \
  -d '{"type":"draw","projectId":"test-id","drawNumber":1,"columns":{...}}'
```

---

## Getting Started

1. Read `docs/ARCHITECTURE.md` for complete system understanding
2. Review `n8n/workflows/README.md` for exact payload formats
3. Check `supabase/README.md` for database schema
4. Create Supabase credentials in n8n if not exists
5. Build Budget Import workflow first (simpler)
6. Build Draw Import workflow second
7. Test with curl, then activate for webapp integration
