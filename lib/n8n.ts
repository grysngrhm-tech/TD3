/**
 * n8n Webhook Integration
 *
 * This module handles communication between TD3 and n8n workflows.
 *
 * ## Environment Variables
 *
 * TD3 side (.env.local):
 * - NEXT_PUBLIC_N8N_WEBHOOK_URL: Base URL for n8n webhooks (e.g., https://n8n.example.com/webhook)
 * - N8N_CALLBACK_SECRET: Secret for authenticating callbacks FROM n8n TO TD3
 *
 * n8n side (n8n environment):
 * - TD3_WEBHOOK_SECRET: Must match TD3's N8N_CALLBACK_SECRET
 * - TD3_API_URL: Base URL for TD3 callbacks (e.g., https://td3.vercel.app)
 *
 * ## Workflow: td3-invoice-process
 *
 * 1. TD3 uploads invoice and calls n8n webhook with file URL
 * 2. n8n downloads file, extracts data with GPT-4o-mini
 * 3. n8n calls back to TD3 /api/invoices/process-callback with extracted data
 * 4. TD3 runs deterministic matching and applies/flags the result
 */

// Base URL should be the n8n "webhook" base, e.g. https://<host>/webhook
// Prefer env var, but default to the repo's documented self-hosted instance.
const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.srv1208741.hstgr.cloud/webhook'

export type BudgetImportPayload = {
  projectCode: string
  builderName: string
  borrowerName: string
  address: string
  subdivisionName: string
  subdivisionAbbrev: string
  lotNumber: string
  loanAmount: number
  interestRate: number
  loanStartDate: string
  lineItems: Array<{
    category: string
    budgetAmount: number
  }>
}

export type DrawImportPayload = {
  projectId: string
  drawNumber: number
  fundedDate: string
  lineItems: Array<{
    category: string
    drawAmount: number
  }>
}

export type DrawProcessPayload = {
  drawRequestId: string
  projectId: string
  drawNumber: number
  categories: string[]
  drawAmounts: number[]
  budgets: Array<{
    id: string
    category: string
    nahbCategory: string | null
    nahbSubcategory: string | null
    costCode: string | null
    remaining: number | null
  }>
  invoiceCount: number
}

/**
 * Payload sent to n8n td3-invoice-process webhook.
 *
 * Required by n8n:
 * - invoiceId: Used to track the invoice through processing
 * - fileUrl: Signed URL for n8n to download the invoice file
 * - fileName: Original filename for reference
 * - callbackUrl: Where n8n sends extraction results
 *
 * Optional context (currently unused by n8n, kept for future enhancements):
 * - drawRequestId, projectId, projectCode: Context for potential n8n-side matching
 * - budgetCategories, drawLines: Could enable n8n-side category suggestions
 */
export type InvoiceProcessPayload = {
  // Required fields - used by n8n workflow
  invoiceId: string
  fileUrl: string
  fileName: string
  callbackUrl: string

  // Context fields - passed through for callback, not used by n8n extraction
  drawRequestId: string
  projectId: string
  projectCode: string | null

  // Optional enrichment - currently unused by n8n, kept for potential future use
  budgetCategories?: Array<{
    id: string
    category: string
    nahbCategory: string | null
    budgetAmount: number
    drawnToDate: number
    remaining: number
  }>
  drawLines?: Array<{
    id: string
    budgetId: string | null
    budgetCategory: string | null
    amountRequested: number
  }>
}

export async function triggerBudgetImport(payload: BudgetImportPayload): Promise<{ success: boolean; message: string; projectId?: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/td3-budget-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Budget import webhook error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function triggerDrawImport(payload: DrawImportPayload): Promise<{ success: boolean; message: string; drawId?: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/td3-draw-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Draw import webhook error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function triggerInvoiceProcess(payload: InvoiceProcessPayload): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/td3-invoice-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      // Don't fail the upload if n8n is unavailable - just log it
      console.warn(`Invoice processing webhook returned ${response.status}`)
      return {
        success: false,
        message: `Webhook returned ${response.status}`,
      }
    }

    return { success: true, message: 'Processing started' }
  } catch (error) {
    // Don't fail the upload if n8n is unavailable
    console.warn('Invoice processing webhook error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Payload for invoice disambiguation when multiple candidates score similarly.
 * Sent to n8n td3-invoice-disambiguate webhook.
 */
export type InvoiceDisambiguatePayload = {
  invoiceId: string
  callbackUrl: string
  extractedData: {
    vendorName: string
    amount: number
    context?: string | null
    keywords?: string[]
    trade?: string | null
    workType?: string | null
    vendorType?: string | null
  }
  candidates: Array<{
    drawLineId: string
    budgetId: string | null
    budgetCategory: string
    nahbCategory: string | null
    amountRequested: number
    scores: {
      amount: number
      trade: number
      keywords: number
      training: number
      composite: number
    }
    factors: {
      amountVariance: number
      amountVarianceAbsolute: number
      tradeMatch: boolean
      keywordMatches: string[]
      vendorPreviousMatch: boolean
      trainingReason: string | null
    }
  }>
}

/**
 * Trigger AI disambiguation when multiple candidates are viable.
 * Called when deterministic matching returns MULTIPLE_CANDIDATES.
 */
export async function triggerInvoiceDisambiguation(
  payload: InvoiceDisambiguatePayload
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/td3-invoice-disambiguate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.warn(`Invoice disambiguation webhook returned ${response.status}`)
      return {
        success: false,
        message: `Webhook returned ${response.status}`,
      }
    }

    return { success: true, message: 'Disambiguation started' }
  } catch (error) {
    console.warn('Invoice disambiguation webhook error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Utility to extract project metadata from first row of budget spreadsheet
export function extractProjectMetadata(headers: string[], firstRow: (string | number | null)[]): Partial<BudgetImportPayload> {
  const metadata: Partial<BudgetImportPayload> = {}
  
  const headerMap: Record<string, keyof BudgetImportPayload> = {
    'project code': 'projectCode',
    'builder name': 'builderName',
    'borrower name': 'borrowerName',
    'address': 'address',
    'loan amount': 'loanAmount',
    'total budget': 'loanAmount',
    'interest rate': 'interestRate',
    'interest rate annual': 'interestRate',
    'loan start date': 'loanStartDate',
  }
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim()
    const mappedKey = headerMap[normalizedHeader]
    
    if (mappedKey && firstRow[index] !== null && firstRow[index] !== undefined) {
      const value = firstRow[index]
      
      if (mappedKey === 'loanAmount' || mappedKey === 'interestRate') {
        metadata[mappedKey] = typeof value === 'number' ? value : parseFloat(String(value).replace(/[$,]/g, ''))
      } else if (mappedKey === 'loanStartDate') {
        metadata[mappedKey] = String(value)
      } else {
        (metadata as any)[mappedKey] = String(value)
      }
    }
  })
  
  // Extract subdivision info from project code (e.g., "DW - 244" -> subdivision: DW, lot: 244)
  if (metadata.projectCode) {
    const match = metadata.projectCode.match(/^([A-Z]+)\s*-\s*(\d+)$/i)
    if (match) {
      metadata.subdivisionAbbrev = match[1].toUpperCase()
      metadata.lotNumber = match[2]
    }
  }
  
  return metadata
}
