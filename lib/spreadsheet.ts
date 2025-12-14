import * as XLSX from 'xlsx'

export type SpreadsheetData = {
  headers: string[]
  rows: (string | number | null)[][]
  sheetName: string
}

export async function parseSpreadsheet(file: File): Promise<SpreadsheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { 
          header: 1,
          defval: null 
        })
        
        if (jsonData.length === 0) {
          reject(new Error('Empty spreadsheet'))
          return
        }
        
        // First row is headers
        const headers = (jsonData[0] as any[]).map(h => String(h || ''))
        const rows = jsonData.slice(1) as (string | number | null)[][]
        
        resolve({ headers, rows, sheetName })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

export type ColumnMapping = {
  columnIndex: number
  columnName: string
  mappedTo: 'category' | 'budget_amount' | 'draw_amount' | 'ignore' | null
  drawNumber?: number
  confidence: number
}

export function detectColumnMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase().trim()
    let mappedTo: ColumnMapping['mappedTo'] = null
    let confidence = 0
    let drawNumber: number | undefined
    
    // Detect category columns
    if (
      lowerHeader.includes('category') ||
      lowerHeader.includes('builder category') ||
      lowerHeader.includes('description') ||
      lowerHeader.includes('line item') ||
      lowerHeader === 'item'
    ) {
      mappedTo = 'category'
      confidence = lowerHeader.includes('category') ? 0.95 : 0.7
    }
    // Detect budget amount columns
    else if (
      lowerHeader.includes('budget') ||
      lowerHeader.includes('original amount') ||
      lowerHeader.includes('budgeted') ||
      lowerHeader === 'amount'
    ) {
      mappedTo = 'budget_amount'
      confidence = lowerHeader.includes('budget') ? 0.9 : 0.7
    }
    // Detect draw amount columns
    else if (
      lowerHeader.includes('draw') ||
      lowerHeader.includes('funded') ||
      lowerHeader.includes('requested')
    ) {
      mappedTo = 'draw_amount'
      confidence = 0.85
      
      // Try to extract draw number
      const drawMatch = lowerHeader.match(/draw\s*(\d+)/i)
      if (drawMatch) {
        drawNumber = parseInt(drawMatch[1])
      }
    }
    
    mappings.push({
      columnIndex: index,
      columnName: header,
      mappedTo,
      drawNumber,
      confidence,
    })
  })
  
  return mappings
}

export function extractMappedData(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[]
): {
  categories: string[]
  budgetAmounts: number[]
  drawAmounts: { drawNumber: number; amounts: number[] }[]
} {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const budgetCol = mappings.find(m => m.mappedTo === 'budget_amount')
  const drawCols = mappings.filter(m => m.mappedTo === 'draw_amount')
  
  const categories: string[] = []
  const budgetAmounts: number[] = []
  const drawAmounts: { drawNumber: number; amounts: number[] }[] = []
  
  // Initialize draw amounts arrays
  drawCols.forEach((col, idx) => {
    drawAmounts.push({
      drawNumber: col.drawNumber || idx + 1,
      amounts: [],
    })
  })
  
  rows.forEach(row => {
    // Category
    if (categoryCol) {
      const val = row[categoryCol.columnIndex]
      categories.push(val ? String(val) : '')
    }
    
    // Budget amount
    if (budgetCol) {
      const val = row[budgetCol.columnIndex]
      budgetAmounts.push(parseAmount(val))
    }
    
    // Draw amounts
    drawCols.forEach((col, idx) => {
      const val = row[col.columnIndex]
      drawAmounts[idx].amounts.push(parseAmount(val))
    })
  })
  
  return { categories, budgetAmounts, drawAmounts }
}

function parseAmount(value: string | number | null): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  
  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}
