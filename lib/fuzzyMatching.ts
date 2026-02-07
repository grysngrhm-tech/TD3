/**
 * Fuzzy String Matching Utilities
 *
 * Shared Levenshtein distance and fuzzy scoring functions used by both
 * the invoice matching engine and the budget/draw import preview.
 */

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
 * Find best matching budget with score threshold.
 * Used by ImportPreview to fuzzy-match draw line categories to existing budgets.
 */
export function findBestBudgetMatch(
  category: string,
  budgets: { id: string; builder_category_raw: string | null; category: string }[] | null,
  threshold: number = 0.6
): { budget: typeof budgets extends (infer T)[] ? T : never; score: number } | null {
  if (!budgets || budgets.length === 0) return null

  let bestMatch: { budget: typeof budgets[0]; score: number } | null = null

  for (const b of budgets) {
    const builderScore = fuzzyMatchScore(category, b.builder_category_raw || '')
    const stdScore = fuzzyMatchScore(category, b.category)
    const score = Math.max(builderScore, stdScore)

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { budget: b, score }
    }
  }

  return bestMatch
}
