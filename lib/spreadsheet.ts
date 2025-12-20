import * as XLSX from 'xlsx-js-style'

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

// Row classification for smart detection
export type RowClassification = 
  | 'header'      // Detected as header row (skip)
  | 'data'        // Valid budget data row
  | 'total'       // Detected as total/summary row
  | 'closing'     // Closing cost item
  | 'empty'       // Empty row
  | 'unknown'     // Could not classify

// Analysis result for a single row
export type RowAnalysis = {
  index: number
  classification: RowClassification
  confidence: number           // 0-100 score
  signals: {
    hasHeaderKeyword: boolean  // Contains header keywords
    hasTotalKeyword: boolean   // Contains total keywords
    hasClosingKeyword: boolean // Contains closing cost keywords
    closingKeywordScore: number // Weighted score for closing keywords
    isBold: boolean            // Cell is bold formatted
    amountMatchesSum: boolean  // Amount ≈ running total
    precedesGap: boolean       // Followed by empty rows
    followsGap: boolean        // Preceded by empty rows
    hasAmount: boolean         // Has non-zero amount
    hasCategory: boolean       // Has category text
    textCellCount: number      // Number of non-empty text (non-numeric) cells
    isMultiColumnTextRow: boolean  // Has 3+ text cells (strong header indicator)
  }
  manualOverride?: 'include' | 'exclude'  // User override
}

