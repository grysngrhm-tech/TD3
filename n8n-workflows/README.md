# TD3 n8n Workflows

This directory contains workflow definitions for n8n Cloud integration.

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Workflow JSON | ✅ Ready | `td3-invoice-process.json` v3 |
| TD3 Upload API | ✅ Ready | Generates signed URLs, triggers webhook |
| TD3 Callback API | ✅ Ready | Receives results, updates database |
| **n8n Import** | ⏳ Pending | Import workflow to n8n Cloud |
| **Credentials** | ⏳ Pending | Configure OpenAI in n8n |
| **Environment** | ⏳ Pending | Set TD3_API_URL in n8n |

## Workflows

### td3-invoice-process.json (v3)

Two-stage AI invoice processing workflow that:
1. Downloads invoice PDF from signed Supabase Storage URL
2. Uploads file to OpenAI Files API for processing
3. Extracts invoice data using GPT-4o-mini (vendor, amount, date, line items)
4. Matches extracted data to budget categories using GPT-4o agent
5. Sends results back to TD3 via callback endpoint

## Setup Instructions

### 1. Import Workflow to n8n Cloud

1. Log in to your n8n Cloud instance
2. Go to **Workflows** → **Import from File**
3. Select `td3-invoice-process.json`
4. The workflow will be created in inactive state

### 2. Configure Credentials

The workflow requires an **OpenAI API** credential:

1. Go to **Credentials** in n8n
2. Create new **OpenAI API** credential
3. Add your OpenAI API key
4. Name it "OpenAi account" (or update the workflow to match your credential name)

### 3. Set Environment Variables

In n8n Cloud settings, add the following environment variable:

```
TD3_API_URL=https://your-td3-deployment.vercel.app
```

Replace with your actual TD3 deployment URL. For local development, use:
```
TD3_API_URL=http://localhost:3000
```

**Note**: For local development, n8n Cloud cannot reach `localhost`. You'll need to use a tunnel service like ngrok or deploy to a public URL.

### 4. Activate the Workflow

1. Open the imported workflow
2. Click **Active** toggle in the top right
3. Test by uploading an invoice through TD3

## Workflow Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Webhook   │────▶│  Download    │────▶│  Upload to       │
│  (trigger)  │     │  Invoice     │     │  OpenAI Files    │
└─────────────┘     └──────────────┘     └──────────────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Check     │◀────│  Parse       │◀────│  Call OpenAI     │
│   Error     │     │  Response    │     │  Responses API   │
└──────┬──────┘     └──────────────┘     └──────────────────┘
       │
       ├──────────▶ [Error Path] ──▶ Error Callback ──▶ Respond
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Matching   │────▶│  Build       │────▶│  Success         │
│  Agent      │     │  Payload     │     │  Callback        │
└─────────────┘     └──────────────┘     └───────┬──────────┘
       ▲                                         │
       │                                         ▼
