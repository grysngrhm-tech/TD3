import * as XLSX from 'xlsx'

// Cell styling information extracted from Excel
export type CellStyle = {
  bold?: boolean
  borderTop?: boolean
  borderBottom?: boolean
  borderLeft?: boolean
  borderRight?: boolean
}

export type SpreadsheetData = {
  headers: string[]
  rows: (string | number | null)[][]
  styles: (CellStyle | null)[][]  // Parallel array of cell styles (includes header row at index 0)
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
        // Enable cellStyles to extract formatting (bold, borders)
        const workbook = XLSX.read(data, { type: 'binary', cellStyles: true })
        
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
  
  // Extract cell styles (bold, borders)
  const styles = extractCellStyles(sheet, jsonData.length, headers.length)
  
  return { headers, rows, styles, sheetName }
}

/**
 * Extract cell styles from an Excel sheet
 * Returns a 2D array of styles matching the data rows (including header at index 0)
 */
function extractCellStyles(
  sheet: XLSX.WorkSheet, 
  rowCount: number, 
  colCount: number
): (CellStyle | null)[][] {
  const styles: (CellStyle | null)[][] = []
  
  for (let r = 0; r < rowCount; r++) {
    const rowStyles: (CellStyle | null)[] = []
    
    for (let c = 0; c < colCount; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[cellAddress]
      
      if (cell && cell.s) {
        const cellStyle: CellStyle = {}
        
        // Extract bold from font
        if (cell.s.font?.bold) {
          cellStyle.bold = true
        }
        
        // Extract borders
        if (cell.s.border) {
          if (cell.s.border.top?.style) cellStyle.borderTop = true
          if (cell.s.border.bottom?.style) cellStyle.borderBottom = true
          if (cell.s.border.left?.style) cellStyle.borderLeft = true
          if (cell.s.border.right?.style) cellStyle.borderRight = true
        }
        
        // Only add style if it has any properties
        if (Object.keys(cellStyle).length > 0) {
          rowStyles.push(cellStyle)
        } else {
          rowStyles.push(null)
        }
      } else {
        rowStyles.push(null)
      }
    }
    
    styles.push(rowStyles)
  }
  
  return styles
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

// Row range for selecting which rows to import
export type RowRange = {
  startRow: number  // 0-indexed, first data row
  endRow: number    // 0-indexed, last data row (inclusive)
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

// Keywords that indicate a row is a total/summary (should stop BEFORE these)
const TOTAL_KEYWORDS = [
  'total', 'subtotal', 'grand total', 'sum', 'totals'
]

// Keywords that indicate closing costs / non-budget items (should stop BEFORE these)
const CLOSING_COST_KEYWORDS = [
  'interest', 'closing cost', 'closing costs', 'loan fee', 'points',
  'title', 'escrow', 'recording', 'appraisal fee', 'inspection fee',
  'origination', 'discount points', 'prepaid'
]

// Keywords that indicate a header row (should skip these for start row)
const HEADER_KEYWORDS = [
  'item', 'description', 'category', 'budget', 'amount',
  'cost', 'rough', 'final', 'adjust', 'column', 'header',
  'line item', 'expense', 'name'
]

/**
 * Detect row boundaries for import using smarter logic:
 * - Start: First row with category text that's NOT a header keyword
 * - End: Scan backwards from last row with category, stop at totals/closing costs
 * - Don't require amounts - rows with category but no amount are valid placeholders
 */
export function detectRowBoundaries(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[]
): RowRange {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  
  if (!categoryCol) {
    // Fallback: return all rows
    return { startRow: 0, endRow: Math.max(0, rows.length - 1) }
  }
  
  const catIndex = categoryCol.columnIndex
  
  // Helper to check if a category string looks like a header
  const isHeaderRow = (catStr: string): boolean => {
    const lower = catStr.toLowerCase()
    // Check if it matches header keywords exactly or closely
    return HEADER_KEYWORDS.some(kw => {
      // Exact match or the category is just the keyword
      if (lower === kw) return true
      // Category starts with keyword and is short (likely a header)
      if (lower.startsWith(kw) && lower.length < kw.length + 5) return true
      return false
    })
  }
  
  // Helper to check if a category string is a total/closing cost
  const isTotalOrClosingCost = (catStr: string): boolean => {
    const lower = catStr.toLowerCase()
    return TOTAL_KEYWORDS.some(kw => lower.includes(kw)) ||
           CLOSING_COST_KEYWORDS.some(kw => lower.includes(kw))
  }
  
  // STEP 1: Find START row - first row with category text that's NOT a header
  let startRow = 0
  for (let i = 0; i < rows.length; i++) {
    const category = rows[i][catIndex]
    const catStr = category ? String(category).trim() : ''
    
    if (catStr && !isHeaderRow(catStr) && !isTotalOrClosingCost(catStr)) {
      startRow = i
      break
    }
  }
  
  // STEP 2: Find END row by scanning BACKWARDS
  // First, find the last row that has ANY category text
  let lastRowWithCategory = -1
  for (let i = rows.length - 1; i >= startRow; i--) {
    const category = rows[i][catIndex]
    const catStr = category ? String(category).trim() : ''
    
    if (catStr) {
      lastRowWithCategory = i
      break
    }
  }
  
  if (lastRowWithCategory < 0) {
    // No categories found at all
    return { startRow: 0, endRow: Math.max(0, rows.length - 1) }
  }
  
  // STEP 3: From that last row, work backwards to find first non-total/non-closing-cost row
  let endRow = lastRowWithCategory
  for (let i = lastRowWithCategory; i >= startRow; i--) {
    const category = rows[i][catIndex]
    const catStr = category ? String(category).trim() : ''
    
    if (catStr && !isTotalOrClosingCost(catStr)) {
      endRow = i
      break
    }
    // If this row is a total/closing cost, keep moving backwards
    if (catStr && isTotalOrClosingCost(catStr)) {
      endRow = i - 1
    }
  }
  
  // Ensure valid range
  endRow = Math.max(startRow, Math.min(endRow, rows.length - 1))
  
  return { startRow, endRow }
}

// Helper to parse amount values
function parseAmountValue(value: string | number | null): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[$,\s()]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
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
// Optionally filters to only rows within the specified row range
export function calculateImportStats(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[],
  rowRange?: RowRange
): {
  totalRows: number
  rowsWithCategory: number
  totalAmount: number
  emptyCategories: number
  zeroAmountRows: number
} {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const amountCol = mappings.find(m => m.mappedTo === 'amount')
  
  // Determine which rows to process
  const startRow = rowRange?.startRow ?? 0
  const endRow = rowRange?.endRow ?? rows.length - 1
  
  let rowsWithCategory = 0
  let totalAmount = 0
  let emptyCategories = 0
  let zeroAmountRows = 0
  let processedRows = 0
  
  for (let i = startRow; i <= endRow && i < rows.length; i++) {
    const row = rows[i]
    processedRows++
    
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
  }
  
  return {
    totalRows: processedRows,
    rowsWithCategory,
    totalAmount,
    emptyCategories,
    zeroAmountRows
  }
}

// Invoice type for draw imports
export type Invoice = {
  fileName: string
  fileData: string  // base64 encoded PDF
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
  invoices?: Invoice[]  // Optional for draw imports
  metadata: {
    fileName: string
    sheetName: string
    totalRows: number
  }
}

/**
 * Convert a File to base64 string
 * Used for encoding PDF invoices for transmission to n8n
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Prepare column data for export to n8n webhook
 * Extracts only the user-selected columns (category + amount)
 * Optionally filters to only rows within the specified row range
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
    invoices?: Invoice[]  // Optional invoices for draw imports
    rowRange?: RowRange   // Optional row range filter
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
  
  // Determine which rows to process
  const startRow = options.rowRange?.startRow ?? 0
  const endRow = options.rowRange?.endRow ?? data.rows.length - 1
  
  // Extract values from selected columns within row range
  const categoryValues: string[] = []
  const amountValues: (number | null)[] = []
  
  for (let i = startRow; i <= endRow && i < data.rows.length; i++) {
    const row = data.rows[i]
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
    invoices: options.invoices,  // Include invoices in export
    metadata: {
      fileName: options.fileName,
      sheetName: data.sheetName,
      totalRows: categoryValues.length  // Now reflects filtered count
    }
  }
}
