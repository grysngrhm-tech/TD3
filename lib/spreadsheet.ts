import * as XLSX from 'xlsx'

export type SpreadsheetData = {
  headers: string[]
  rows: (string | number | null)[][]
  sheetName: string
}

export type SheetInfo = {
  name: string
  rowCount: number
  columnCount: number
}

export type WorkbookInfo = {
  sheets: SheetInfo[]
  workbook: XLSX.WorkBook
}

// Parse file and get all sheet information
export async function getWorkbookInfo(file: File): Promise<WorkbookInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        const sheets: SheetInfo[] = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name]
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
          return {
            name,
            rowCount: range.e.r - range.s.r + 1,
            columnCount: range.e.c - range.s.c + 1
          }
        })
        
        resolve({ sheets, workbook })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

// Parse a specific sheet from a workbook
export function parseSheet(workbook: XLSX.WorkBook, sheetName: string): SpreadsheetData {
  const sheet = workbook.Sheets[sheetName]
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }
  
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { 
    header: 1,
    defval: null 
  })
  
  if (jsonData.length === 0) {
    throw new Error('Empty spreadsheet')
  }
  
  // First row is headers
  const headers = (jsonData[0] as any[]).map(h => String(h || ''))
  const rows = jsonData.slice(1) as (string | number | null)[][]
  
  return { headers, rows, sheetName }
}

// Legacy function for backwards compatibility
export async function parseSpreadsheet(file: File): Promise<SpreadsheetData> {
  const { sheets, workbook } = await getWorkbookInfo(file)
  
  // Find the sheet with most data (likely the main budget sheet)
  const mainSheet = sheets.reduce((best, current) => 
    current.rowCount > best.rowCount ? current : best
  )
  
  return parseSheet(workbook, mainSheet.name)
}

export type ColumnMapping = {
  columnIndex: number
  columnName: string
  mappedTo: 'category' | 'budget_amount' | 'draw_amount' | 'ignore' | null
  drawNumber?: number
  confidence: number
}

// Expanded keyword lists for better detection
const CATEGORY_KEYWORDS = [
  'category', 'description', 'line item', 'item', 'cost code',
  'division', 'trade', 'scope', 'work item', 'nahb', 'builder category',
  'expense', 'type', 'name'
]

const BUDGET_KEYWORDS = [
  'budget', 'budgeted', 'original', 'contract', 'scheduled',
  'approved amount', 'total budget', 'amount', 'cost', 'estimate',
  'allocated', 'planned'
]

const DRAW_KEYWORDS = [
  'draw', 'funded', 'requested', 'disbursement', 'payment',
  'this request', 'current draw', 'release', 'payout', 'advance'
]

export function detectColumnMappings(headers: string[], rows?: (string | number | null)[][]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase().trim()
    let mappedTo: ColumnMapping['mappedTo'] = null
    let confidence = 0
    let drawNumber: number | undefined
    
    // Check for category keywords
    for (const keyword of CATEGORY_KEYWORDS) {
      if (lowerHeader.includes(keyword)) {
        mappedTo = 'category'
        confidence = keyword === 'category' || keyword === 'builder category' ? 0.95 : 0.75
        break
      }
    }
    
    // Check for budget keywords (only if not already mapped)
    if (!mappedTo) {
      for (const keyword of BUDGET_KEYWORDS) {
        if (lowerHeader.includes(keyword)) {
          mappedTo = 'budget_amount'
          confidence = keyword === 'budget' || keyword === 'budgeted' ? 0.9 : 0.7
          break
        }
      }
    }
    
    // Check for draw keywords (only if not already mapped)
    if (!mappedTo) {
      for (const keyword of DRAW_KEYWORDS) {
        if (lowerHeader.includes(keyword)) {
          mappedTo = 'draw_amount'
          confidence = 0.85
          
          // Try to extract draw number
          const drawMatch = lowerHeader.match(/draw\s*#?\s*(\d+)/i) || 
                           lowerHeader.match(/(\d+)\s*(st|nd|rd|th)?\s*draw/i)
          if (drawMatch) {
            drawNumber = parseInt(drawMatch[1])
          }
          break
        }
      }
    }
    
    // Pattern-based detection using actual data
    if (!mappedTo && rows && rows.length > 0) {
      const columnData = rows.slice(0, 10).map(row => row[index])
      const dataPattern = analyzeColumnData(columnData)
      
      if (dataPattern.isNumeric && dataPattern.hasCurrency) {
        // Numeric column with currency - likely an amount
        if (!mappings.some(m => m.mappedTo === 'budget_amount')) {
          mappedTo = 'budget_amount'
          confidence = 0.6
        }
      } else if (dataPattern.isText && !dataPattern.isNumeric) {
        // Text-only column - could be category
        if (!mappings.some(m => m.mappedTo === 'category')) {
          mappedTo = 'category'
          confidence = 0.5
        }
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

// Analyze column data patterns
function analyzeColumnData(values: (string | number | null)[]): {
  isNumeric: boolean
  isText: boolean
  hasCurrency: boolean
  hasDate: boolean
} {
  let numericCount = 0
  let textCount = 0
  let currencyCount = 0
  let dateCount = 0
  let validCount = 0
  
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    validCount++
    
    if (typeof value === 'number') {
      numericCount++
    } else {
      const strValue = String(value)
      
      // Check for currency
      if (/^\$?[\d,]+\.?\d*$/.test(strValue.trim())) {
        currencyCount++
        numericCount++
      }
      // Check for date patterns
      else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(strValue.trim()) ||
               /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(strValue.trim())) {
        dateCount++
      }
      // Otherwise it's text
      else if (strValue.trim().length > 0) {
        textCount++
      }
    }
  }
  
  const threshold = validCount * 0.5
  
  return {
    isNumeric: numericCount >= threshold,
    isText: textCount >= threshold,
    hasCurrency: currencyCount >= threshold,
    hasDate: dateCount >= threshold
  }
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
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = String(value).replace(/[$,\s]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// Calculate import summary statistics
export function calculateImportStats(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[]
): {
  totalRows: number
  rowsWithCategory: number
  totalBudget: number
  drawColumns: number
  emptyCategories: number
  zeroBudgetRows: number
} {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const budgetCol = mappings.find(m => m.mappedTo === 'budget_amount')
  const drawCols = mappings.filter(m => m.mappedTo === 'draw_amount')
  
  let rowsWithCategory = 0
  let totalBudget = 0
  let emptyCategories = 0
  let zeroBudgetRows = 0
  
  rows.forEach(row => {
    if (categoryCol) {
      const cat = row[categoryCol.columnIndex]
      if (cat && String(cat).trim()) {
        rowsWithCategory++
      } else {
        emptyCategories++
      }
    }
    
    if (budgetCol) {
      const amount = parseAmount(row[budgetCol.columnIndex])
      totalBudget += amount
      if (amount === 0) {
        zeroBudgetRows++
      }
    }
  })
  
  return {
    totalRows: rows.length,
    rowsWithCategory,
    totalBudget,
    drawColumns: drawCols.length,
    emptyCategories,
    zeroBudgetRows
  }
}
