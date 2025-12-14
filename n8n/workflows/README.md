# n8n Workflows

TD3 uses n8n Cloud for automation and AI-powered processing.

## Active Workflows

| Workflow ID | Name | Webhook Path | Purpose |
|-------------|------|--------------|---------|
| `ItTSTOvkUTPMLsCq` | TD3 - Budget Import | `/td3-budget-import` | Import budgets from Excel with AI NAHB classification |
| `qmWPuH98SdwkV8iN` | TD3 - Draw Import | `/td3-draw-import` | Import draw requests from spreadsheets |

## Webhook URLs

Base URL: `https://grysngrhm.app.n8n.cloud/webhook`

- **Budget Import**: `POST https://grysngrhm.app.n8n.cloud/webhook/td3-budget-import`
- **Draw Import**: `POST https://grysngrhm.app.n8n.cloud/webhook/td3-draw-import`

## Payload Formats

### Budget Import

```json
{
  "projectCode": "DW - 244",
  "builderName": "LUXE Homes",
  "borrowerName": "Rick Hayse",
  "address": "244 Discovery West Dr, Austin TX",
  "subdivisionName": "Discovery West",
  "subdivisionAbbrev": "DW",
  "lotNumber": "244",
  "loanAmount": 1577290,
  "interestRate": 0.11,
  "loanStartDate": "2025-04-29",
  "lineItems": [
    { "category": "Lot", "budgetAmount": 314000 },
    { "category": "Foundation", "budgetAmount": 70500 },
    { "category": "Framing", "budgetAmount": 96000 }
  ]
}
```

### Draw Import

```json
{
  "projectId": "uuid-of-project",
  "drawNumber": 1,
  "fundedDate": "2025-04-29",
  "lineItems": [
    { "category": "Design", "drawAmount": 23842.25 },
    { "category": "Engineering", "drawAmount": 5603.00 },
    { "category": "Permits and Fees", "drawAmount": 65641.09 }
  ]
}
```

## Features

- **AI-Powered Classification** - Future: GPT-4.1-mini maps builder categories to NAHB cost codes
- **Spreadsheet Parsing** - Client-side parsing with SheetJS, column mapping with AI suggestions
- **Validation** - Checks for budget overages and duplicate entries

## Setup Notes

1. Workflows need Supabase credentials configured in n8n
2. Set `NEXT_PUBLIC_N8N_WEBHOOK_URL` in Vercel environment variables
3. Activate workflows in n8n after configuring credentials

## Local Development

For local development, you can use ngrok or similar to expose n8n webhooks, or use the test mode in n8n.
