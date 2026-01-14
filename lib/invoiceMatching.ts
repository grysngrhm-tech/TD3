/**
 * Invoice Matching Module
 *
 * Core deterministic matching logic for invoice-to-draw-line matching.
 * This module generates candidates and scores them without AI.
 * AI is only used when multiple candidates are too close to differentiate.
 */

import type {
  Budget,
  DrawRequestLine,
  ExtractedInvoiceData,
  MatchCandidate,
  MatchClassification,
  MatchClassificationResult,
  VendorCategoryAssociation,
  MATCHING_THRESHOLDS,
  MATCHING_WEIGHTS,
} from '@/types/database'
import { createClient } from '@/lib/supabase/client'

// Re-export thresholds and weights for external use
export { MATCHING_THRESHOLDS, MATCHING_WEIGHTS } from '@/types/database'

// ============================================
// STRING MATCHING UTILITIES
// ============================================

/**
 * Levenshtein distance for fuzzy string matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Fuzzy match scoring function - returns 0-1 score
 */
export function fuzzyMatchScore(input: string, target: string): number {
  if (!input || !target) return 0

  const a = input.toLowerCase().trim()
  const b = target.toLowerCase().trim()

  if (!a || !b) return 0

  // Exact match = 1.0
  if (a === b) return 1.0

  // One contains the other = 0.9
  if (a.includes(b) || b.includes(a)) return 0.9

  // Tokenized word matching - handles "Framing Labor" vs "Framing - Labor"
  const aWords = a.split(/[\s\-_,&]+/).filter(w => w.length > 1)
  const bWords = b.split(/[\s\-_,&]+/).filter(w => w.length > 1)

  if (aWords.length > 0 && bWords.length > 0) {
    // Count words that match or are contained in each other
    const matchedAWords = aWords.filter(aw =>
      bWords.some(bw => bw.includes(aw) || aw.includes(bw) || levenshteinDistance(aw, bw) <= 1)
    )
    const matchedBWords = bWords.filter(bw =>
      aWords.some(aw => aw.includes(bw) || bw.includes(aw) || levenshteinDistance(aw, bw) <= 1)
    )

    const wordScore = (matchedAWords.length + matchedBWords.length) / (aWords.length + bWords.length)
    if (wordScore >= 0.5) return 0.65 + (wordScore * 0.25) // Returns 0.65-0.9
  }

  // Levenshtein distance for shorter strings (handles typos)
  if (a.length < 30 && b.length < 30) {
    const distance = levenshteinDistance(a, b)
    const maxLen = Math.max(a.length, b.length)
    const similarity = 1 - (distance / maxLen)
    if (similarity >= 0.7) return similarity * 0.8 // Returns 0.56-0.8
  }

  return 0
}

/**
 * Normalize vendor name for consistent matching
 * Removes common suffixes (LLC, Inc, etc.) and normalizes whitespace
 */
export function normalizeVendorName(vendor: string): string {
  return vendor
    .toLowerCase()
    .trim()
    .replace(/\s+(llc|inc|corp|co|ltd|lp|llp)\.?$/i, '')
    .replace(/\s+/g, ' ')
}

/**
 * Tokenize a string into words for keyword matching
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_,&./]+/)
    .filter(w => w.length > 2) // Skip very short words
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 0)
}

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate amount score (50% weight) - primary matching signal
 */
export function calculateAmountScore(
  invoiceAmount: number,
  requestedAmount: number
): { score: number; variance: number; varianceAbsolute: number } {
  if (requestedAmount === 0) {
    return { score: 0, variance: 1, varianceAbsolute: invoiceAmount }
  }

  const varianceAbsolute = Math.abs(invoiceAmount - requestedAmount)
  const variance = varianceAbsolute / requestedAmount

  // Exact match (within $50 or 2%)
  if (varianceAbsolute <= 50 || variance <= 0.02) {
    return { score: 1.0, variance, varianceAbsolute }
  }

  // Within 5%
  if (variance <= 0.05) {
    return { score: 0.95, variance, varianceAbsolute }
  }

  // Within 10%
  if (variance <= 0.10) {
    return { score: 0.80, variance, varianceAbsolute }
  }

  // Within 15%
  if (variance <= 0.15) {
    return { score: 0.65, variance, varianceAbsolute }
  }

  // Within 25%
  if (variance <= 0.25) {
    return { score: 0.45, variance, varianceAbsolute }
  }

  // Over 25% variance
  return { score: 0.20, variance, varianceAbsolute }
}

/**
 * Calculate trade match score (20% weight)
 * Maps extracted trade signal to budget categories
 */
