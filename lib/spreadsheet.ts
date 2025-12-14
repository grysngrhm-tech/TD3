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
  mappedTo: 'category' | 'amount' | 'ignore' | null
  confidence: number
}

// Keyword lists for header-based detection
const CATEGORY_KEYWORDS = [
  'category', 'description', 'line item', 'item', 'cost code',
  'division', 'trade', 'scope', 'work item', 'nahb', 'builder category',
  'expense', 'type', 'name'
]

// Amount keywords - used for both budget and draw imports
const AMOUNT_KEYWORDS = [
  'budget', 'budgeted', 'original', 'contract', 'scheduled',
  'approved amount', 'total budget', 'cost', 'estimate',
  'allocated', 'planned', 'rough budget', 'final budget',
  'amount', 'total', 'draw', 'funded', 'requested', 'disbursement', 
  'payment', 'this request', 'current draw', 'release', 'payout'
]

/**
 * Detect column mappings using position-based + pattern analysis
 * Simplified: just finds Category and Amount columns
 * The import type (budget vs draw) determines how the amount is interpreted
 * 
 * @param headers - Column headers from spreadsheet
 * @param rows - Data rows for pattern analysis
 */
export function detectColumnMappings(
  headers: string[], 
  rows?: (string | number | null)[][]
): ColumnMapping[] {
  const mappings: ColumnMapping[] = headers.map((header, index) => ({
    columnIndex: index,
    columnName: header,
    mappedTo: null,
    confidence: 0,
  }))
  
  // Analyze each column's data pattern (sample first 30 rows for better accuracy)
  const columnAnalysis = headers.map((_, index) => {
    if (!rows || rows.length === 0) return null
    const columnData = rows.slice(0, 30).map(row => row[index])
    return analyzeColumnData(columnData)
  })
  
  // Step 1: Find category column (leftmost text column with diverse values)
  let categoryIndex = -1
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    const analysis = columnAnalysis[i]
    
    // Check header keywords first
    if (CATEGORY_KEYWORDS.some(kw => header.includes(kw))) {
      categoryIndex = i
      mappings[i].mappedTo = 'category'
      mappings[i].confidence = 0.95
      break
    }
    
    // Pattern-based: leftmost text column with diverse values
    if (analysis && analysis.isText && !analysis.isNumeric && analysis.uniqueValues > 3) {
      categoryIndex = i
      mappings[i].mappedTo = 'category'
      mappings[i].confidence = 0.75
      break
    }
  }
  
  // Step 2: Find amount column (first column with real numbers, preferably with amount keyword)
  let amountIndex = -1
  
  // First try header keywords - must have actual numbers, not just placeholders
  for (let i = 0; i < headers.length; i++) {
    if (mappings[i].mappedTo) continue // Skip already mapped (category)
    
    const header = headers[i].toLowerCase().trim()
    if (AMOUNT_KEYWORDS.some(kw => header.includes(kw))) {
      const analysis = columnAnalysis[i]
      // Require hasRealNumbers to avoid columns with just "-" placeholders
      if (analysis && analysis.hasRealNumbers) {
        amountIndex = i
        mappings[i].mappedTo = 'amount'
        mappings[i].confidence = 0.95  // High confidence when keyword + real numbers
        break
      }
    }
  }
  
  // Fallback: first column with actual numbers after category
  if (amountIndex === -1) {
    const startIdx = categoryIndex >= 0 ? categoryIndex + 1 : 0
    for (let i = startIdx; i < headers.length; i++) {
      if (mappings[i].mappedTo) continue // Skip already mapped
      
      const analysis = columnAnalysis[i]
      
      // Require hasRealNumbers - column must have actual numeric values
      if (analysis && analysis.hasRealNumbers) {
        amountIndex = i
        mappings[i].mappedTo = 'amount'
        mappings[i].confidence = 0.7
        break
      }
    }
  }
  
  return mappings
}

