# Draw Processing N8N Workflow

This document describes how to set up the draw processing workflow in the self-hosted n8n instance.

## Workflow Overview

The draw processing workflow receives **post-creation** draw request data from TD3. The webapp has already created the draw_request and draw_request_lines in Supabase with client-side fuzzy matching. N8N's role is:

1. AI-powered invoice matching to draw lines
2. Flag generation for issues
3. Updating line records with invoice data

## Webhook Endpoint

**URL:** `https://n8n.srv1208741.hstgr.cloud/webhook/td3-draw-process`
**Method:** POST

## Input Payload (Enriched)

The webapp sends an enriched payload with line IDs and matched budget context:

```json
{
  "drawRequestId": "uuid",
  "projectId": "uuid",
  "lines": [
    {
      "lineId": "uuid-of-draw-request-line",
      "builderCategory": "Framing Labor",
      "nahbCategory": "Framing",
      "nahbSubcategory": "Framing Labor",
      "costCode": "0400",
      "budgetAmount": 50000,
      "remainingAmount": 32500,
      "amountRequested": 12500
    },
    {
      "lineId": "uuid-of-unmatched-line",
      "builderCategory": "Mystery Category",
      "nahbCategory": null,
      "nahbSubcategory": null,
      "costCode": null,
      "budgetAmount": 0,
      "remainingAmount": 0,
      "amountRequested": 5000
    }
  ],
  "invoiceCount": 3
}
```

Note: Lines with `nahbCategory: null` were not matched client-side and have the `NO_BUDGET_MATCH` flag.

## Workflow Steps

### 1. Webhook Trigger
- Node: **Webhook**
- Path: `/td3-draw-process`
- HTTP Method: POST

### 2. Fetch Invoices from Supabase Storage
- Node: **Supabase**
- Operation: Select
- Table: `invoices`
- Filter: `draw_request_id = {{ $json.drawRequestId }}`

Or fetch directly from storage bucket:
- Bucket: `documents`
- Path: `invoices/{{ $json.projectId }}/{{ $json.drawRequestId }}/`

### 3. Prepare Line Context
Enrich each line with full context for AI matching:

- Node: **Code** (JavaScript)
```javascript
const lines = $input.first().json.lines;
const invoices = $('Fetch Invoices').all().map(i => i.json);

// Build context for AI
const lineContext = lines.map(line => ({
  lineId: line.lineId,
  builderCategory: line.builderCategory,
  nahbCategory: line.nahbCategory,
  nahbSubcategory: line.nahbSubcategory,
  costCode: line.costCode,
  amountRequested: line.amountRequested,
  hasMatch: line.nahbCategory !== null
}));

return { 
  lines: lineContext, 
  invoices: invoices,
  invoiceCount: invoices.length 
};
```

### 4. AI Invoice Matching
- Node: **OpenAI**
- Model: gpt-4o-mini
- Operation: Chat

**System Prompt:**
```
You are matching invoices to construction draw request line items.
You receive draw lines with their category context (builder category + NAHB code) and a list of invoices.
Match each invoice to the most appropriate draw line based on:
- Vendor name similarity to category
- Invoice description keywords
- Amount proximity

Return a JSON array of matches.
```

**User Prompt:**
```
Draw Request Lines (with context):
{{ $json.lines.map((l, i) => 
  `${i+1}. [${l.lineId}] ${l.builderCategory} (${l.nahbCategory || 'unmatched'}) - $${l.amountRequested}`
).join('\n') }}

Invoices to match:
{{ $json.invoices.map((inv, i) => 
  `${i+1}. ${inv.vendor_name} - $${inv.amount} - ${inv.file_name || 'No filename'}`
).join('\n') }}

For each invoice, return:
- lineId: The UUID of the matching draw line (from the list above)
- invoiceUrl: The invoice file_url
- vendorName: The vendor name
- amount: The invoice amount
- confidence: 0-1 score
- flags: Array of issues (AMOUNT_MISMATCH if >$100 difference, NO_INVOICE if unmatched)

Return as JSON array. Unmatched invoices should have lineId: null.
```