export function calculateTradeScore(
  trade: string | null,
  budgetCategory: string,
  nahbCategory: string | null
): { score: number; matched: boolean } {
  if (!trade) {
    return { score: 0, matched: false }
  }

  const tradeLower = trade.toLowerCase()
  const categoryLower = budgetCategory.toLowerCase()
  const nahbLower = nahbCategory?.toLowerCase() || ''

  // Trade to category mapping
  const tradeMap: Record<string, string[]> = {
    'electrical': ['electrical', 'electric', 'low voltage'],
    'plumbing': ['plumbing', 'plumber'],
    'hvac': ['hvac', 'mechanical', 'heating', 'air conditioning'],
    'framing': ['framing', 'lumber', 'carpentry'],
    'roofing': ['roofing', 'roof'],
    'flooring': ['flooring', 'floor', 'carpet', 'tile', 'hardwood'],
    'foundation': ['foundation', 'concrete', 'footings'],
    'excavation': ['excavation', 'site work', 'grading'],
    'landscaping': ['landscaping', 'landscape', 'irrigation'],
    'painting': ['painting', 'paint', 'interior paint', 'exterior paint'],
    'drywall': ['drywall', 'insulation'],
    'insulation': ['insulation', 'drywall'],
    'windows_doors': ['windows', 'doors', 'window', 'door'],
    'appliances': ['appliances', 'appliance'],
    'fixtures': ['fixtures', 'plumbing fixtures', 'light fixtures'],
    'general': ['general conditions', 'general', 'permits', 'fees'],
  }

  const matchTerms = tradeMap[tradeLower] || [tradeLower]

  // Check if any match term appears in category or NAHB
  for (const term of matchTerms) {
    if (categoryLower.includes(term) || nahbLower.includes(term)) {
      return { score: 1.0, matched: true }
    }
  }

  // Check reverse - category contains trade
  if (categoryLower.includes(tradeLower) || nahbLower.includes(tradeLower)) {
    return { score: 0.9, matched: true }
  }

  return { score: 0, matched: false }
}

/**
 * Calculate keyword overlap score (15% weight)
 */
export function calculateKeywordScore(
  keywords: string[],
  budgetCategory: string,
  nahbCategory: string | null,
  nahbSubcategory: string | null
): { score: number; matchedKeywords: string[] } {
  if (!keywords || keywords.length === 0) {
    return { score: 0, matchedKeywords: [] }
  }

  // Tokenize categories
  const categoryTokens = new Set([
    ...tokenize(budgetCategory),
    ...tokenize(nahbCategory || ''),
    ...tokenize(nahbSubcategory || ''),
  ])

  // Find matching keywords
  const matchedKeywords = keywords.filter(kw =>
    categoryTokens.has(kw.toLowerCase()) ||
    [...categoryTokens].some(ct => ct.includes(kw.toLowerCase()) || kw.toLowerCase().includes(ct))
  )

  if (matchedKeywords.length === 0) {
    return { score: 0, matchedKeywords: [] }
  }

  // Score based on proportion of keywords that matched
  const score = Math.min(matchedKeywords.length / Math.max(keywords.length, 3), 1.0)

  return { score, matchedKeywords }
}

/**
 * Calculate training score (15% weight) - learned from past approved draws
 */
export async function calculateTrainingScore(
  vendorName: string,
  keywords: string[],
  budgetCategory: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ score: number; reason: string | null; vendorMatched: boolean }> {
  const normalizedVendor = normalizeVendorName(vendorName)

  // 1. Check vendor associations (fast lookup)
  const { data: vendorMatch } = await supabase
    .from('vendor_category_associations')
    .select('match_count, total_amount')
    .eq('vendor_name_normalized', normalizedVendor)
    .eq('budget_category', budgetCategory)
    .single()

  if (vendorMatch && vendorMatch.match_count >= 3) {
    return {
      score: 0.9,
      reason: `${vendorName} matched to ${budgetCategory} ${vendorMatch.match_count} times before`,
      vendorMatched: true,
    }
  }

  if (vendorMatch && vendorMatch.match_count >= 1) {
    return {
      score: 0.5 + (vendorMatch.match_count * 0.1),
      reason: `${vendorName} matched to ${budgetCategory} ${vendorMatch.match_count} time(s)`,
      vendorMatched: true,
    }
  }

  // 2. Check keyword overlap with training data
  if (keywords.length > 0) {
    const { data: trainingRecords } = await supabase
      .from('invoice_match_training')
      .select('keywords')
      .eq('budget_category', budgetCategory)
      .limit(50)

    if (trainingRecords && trainingRecords.length > 0) {
      const keywordSet = new Set(keywords.map(k => k.toLowerCase()))
      const overlapCount = trainingRecords.filter(t =>
        t.keywords?.some((k: string) => keywordSet.has(k.toLowerCase()))
      ).length

      if (overlapCount >= 5) {
        return {
          score: 0.6,
          reason: `Keywords match ${overlapCount} previous invoices in ${budgetCategory}`,
          vendorMatched: false,
        }
      }

      if (overlapCount >= 2) {
        return {
          score: 0.3,
          reason: `Keywords match ${overlapCount} previous invoices`,
          vendorMatched: false,
        }
      }
    }
  }

  return { score: 0, reason: null, vendorMatched: false }
}

