# N8N Invoice Matching Integration

## Objective
Build and integrate the `td3-draw-process` N8N workflow that performs AI-powered invoice-to-draw-line matching after draw requests are created.

## Current State
- Webapp creates `draw_request` + `draw_request_lines` directly in Supabase with client-side fuzzy matching
- N8N webhook is called AFTER creation with enriched payload (see `ImportPreview.tsx` lines 480-510)
- Invoice files uploaded to Supabase Storage at `invoices/{projectId}/{drawId}/`
- Draw review page (`/draws/[id]`) has "Re-run Invoice Matching" button ready for integration

## Your Tasks

### 1. Build N8N Workflow
Create workflow at `https://n8n.srv1208741.hstgr.cloud/webhook/td3-draw-process`:
- Fetch invoices from Supabase Storage for the draw
- Use OpenAI to match invoices to draw lines using category context
- Update `draw_request_lines` with: `invoice_file_url`, `invoice_vendor_name`, `matched_invoice_amount`, `confidence_score`, `flags`

### 2. Integrate with Draw Review Page
Wire up `rerunInvoiceMatching()` in `/draws/[id]/page.tsx` to call the N8N webhook and refresh data.

## Key Documentation

| File | Purpose |
|------|---------|
| `n8n/workflows/draw-processing.md` | **Complete workflow spec** - payload format, AI prompts, flag codes |
| `docs/ARCHITECTURE.md` | Draw funding system overview, data flow diagrams |
| `app/draws/[id]/page.tsx` | Draw review page - has `rerunInvoiceMatching()` stub |
| `app/components/import/ImportPreview.tsx` | Reference for webhook call pattern (lines 480-510) |
| `types/database.ts` | `DrawLineFlag` enum and `DRAW_FLAG_LABELS` |

## Enriched Payload Format (from ImportPreview)
```typescript
{
  drawRequestId: string,
  projectId: string,
  lines: [{
    lineId: string,           // UUID to update
    builderCategory: string,  // Original from spreadsheet
    nahbCategory: string | null,
    nahbSubcategory: string | null,
    costCode: string | null,
    budgetAmount: number,
    remainingAmount: number,
    amountRequested: number
  }],
  invoiceCount: number
}
```

## Flag Codes to Generate
- `AMOUNT_MISMATCH` - Invoice differs from requested by >$100
- `NO_INVOICE` - No invoice matched to line
- `LOW_CONFIDENCE` - AI confidence <70%
- `DUPLICATE_INVOICE` - Invoice used in previous draw

## Environment
- N8N (Self-Hosted): `https://n8n.srv1208741.hstgr.cloud`
- Supabase project: `zekbemqgvupzmukpntog`
- OpenAI model: `gpt-4o-mini`