### 5. Generate Additional Flags
- Node: **Code** (JavaScript)
```javascript
const aiMatches = $('AI Invoice Matching').first().json;
const originalLines = $('Prepare Line Context').first().json.lines;

const updates = originalLines.map(line => {
  const matchedInvoice = aiMatches.find(m => m.lineId === line.lineId);
  const flags = [];
  
  // Check for no invoice
  if (!matchedInvoice) {
    flags.push('NO_INVOICE');
  }
  
  // Check for low confidence
  if (matchedInvoice && matchedInvoice.confidence < 0.7) {
    flags.push('LOW_CONFIDENCE');
  }
  
  // Amount mismatch (already from AI, but verify)
  if (matchedInvoice && Math.abs(matchedInvoice.amount - line.amountRequested) > 100) {
    if (!flags.includes('AMOUNT_MISMATCH')) {
      flags.push('AMOUNT_MISMATCH');
    }
  }
  
  return {
    lineId: line.lineId,
    invoice_file_url: matchedInvoice?.invoiceUrl || null,
    invoice_vendor_name: matchedInvoice?.vendorName || null,
    matched_invoice_amount: matchedInvoice?.amount || null,
    confidence_score: matchedInvoice?.confidence || null,
    flags: flags
  };
});

return { updates };
```

### 6. Update Draw Lines in Supabase
- Node: **Supabase** (Loop over updates)
- Operation: Update
- Table: `draw_request_lines`
- Filter: `id = {{ $json.lineId }}`
- Data:
```json
{
  "invoice_file_url": "{{ $json.invoice_file_url }}",
  "invoice_vendor_name": "{{ $json.invoice_vendor_name }}",
  "matched_invoice_amount": {{ $json.matched_invoice_amount }},
  "confidence_score": {{ $json.confidence_score }},
  "flags": "{{ JSON.stringify($json.flags) }}"
}
```

### 7. Return Response
- Node: **Respond to Webhook**
- Response Body:
```json
{
  "success": true,
  "processedLines": {{ $json.updates.length }},
  "matchedWithInvoice": {{ $json.updates.filter(u => u.invoice_file_url).length }},
  "flaggedLines": {{ $json.updates.filter(u => u.flags.length > 0).length }}
}
```

## Expected Response

The workflow returns a summary of processing results. Line updates are written directly to Supabase.

```json
{
  "success": true,
  "processedLines": 10,
  "matchedWithInvoice": 8,
  "flaggedLines": 3
}
```

### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether processing completed |
| `processedLines` | number | Total lines processed |
| `matchedWithInvoice` | number | Lines with matched invoices |
| `flaggedLines` | number | Lines with one or more flags |

### Database Updates Made

The workflow updates `draw_request_lines` directly:

| Field | Source |
|-------|--------|
| `invoice_file_url` | Matched invoice storage URL |
| `invoice_vendor_name` | Extracted vendor name |
| `matched_invoice_amount` | Invoice amount |
| `confidence_score` | AI matching confidence |
| `flags` | JSON array of flag codes |

## Flag Codes

| Code | Source | Meaning |
|------|--------|---------|
| `NO_BUDGET_MATCH` | Webapp | Category not found in project budget (set during import) |
| `OVER_BUDGET` | Webapp | Request would exceed remaining budget (set during import) |
| `AMOUNT_MISMATCH` | N8N | Invoice total doesn't match requested amount (±$100 tolerance) |
| `NO_INVOICE` | N8N | No invoice matched to this line |
| `LOW_CONFIDENCE` | N8N | AI confidence < 70% |
| `DUPLICATE_INVOICE` | N8N | Invoice was already used in a previous draw |

**Note:** `NO_BUDGET_MATCH` and `OVER_BUDGET` are set by the webapp during draw import. N8N adds `AMOUNT_MISMATCH`, `NO_INVOICE`, `LOW_CONFIDENCE`, and `DUPLICATE_INVOICE` during invoice processing.

## Testing

1. Create a test draw request in TD3
2. Use n8n's webhook test feature to see the payload
3. Verify AI matching returns expected results
4. Check flags are generated correctly

## Error Handling

The workflow should:
- Return `{ "success": false, "error": "message" }` on failure
- Log errors to n8n's execution history
- Not fail silently - TD3 needs to know if processing failed
