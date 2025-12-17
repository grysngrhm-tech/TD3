# TD3 n8n Workflows

This directory contains workflow definitions for n8n Cloud integration.

## Workflows

### td3-invoice-process.json

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