// ============================================
// CANDIDATE GENERATION
// ============================================

interface GenerateCandidatesOptions {
  supabase?: ReturnType<typeof createClient>
  skipTrainingLookup?: boolean
}

/**
 * Generate match candidates for an invoice against all draw lines
 * This is the core deterministic matching logic
 */
export async function generateMatchCandidates(
  invoice: ExtractedInvoiceData,
  drawLines: DrawRequestLine[],
  budgets: Budget[],
  options: GenerateCandidatesOptions = {}
): Promise<MatchCandidate[]> {
  const candidates: MatchCandidate[] = []
  const supabase = options.supabase || createClient()

  // Create budget lookup map
  const budgetMap = new Map(budgets.map(b => [b.id, b]))

  for (const line of drawLines) {
    const budget = line.budget_id ? budgetMap.get(line.budget_id) : null
    if (!budget) continue

    // Skip lines with zero amount
    if ((line.amount_requested || 0) <= 0) continue

    // 1. Amount score (50% weight)
    const amountResult = calculateAmountScore(
      invoice.amount,
      line.amount_requested || 0
    )

    // 2. Trade score (20% weight)
    const tradeResult = calculateTradeScore(
      invoice.trade,
      budget.category,
      budget.nahb_category
    )

    // 3. Keyword score (15% weight)
    const keywordResult = calculateKeywordScore(
      invoice.keywords || [],
      budget.category,
      budget.nahb_category,
      budget.nahb_subcategory
    )

    // 4. Training score (15% weight)
    let trainingResult = { score: 0, reason: null as string | null, vendorMatched: false }
    if (!options.skipTrainingLookup) {
      trainingResult = await calculateTrainingScore(
        invoice.vendorName,
        invoice.keywords || [],
        budget.category,
        supabase
      )
    }

    // Calculate composite score
    const { AMOUNT, TRADE, KEYWORDS, TRAINING } = { AMOUNT: 0.50, TRADE: 0.20, KEYWORDS: 0.15, TRAINING: 0.15 }
    const compositeScore =
      amountResult.score * AMOUNT +
      tradeResult.score * TRADE +
      keywordResult.score * KEYWORDS +
      trainingResult.score * TRAINING

    // Only include candidates above minimum threshold
    if (compositeScore >= 0.35) {
      candidates.push({
        drawLineId: line.id,
        budgetId: line.budget_id,
        budgetCategory: budget.category,
        nahbCategory: budget.nahb_category,
        amountRequested: line.amount_requested || 0,
        scores: {
          amount: amountResult.score,
          trade: tradeResult.score,
          keywords: keywordResult.score,
          training: trainingResult.score,
          composite: compositeScore,
        },
        factors: {
          amountVariance: amountResult.variance,
          amountVarianceAbsolute: amountResult.varianceAbsolute,
          tradeMatch: tradeResult.matched,
          keywordMatches: keywordResult.matchedKeywords,
          vendorPreviousMatch: trainingResult.vendorMatched,
          trainingReason: trainingResult.reason,
        },
      })
    }
  }

  // Sort by composite score descending
  return candidates.sort((a, b) => b.scores.composite - a.scores.composite)
}

// ============================================
// CLASSIFICATION
// ============================================

/**
 * Classify match result to determine next action
 */
