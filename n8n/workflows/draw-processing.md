# Draw Processing N8N Workflow

This document describes how to set up the draw processing workflow in n8n Cloud.

## Workflow Overview

The draw processing workflow receives draw request data from TD3, uses AI to match invoices to budget categories, generates flags for issues, and returns processed data back to TD3.

## Webhook Endpoint

**URL:** `https://grysngrhm.app.n8n.cloud/webhook/td3-draw-process`
**Method:** POST

## Input Payload

```json
{
  "drawRequestId": "uuid",
  "projectId": "uuid",
  "drawNumber": 3,
  "categories": ["Framing", "Plumbing", "Electrical"],
  "drawAmounts": [12500, 5200, 8000],
  "budgets": [
    {
      "id": "uuid",
      "category": "Framing",
      "nahbCategory": "Framing",
      "nahbSubcategory": "Framing Labor",
      "costCode": "0400",
      "remaining": 32500
    }
  ],
  "invoiceCount": 3
}
```

## Workflow Steps

### 1. Webhook Trigger
- Node: **Webhook**
- Path: `/td3-draw-process`
- HTTP Method: POST

### 2. Fetch Invoices from Supabase
- Node: **Supabase**
- Operation: Select
- Table: `invoices`
- Filter: `draw_request_id = {{ $json.drawRequestId }}`

### 3. Match Categories to NAHB Codes
For each draw category, find the best matching budget line:

- Node: **Code** (JavaScript)
```javascript
const categories = $input.first().json.categories;
const budgets = $input.first().json.budgets;
const drawAmounts = $input.first().json.drawAmounts;

const matches = categories.map((category, index) => {
  // Find exact or fuzzy match in budgets
  let bestMatch = null;
  let bestScore = 0;
  
  for (const budget of budgets) {
    const categoryLower = category.toLowerCase();
    const budgetCatLower = budget.category.toLowerCase();
    const nahbLower = (budget.nahbCategory || '').toLowerCase();
    
    // Exact match
    if (categoryLower === budgetCatLower) {
      bestMatch = budget;
      bestScore = 1.0;
      break;
    }
    
    // Partial match
    if (categoryLower.includes(budgetCatLower) || budgetCatLower.includes(categoryLower)) {
      if (0.8 > bestScore) {
        bestMatch = budget;
        bestScore = 0.8;
      }
    }
    
    // NAHB match
    if (nahbLower && (categoryLower.includes(nahbLower) || nahbLower.includes(categoryLower))) {
      if (0.7 > bestScore) {
        bestMatch = budget;
        bestScore = 0.7;
      }
    }
  }
  
  return {
    category,
    amount: drawAmounts[index],
    matchedBudget: bestMatch,
    confidence: bestScore
  };
});

return { matches };
```

### 4. AI Invoice Matching
- Node: **OpenAI**
- Model: gpt-4o-mini
- Operation: Chat

**System Prompt:**
```
You are matching invoices to budget line items for a construction draw request.
Return a JSON array with invoice matches.
```

**User Prompt:**
```
Budget Categories (with NAHB codes):
{{ $json.budgets.map(b => `- ${b.costCode} ${b.nahbCategory}: ${b.category}`).join('\n') }}

Draw Request Lines:
{{ $json.matches.map((m, i) => `${i+1}. ${m.category}: $${m.amount}`).join('\n') }}

Invoices to match:
{{ $('Fetch Invoices').all().map((inv, i) => `${i+1}. ${inv.json.vendor_name} - $${inv.json.amount}`).join('\n') }}

For each invoice, identify:
1. Which budget category it belongs to
2. Confidence score (0-1)
3. Any flags (AMOUNT_MISMATCH if amounts don't match, DUPLICATE_INVOICE if seen before)

Return as JSON array.
```

### 5. Generate Flags
- Node: **Code** (JavaScript)
```javascript
const matches = $('Match Categories').first().json.matches;
const budgets = $input.first().json.budgets;

const flaggedLines = matches.map(match => {
  const flags = [];
  
  // Check for over budget
  if (match.matchedBudget && match.matchedBudget.remaining !== null) {
    if (match.amount > match.matchedBudget.remaining) {
      flags.push('OVER_BUDGET');
    }
  }
  
  // Check confidence
  if (match.confidence < 0.7) {
    flags.push('LOW_CONFIDENCE');
  }
  
  return {
    category: match.category,
    budget_id: match.matchedBudget?.id || null,
    confidence_score: match.confidence,
    flags: flags
  };
});

return { lines: flaggedLines };
```

### 6. Return Response
- Node: **Respond to Webhook**
- Response Body:
```json
{
  "success": true,
  "lines": {{ $json.lines }}
}
```

## Expected Response

```json
{
  "success": true,
  "lines": [
    {
      "category": "Framing",
      "budget_id": "uuid-of-budget-line",
      "confidence_score": 0.95,
      "flags": []
    },
    {
      "category": "Electrical",
      "budget_id": null,
      "confidence_score": 0.6,
      "flags": ["LOW_CONFIDENCE", "NO_INVOICE"]
    }
  ]
}
```

## Flag Codes

| Code | Meaning |
|------|---------|
| `AMOUNT_MISMATCH` | Invoice total doesn't match requested amount (±$100 tolerance) |
| `NO_INVOICE` | No invoice attached to this line |
| `OVER_BUDGET` | Request would exceed remaining budget |
| `LOW_CONFIDENCE` | AI confidence < 70% |
| `DUPLICATE_INVOICE` | Invoice was already used in a previous draw |

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