// Analyze column data patterns
function analyzeColumnData(values: (string | number | null)[]): {
  isNumeric: boolean
  isText: boolean
  hasCurrency: boolean
  hasDate: boolean
  uniqueValues: number
  validCount: number
  hasRealNumbers: boolean  // Has actual numbers, not just placeholders
  realNumberCount: number  // Count of actual numeric values
} {
  let numericCount = 0
  let textCount = 0
  let currencyCount = 0
  let dateCount = 0
  let validCount = 0
  let realNumberCount = 0  // Actual numbers (not just "-" placeholders)
  const uniqueSet = new Set<string>()
  
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    validCount++
    uniqueSet.add(String(value).trim().toLowerCase())
    
    if (typeof value === 'number') {
      numericCount++
      if (value !== 0) realNumberCount++  // Count non-zero numbers
    } else {
      const strValue = String(value)
      
      // Check for currency patterns: "$1,234.56", "1,234", "1234.56", etc.
      // Must have at least one digit
      if (/^[\s]*[\$]?[\s]*[\d,]+\.?\d*[\s]*$/.test(strValue) && /\d/.test(strValue)) {
        currencyCount++
        numericCount++
        // Check if it's a real number (not just "0" or empty-ish)
        const numVal = parseFloat(strValue.replace(/[$,\s]/g, ''))
        if (!isNaN(numVal) && numVal !== 0) realNumberCount++
      }
      // Check for negative currency: ($1,234) or -$1,234
      else if (/^[\s]*\([\s]*[\$]?[\s]*[\d,]+\.?\d*[\s]*\)[\s]*$/.test(strValue) ||
               /^[\s]*-[\s]*[\$]?[\s]*[\d,]+\.?\d*[\s]*$/.test(strValue)) {
        if (/\d/.test(strValue)) {  // Must have actual digits
          currencyCount++
          numericCount++
          realNumberCount++  // Negative numbers are real numbers
        }
      }
      // Check for date patterns
      else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(strValue.trim()) ||
               /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(strValue.trim())) {
        dateCount++
      }
      // Check for special values like " - " or "-" which are often zero placeholders
      // These count as "numeric" for type detection but NOT as real numbers
      else if (/^[\s]*-[\s]*$/.test(strValue)) {
        numericCount++ // Treat as zero/numeric for type detection
        // Don't increment realNumberCount - this is just a placeholder
      }
      // Otherwise it's text
      else if (strValue.trim().length > 0) {
        textCount++
      }
    }
  }
  
  const threshold = Math.max(validCount * 0.4, 1) // Lower threshold, at least 1
  
  return {
    isNumeric: numericCount >= threshold,
    isText: textCount >= threshold,
    hasCurrency: currencyCount >= threshold,
    hasDate: dateCount >= threshold,
    uniqueValues: uniqueSet.size,
    validCount,
    hasRealNumbers: realNumberCount >= 10,  // At least 10 real numbers to be considered a numeric column
    realNumberCount
  }
}

export function extractMappedData(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[]
): {
  categories: string[]
  amounts: number[]
} {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const amountCol = mappings.find(m => m.mappedTo === 'amount')
  
  const categories: string[] = []
  const amounts: number[] = []
  
  rows.forEach(row => {
    // Category
    if (categoryCol) {
      const val = row[categoryCol.columnIndex]
      categories.push(val ? String(val) : '')
    }
    
    // Amount
    if (amountCol) {
      const val = row[amountCol.columnIndex]
      amounts.push(parseAmount(val))
    }
  })
  
  return { categories, amounts }
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
  totalAmount: number
  emptyCategories: number
  zeroAmountRows: number
} {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const amountCol = mappings.find(m => m.mappedTo === 'amount')
  
  let rowsWithCategory = 0
  let totalAmount = 0
  let emptyCategories = 0
  let zeroAmountRows = 0
  
  rows.forEach(row => {
    if (categoryCol) {
      const cat = row[categoryCol.columnIndex]
      if (cat && String(cat).trim()) {
        rowsWithCategory++
      } else {
        emptyCategories++
      }
    }
    
    if (amountCol) {
      const amount = parseAmount(row[amountCol.columnIndex])
      totalAmount += amount
      if (amount === 0) {
        zeroAmountRows++
      }
    }
  })
  
  return {
    totalRows: rows.length,
    rowsWithCategory,
    totalAmount,
    emptyCategories,
    zeroAmountRows
  }
}

// Type for data export to n8n webhook
export type ColumnExport = {
  type: 'budget' | 'draw'
  projectId: string
  drawNumber?: number
  columns: {
    category: { header: string; values: string[] }
    amount: { header: string; values: (number | null)[] }
  }
  metadata: {
    fileName: string
    sheetName: string
    totalRows: number
  }
}

/**
 * Prepare column data for export to n8n webhook
 * Extracts only the user-selected columns (category + amount)
 * The 'type' field tells the n8n workflow how to interpret the data
 */
export function prepareColumnExport(
  data: SpreadsheetData,
  mappings: ColumnMapping[],
  importType: 'budget' | 'draw',
  options: { 
    projectId: string
    drawNumber?: number
    fileName: string
  }
): ColumnExport {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const amountCol = mappings.find(m => m.mappedTo === 'amount')
  
  if (!categoryCol) {
    throw new Error('No category column mapped')
  }
  if (!amountCol) {
    throw new Error('No amount column mapped')
  }
  
  // Extract values from selected columns
  const categoryValues: string[] = []
  const amountValues: (number | null)[] = []
  
  for (const row of data.rows) {
    const catValue = row[categoryCol.columnIndex]
    const amtValue = row[amountCol.columnIndex]
    
    categoryValues.push(catValue ? String(catValue).trim() : '')
    amountValues.push(parseAmount(amtValue))
  }
  
  return {
    type: importType,
    projectId: options.projectId,
    drawNumber: importType === 'draw' ? options.drawNumber : undefined,
    columns: {
      category: {
        header: categoryCol.columnName,
        values: categoryValues
      },
      amount: {
        header: amountCol.columnName,
        values: amountValues
      }
    },
    metadata: {
      fileName: options.fileName,
      sheetName: data.sheetName,
      totalRows: data.rows.length
    }
  }
}