┌─────────────┐                          ┌──────────────────┐
│  OpenAI     │                          │    Respond       │
│  Chat GPT-4o│                          │    Webhook       │
└─────────────┘                          └──────────────────┘
```

## Webhook Endpoint

Once active, the workflow webhook is available at:
```
https://grysngrhm.app.n8n.cloud/webhook/td3-invoice-process
```

### Request Payload

```json
{
  "invoiceId": "uuid",
  "fileUrl": "https://...(signed URL)",
  "fileName": "invoice.pdf",
  "drawRequestId": "uuid",
  "projectId": "uuid",
  "projectCode": "DW-244",
  "budgetCategories": [
    {
      "id": "uuid",
      "category": "Foundation",
      "nahbCategory": "3000",
      "budgetAmount": 50000,
      "drawnToDate": 25000,
      "remaining": 25000
    }
  ],
  "drawLines": [
    {
      "id": "uuid",
      "budgetId": "uuid",
      "budgetCategory": "Foundation",
      "amountRequested": 10000
    }
  ]
}
```

### Response

```json
{
  "received": true,
  "invoiceId": "uuid",
  "status": "processing"
}
```

## Callback Endpoint

The workflow calls back to TD3 at:
- Success: `POST /api/invoices/process-callback`
- Error: `POST /api/invoices/process-callback`

### Success Payload

```json
{
  "invoiceId": "uuid",
  "success": true,
  "extractedData": {
    "vendorName": "Acme Construction",
    "invoiceNumber": "INV-001",
    "invoiceDate": "2024-01-15",
    "amount": 5000.00,
    "lineItems": [...],
    "constructionCategory": "Foundation",
    "projectReference": "DW-244"
  },
  "matching": {
    "matchedCategory": "Foundation",
    "matchedNahbCode": "3000",
    "matchedDrawLineId": "uuid",
    "matchedBudgetId": "uuid",
    "confidenceScore": 0.92,
    "matchReasoning": "Vendor name and amount match foundation work...",
    "flags": []
  }
}
```

### Error Payload

```json
{
  "invoiceId": "uuid",
  "success": false,
  "error": "Failed to extract data from invoice"
}
```

## Key Improvements in v3

The v3 workflow includes significant improvements over the original:

### 1. Two-Stage AI Processing
- **Stage 1**: GPT-4o-mini extracts raw invoice data (fast, cost-effective)
- **Stage 2**: GPT-4o agent performs intelligent matching with reasoning

### 2. OpenAI Files API + Responses API
- Uses OpenAI's native file upload for reliable PDF/image processing
- Calls `/v1/responses` API with `input_file` for vision capabilities
- More reliable than base64 encoding in chat messages

### 3. Comprehensive Error Handling
- Every node has `continueOnFail: true` where appropriate
- Error path ensures callback always happens
- Both success and error paths reach `Respond` node (no empty responses)

### 4. Rich Context for Matching
- Receives full budget category details (amounts, NAHB codes, remaining balance)
- Receives current draw line details
- AI agent uses this context for intelligent matching with confidence scoring

### 5. Detailed Matching Output
- `matchedCategory` - Budget category name
- `matchedNahbCode` - NAHB standard code
- `matchedDrawLineId` - Direct link to draw line
- `confidenceScore` - 0.0 to 1.0 confidence
- `matchReasoning` - AI explanation of match
- `flags` - Array of concerns (LOW_CONFIDENCE, AMOUNT_MISMATCH, etc.)

---

## Troubleshooting

### "Workflow returned empty response"
- Check that the workflow is **active**
- Verify OpenAI credentials are configured
- Check n8n execution logs for errors

### "Failed to download invoice"
- Verify the signed URL is valid (1 hour expiry)
- Check that Supabase Storage bucket allows access

### Low confidence scores
- Review the budget categories sent in the payload
- Ensure NAHB codes are properly mapped
- Check that invoice quality is readable

## Updating the Workflow

1. Make changes in n8n Cloud directly
2. Export updated workflow JSON
3. Replace `td3-invoice-process.json` in this repo
4. Commit changes

---

## Quick Reference for MCP Import

If using n8n MCP tools to import/update the workflow:

```javascript
// List workflows to find existing one
mcp_MCP_DOCKER_n8n_list_workflows({ limit: 20 })

// Get existing workflow
mcp_MCP_DOCKER_n8n_get_workflow({ id: "qp7rLsshBYNpgk3V" })

// Update workflow with new JSON
// Read td3-invoice-process.json and use:
mcp_MCP_DOCKER_n8n_update_full_workflow({
  id: "qp7rLsshBYNpgk3V",
  name: "TD3 Invoice Process v3",
  nodes: [...],  // from JSON
  connections: {...}  // from JSON
})
```

### Critical Post-Import Steps

1. **Fix credential references** - The imported workflow has placeholder credential IDs
2. **Set environment variable** - `TD3_API_URL` must point to deployed TD3 instance
3. **Activate workflow** - Toggle it ON in n8n
4. **Update TD3 env** - Ensure `NEXT_PUBLIC_N8N_WEBHOOK_URL` matches webhook URL