// Extended row range with full analysis
export type RowRangeWithAnalysis = {
  startRow: number
  endRow: number
  analysis: RowAnalysis[]      // Classification for each row
  confidence: number           // Overall confidence in detection (0-100)
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
// Closing cost keywords with weighted scores
// Higher weight = stronger indicator of closing costs section
const CLOSING_COST_KEYWORDS: { keyword: string; weight: number }[] = [
  // Strong indicators (40 points) - these almost always indicate closing costs
  { keyword: 'interest', weight: 40 },
  { keyword: 'realtor', weight: 40 },
  { keyword: 'closing cost', weight: 40 },
  { keyword: 'closing costs', weight: 40 },
  
  // Medium indicators (25 points) - usually closing costs but could be expenses
  { keyword: 'finance', weight: 25 },
  { keyword: 'loan fee', weight: 25 },
  { keyword: 'points', weight: 25 },
  { keyword: 'origination', weight: 25 },
  { keyword: 'discount points', weight: 25 },
  
  // Weak indicators (15 points) - often legitimate budget items
  { keyword: 'title', weight: 15 },
  { keyword: 'escrow', weight: 15 },
  { keyword: 'recording', weight: 15 },
  { keyword: 'appraisal fee', weight: 15 },
  { keyword: 'inspection fee', weight: 15 },
  { keyword: 'prepaid', weight: 15 }
]

// Keywords that indicate a header row (should skip these for start row)
const HEADER_KEYWORDS = [
  'item', 'description', 'category', 'budget', 'amount',
  'cost', 'rough', 'final', 'adjust', 'column', 'header',
  'line item', 'expense', 'name'
]

/**
 * Detect row boundaries for import using multi-signal analysis
 * Wrapper for backwards compatibility - returns simple RowRange
 */
export function detectRowBoundaries(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[],
  styles?: (CellStyle | null)[][]
): RowRange {
  const result = detectRowBoundariesWithAnalysis(rows, mappings, styles)
  return { startRow: result.startRow, endRow: result.endRow }
}

// Helper to parse amount values
function parseAmountValue(value: string | number | null): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[$,\s()]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Analyze all rows using multi-signal scoring system
 * Returns detailed classification for each row
 */
export function analyzeRows(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[],
  styles?: (CellStyle | null)[][]
): RowAnalysis[] {
  const categoryCol = mappings.find(m => m.mappedTo === 'category')
  const amountCol = mappings.find(m => m.mappedTo === 'amount')
  
  if (!categoryCol) {
    // Return all as unknown if no category column
    return rows.map((_, index) => ({
      index,
      classification: 'unknown' as RowClassification,
      confidence: 0,
      signals: {
        hasHeaderKeyword: false,
        hasTotalKeyword: false,
        hasClosingKeyword: false,
        closingKeywordScore: 0,
        isBold: false,
        amountMatchesSum: false,
        precedesGap: false,
        followsGap: false,
        hasAmount: false,
        hasCategory: false,
        textCellCount: 0,
        isMultiColumnTextRow: false,
      }
    }))
  }
  
  const catIndex = categoryCol.columnIndex
  const amtIndex = amountCol?.columnIndex ?? -1
  
  // First pass: gather basic signals for each row
  const analyses: RowAnalysis[] = rows.map((row, index) => {
    const category = row[catIndex]
    const catStr = category ? String(category).trim() : ''
    const catLower = catStr.toLowerCase()
    
    const amount = amtIndex >= 0 ? parseAmountValue(row[amtIndex]) : 0
    
    // Check for cell style (styles array includes header at index 0, so data row 0 = styles[1])
    const cellStyle = styles?.[index + 1]?.[catIndex]
    const isBold = cellStyle?.bold ?? false
    
    // Check keywords
    const hasHeaderKeyword = HEADER_KEYWORDS.some(kw => {
      if (catLower === kw) return true
      if (catLower.startsWith(kw) && catLower.length < kw.length + 5) return true
      return false
    })
    
    const hasTotalKeyword = TOTAL_KEYWORDS.some(kw => catLower.includes(kw))
    
    // Calculate closing keyword score (weighted)
    const closingKeywordScore = CLOSING_COST_KEYWORDS
      .filter(({ keyword }) => catLower.includes(keyword))
      .reduce((sum, { weight }) => sum + weight, 0)
    const hasClosingKeyword = closingKeywordScore > 0
    
    // Count non-empty text cells (non-numeric) - header rows typically have many text labels
    const textCellCount = row.filter(cell => {
      if (cell === null || cell === undefined) return false
      const str = String(cell).trim()
      if (str.length === 0) return false
      // Check if it's NOT a number (pure text)
      const cleanedForNumeric = str.replace(/[$,%]/g, '').trim()
      return isNaN(parseFloat(cleanedForNumeric))
    }).length
    const isMultiColumnTextRow = textCellCount >= 3
    
    return {
      index,
      classification: 'unknown' as RowClassification,
      confidence: 0,
      signals: {
        hasHeaderKeyword,
        hasTotalKeyword,
        hasClosingKeyword,
        closingKeywordScore, // Weighted score for closing cost keywords
        isBold,
        amountMatchesSum: false, // Will be calculated in second pass
        precedesGap: false,      // Will be calculated
        followsGap: false,       // Will be calculated
        hasAmount: amount !== 0,
        hasCategory: catStr.length > 0,
        textCellCount,
        isMultiColumnTextRow,
      }
    }
  })
  
  // Second pass: calculate gap signals and running sum matching
  let runningSum = 0
  for (let i = 0; i < analyses.length; i++) {
    const row = rows[i]
    const amount = amtIndex >= 0 ? parseAmountValue(row[amtIndex]) : 0
    
    // Check if preceded by empty rows (gap detection)
    if (i > 0) {
      let gapCount = 0
      for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
        if (!analyses[j].signals.hasCategory) gapCount++
        else break
      }
      analyses[i].signals.followsGap = gapCount >= 2
    }
    
    // Check if followed by empty rows
    if (i < analyses.length - 1) {
      let gapCount = 0
      for (let j = i + 1; j < analyses.length && j <= i + 3; j++) {
        if (!analyses[j].signals.hasCategory) gapCount++
        else break
      }
      analyses[i].signals.precedesGap = gapCount >= 2
    }
    
    // Check if amount matches running sum (total detection)
    if (runningSum > 0 && amount > 0) {
      const diff = Math.abs(amount - runningSum) / runningSum
      if (diff < 0.1) { // Within 10%
        analyses[i].signals.amountMatchesSum = true
      }
    }
    
    // Accumulate running sum for data rows (will refine after classification)
    if (analyses[i].signals.hasCategory && amount > 0) {
      runningSum += amount
    }
  }
  
  // Third pass: calculate scores for each row (store raw scores, classify later)
  const HEADER_THRESHOLD = 50
  const TOTAL_THRESHOLD = 40
  const CLOSING_THRESHOLD = 35
  
  // Score storage for single-best selection
  const rowScores: { headerScore: number; totalScore: number; closingScore: number }[] = []
  
  for (let i = 0; i < analyses.length; i++) {
    const a = analyses[i]
    const s = a.signals
    
    // Empty row check
    if (!s.hasCategory) {
      a.classification = 'empty'
      a.confidence = 100
      rowScores.push({ headerScore: 0, totalScore: 0, closingScore: 0 })
      continue
    }
    
    // Calculate header score
    let headerScore = 0
    if (s.hasHeaderKeyword) headerScore += 50
    if (s.isBold && !s.hasAmount) headerScore += 20
    if (!s.hasAmount && s.hasCategory) headerScore += 10
    if (s.followsGap && i < 5) headerScore += 15
    if (i < 3) headerScore += 25  // First 3 rows likely headers
    // Strong signal: rows with 3+ text columns (no numbers) are likely headers
    // This catches header rows like "CAT # | BUDGET | JULY DRAW | AUGUST DRAW..."
    if (s.isMultiColumnTextRow && !s.hasAmount) headerScore += 45
    // Apply penalty for rows deep in the file (unlikely to be headers)
    if (i > 5) headerScore -= 40
    
    // Calculate total score
    let totalScore = 0
    if (s.hasTotalKeyword) totalScore += 40
    if (s.amountMatchesSum) totalScore += 50
    if (s.isBold && s.hasAmount) totalScore += 20
    if (s.precedesGap) totalScore += 10
    
    // Calculate closing cost score (using weighted keyword scores)
    let closingScore = s.closingKeywordScore // Use the weighted score directly
    if (s.isBold) closingScore += 10
    
    rowScores.push({ headerScore, totalScore, closingScore })
    
    // Initially mark all non-empty rows as 'data' (will refine with single-best logic)
    a.classification = 'data'
    a.confidence = 50
  }
  
  // SINGLE-BEST SELECTION: Find the ONE best header and ONE best total/closing
  
  // Find best header (highest score above threshold)
  let bestHeaderIdx = -1
  let bestHeaderScore = HEADER_THRESHOLD - 1  // Must exceed threshold
  for (let i = 0; i < rowScores.length; i++) {
    if (rowScores[i].headerScore > bestHeaderScore) {
      bestHeaderScore = rowScores[i].headerScore
      bestHeaderIdx = i
    }
  }
  
  // Mark the single best header
  if (bestHeaderIdx >= 0) {
    analyses[bestHeaderIdx].classification = 'header'
    analyses[bestHeaderIdx].confidence = Math.min(100, bestHeaderScore)
  }
  
  // Find best total/closing AFTER the header (or from start if no header)
  const searchStartIdx = bestHeaderIdx >= 0 ? bestHeaderIdx + 1 : 0
  
  let bestTotalIdx = -1
  let bestTotalRanking = TOTAL_THRESHOLD - 1
  let bestClosingIdx = -1
  let bestClosingRanking = CLOSING_THRESHOLD - 1
  
  for (let i = searchStartIdx; i < rowScores.length; i++) {
    const scores = rowScores[i]
    
    // Check total score (apply proximity penalty for ranking, not qualification)
    if (scores.totalScore >= TOTAL_THRESHOLD) {
      let ranking = scores.totalScore
      // Proximity penalty: if too close to header, reduce ranking
      if (bestHeaderIdx >= 0 && i - bestHeaderIdx < 5) {
        ranking -= 25
      }
      if (ranking > bestTotalRanking) {
        bestTotalRanking = ranking
        bestTotalIdx = i
      }
    }
    
    // Check closing score (apply proximity penalty for ranking)
    if (scores.closingScore >= CLOSING_THRESHOLD) {
      let ranking = scores.closingScore
      if (bestHeaderIdx >= 0 && i - bestHeaderIdx < 5) {
        ranking -= 30
      }
      if (ranking > bestClosingRanking) {
        bestClosingRanking = ranking
        bestClosingIdx = i
      }
    }
  }
  
  // Mark the single best total
  if (bestTotalIdx >= 0) {
    analyses[bestTotalIdx].classification = 'total'
    analyses[bestTotalIdx].confidence = Math.min(100, rowScores[bestTotalIdx].totalScore)
  }
  
  // Mark the single best closing
  if (bestClosingIdx >= 0) {
    analyses[bestClosingIdx].classification = 'closing'
    analyses[bestClosingIdx].confidence = Math.min(100, rowScores[bestClosingIdx].closingScore)
  }
  
  return analyses
}

