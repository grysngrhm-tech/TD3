// n8n Webhook Integration
// Configure your n8n webhook URLs here

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://grysngrhm.app.n8n.cloud/webhook'

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