export function classifyMatchResult(candidates: MatchCandidate[]): MatchClassificationResult {
  const AUTO_MATCH_SCORE = 0.85
  const CLEAR_WINNER_GAP = 0.15

  if (candidates.length === 0) {
    return {
      status: 'NO_CANDIDATES',
      candidates: [],
      topCandidate: null,
      confidence: 0,
      needsAI: false,
      needsReview: true,
    }
  }

  const top = candidates[0]
  const second = candidates[1]

  // Single clear winner: high score AND significant gap from second
  if (top.scores.composite >= AUTO_MATCH_SCORE) {
    if (!second || (top.scores.composite - second.scores.composite) >= CLEAR_WINNER_GAP) {
      return {
        status: 'SINGLE_MATCH',
        candidates,
        topCandidate: top,
        confidence: top.scores.composite,
        needsAI: false,
        needsReview: false,
      }
    }
  }

  // Multiple candidates close together - AI can help
  if (candidates.length >= 2 && second &&
    (top.scores.composite - second.scores.composite) < CLEAR_WINNER_GAP &&
    top.scores.composite >= 0.5) {
    return {
      status: 'MULTIPLE_CANDIDATES',
      candidates: candidates.slice(0, 5), // Top 5 for AI consideration
      topCandidate: top,
      confidence: top.scores.composite,
      needsAI: true,
      needsReview: false,
    }
  }

  // Ambiguous - score not high enough, needs human review
  return {
    status: 'AMBIGUOUS',
    candidates: candidates.slice(0, 5),
    topCandidate: top,
    confidence: top.scores.composite,
    needsAI: false,
    needsReview: true,
  }
}

// ============================================
// AMOUNT COVERAGE VALIDATION
// ============================================

export interface CoverageValidation {
  totalInvoiceAmount: number
  totalDrawAmount: number
  variance: number
  varianceAbsolute: number
  isCovered: boolean
  uncoveredLines: Array<{
    lineId: string
    budgetCategory: string
    amountRequested: number
    matchedInvoiceAmount: number | null
  }>
  flags: string[]
}

/**
 * Validate that invoice amounts cover draw line amounts
 * This is deterministic and should be run after all matching is complete
 */
export function validateCoverage(
  drawLines: DrawRequestLine[],
  matchedInvoices: Map<string, { amount: number; invoiceId: string }>
): CoverageValidation {
  const flags: string[] = []
  const uncoveredLines: CoverageValidation['uncoveredLines'] = []

  let totalInvoiceAmount = 0
  let totalDrawAmount = 0

  for (const line of drawLines) {
    const requestedAmount = line.amount_requested || 0
    if (requestedAmount <= 0) continue

    totalDrawAmount += requestedAmount
    const matched = matchedInvoices.get(line.id)

    if (!matched) {
      uncoveredLines.push({
        lineId: line.id,
        budgetCategory: '', // Would need budget lookup
        amountRequested: requestedAmount,
        matchedInvoiceAmount: null,
      })
      flags.push('NO_INVOICE')
    } else {
      totalInvoiceAmount += matched.amount
      const variance = Math.abs(matched.amount - requestedAmount) / requestedAmount

      if (variance > 0.10) {
        flags.push('AMOUNT_MISMATCH')
      }
    }
  }

  const varianceAbsolute = Math.abs(totalInvoiceAmount - totalDrawAmount)
  const variance = totalDrawAmount > 0 ? varianceAbsolute / totalDrawAmount : 0
  const isCovered = variance <= 0.10 && uncoveredLines.length === 0

  return {
    totalInvoiceAmount,
    totalDrawAmount,
    variance,
    varianceAbsolute,
    isCovered,
    uncoveredLines,
    flags: [...new Set(flags)], // Dedupe
  }
}

// ============================================
// EXACT AMOUNT MATCHING (FAST PATH)
// ============================================

/**
 * Find exact amount matches between invoices and draw lines
 * This is the fast path - if amounts match exactly, we can skip scoring
 */
export function findExactAmountMatches(
  invoices: Array<{ id: string; amount: number; vendorName: string }>,
  drawLines: Array<{ id: string; amount_requested: number; budget_id: string | null }>,
  tolerance: number = 0.05
): Map<string, string> {
  const matches = new Map<string, string>() // invoiceId -> drawLineId
  const usedLineIds = new Set<string>()

  // Sort invoices by amount descending (match larger amounts first)
  const sortedInvoices = [...invoices].sort((a, b) => b.amount - a.amount)

  for (const invoice of sortedInvoices) {
    let bestMatch: { lineId: string; variance: number } | null = null

    for (const line of drawLines) {
      if (usedLineIds.has(line.id)) continue
      if ((line.amount_requested || 0) <= 0) continue

      const variance = Math.abs(invoice.amount - (line.amount_requested || 0)) / (line.amount_requested || 1)

      if (variance <= tolerance) {
        if (!bestMatch || variance < bestMatch.variance) {
          bestMatch = { lineId: line.id, variance }
        }
      }
    }

    if (bestMatch) {
      matches.set(invoice.id, bestMatch.lineId)
      usedLineIds.add(bestMatch.lineId)
    }
  }

  return matches
}