/**
 * Detect row boundaries with full analysis
 * Returns start/end plus detailed analysis of each row
 */
export function detectRowBoundariesWithAnalysis(
  rows: (string | number | null)[][],
  mappings: ColumnMapping[],
  styles?: (CellStyle | null)[][]
): RowRangeWithAnalysis {
  const analysis = analyzeRows(rows, mappings, styles)
  
  if (analysis.length === 0) {
    return { startRow: 0, endRow: 0, analysis: [], confidence: 0 }
  }
  
  // Find START: First 'data' row
  let startRow = analysis.findIndex(a => a.classification === 'data')
  if (startRow < 0) startRow = 0
  
  // Find END using multiple signals
  const amountCol = mappings.find(m => m.mappedTo === 'amount')
  const amtIndex = amountCol?.columnIndex ?? -1
  
  let endRow = startRow
  let runningSum = 0
  let lastDataRow = startRow
  
  for (let i = startRow; i < rows.length; i++) {
    const a = analysis[i]
    const amount = amtIndex >= 0 ? parseAmountValue(rows[i][amtIndex]) : 0
    
    // If this row is classified as total or closing, stop before it
    if (a.classification === 'total' || a.classification === 'closing') {
      endRow = lastDataRow
      break
    }
    
    // Amount-based total detection: if amount ≈ running sum, this is likely a total
    if (runningSum > 1000 && amount > 0) {
      const diff = Math.abs(amount - runningSum) / runningSum
      if (diff < 0.1) {
        endRow = lastDataRow
        break
      }
    }
    
    // Track data rows
    if (a.classification === 'data') {
      lastDataRow = i
      endRow = i
      runningSum += Math.abs(amount)
    }
  }
  
  // Calculate overall confidence
  const dataRows = analysis.slice(startRow, endRow + 1).filter(a => a.classification === 'data')
  const avgConfidence = dataRows.length > 0
    ? dataRows.reduce((sum, a) => sum + a.confidence, 0) / dataRows.length
    : 50
  
  return {
    startRow,
    endRow,
    analysis,
    confidence: Math.round(avgConfidence)
  }
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
 * Filters to only rows within the specified row range that have valid data
 * (non-empty category AND non-zero amount - matching handleImport filtering)
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
    
    const category = catValue ? String(catValue).trim() : ''
    const amount = parseAmount(amtValue)
    
    // Filter logic differs by import type:
    // - Budgets: Include ANY row with a valid category (even if amount is $0, blank, or null)
    //   A budget line with $0 is valid - it's a category placeholder or unfunded line
    // - Draws: Require category AND amount > 0 (a $0 draw request doesn't make sense)
    if (importType === 'budget') {
      // For budgets: ONLY require a non-empty category. Amount can be anything including 0/null/blank
      if (category && category.length > 0) {
        categoryValues.push(category)
        amountValues.push(amount) // amount is 0 if blank/null thanks to parseAmount
      }
    } else {
      // Draw import - require category AND positive amount
      if (category && category.length > 0 && amount > 0) {
        categoryValues.push(category)
        amountValues.push(amount)
      }
    }
  }
  
  // Debug logging (minimal for production)
  console.log(`[${importType.toUpperCase()} Export] ${categoryValues.length} categories from rows ${startRow}-${endRow}`)
  
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
      totalRows: categoryValues.length  // Reflects filtered valid row count
    }
  }
}