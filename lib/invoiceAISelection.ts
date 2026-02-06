/**
 * AI Selection Module
 *
 * Handles narrow AI-assisted selection when multiple candidates
 * are too close to differentiate deterministically.
 *
 * IMPORTANT: AI can ONLY select from pre-validated candidates.
 * It cannot invent new matches or categories.
 */

import OpenAI from 'openai'
import type {
  ExtractedInvoiceData,
  MatchCandidate,
  AISelectionRequest,
  AISelectionResponse,
} from '@/types/custom'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Build the AI selection prompt
 */
function buildSelectionPrompt(request: AISelectionRequest): string {
  const { invoice, candidates } = request

  const candidateList = candidates
    .slice(0, 5) // Max 5 candidates
    .map((c, i) => {
      const variancePct = (c.factors.amountVariance * 100).toFixed(1)
      const varianceDir = c.factors.amountVarianceAbsolute > 0
        ? `+$${c.factors.amountVarianceAbsolute.toFixed(0)}`
        : `-$${Math.abs(c.factors.amountVarianceAbsolute).toFixed(0)}`

      return `${i + 1}. ${c.budgetCategory}${c.nahbCategory ? ` (NAHB: ${c.nahbCategory})` : ''}
   Draw Line ID: ${c.drawLineId}
   Requested Amount: $${c.amountRequested.toLocaleString()}
   Invoice vs Request: ${varianceDir} (${variancePct}% variance)
   Scores: Amount=${c.scores.amount.toFixed(2)}, Trade=${c.scores.trade.toFixed(2)}, Keywords=${c.scores.keywords.toFixed(2)}, Training=${c.scores.training.toFixed(2)}
   Composite Score: ${c.scores.composite.toFixed(3)}
   ${c.factors.tradeMatch ? '✓ Trade matches' : ''}
   ${c.factors.vendorPreviousMatch ? '✓ Vendor has matched this category before' : ''}
   ${c.factors.keywordMatches.length > 0 ? `✓ Keywords match: ${c.factors.keywordMatches.join(', ')}` : ''}`
    })
    .join('\n\n')

  return `You are selecting the best budget category match for a construction invoice.
These candidates have already been pre-scored by our deterministic matching system.

CRITICAL RULES:
1. You MUST select from the provided candidates ONLY - you cannot invent new matches
2. If you cannot confidently distinguish between candidates, set flag_for_review: true
3. Explain your reasoning with specific factors from the invoice and candidates
4. The amount match is the most important factor (50% weight in scoring)

INVOICE DETAILS:
Vendor: ${invoice.vendorName}
Amount: $${invoice.amount.toLocaleString()}
Context: ${invoice.context || 'Not available'}
Keywords: ${invoice.keywords?.join(', ') || 'None'}
Trade Signal: ${invoice.trade || 'Unknown'}
Work Type: ${invoice.workType || 'Unknown'}

PRE-SCORED CANDIDATES (sorted by composite score):
${candidateList}

SELECTION CRITERIA (in order of importance):
1. Amount match - does the invoice amount closely match the draw line request?
2. Trade/category alignment - does the trade signal match the budget category?
3. Keyword overlap - do invoice keywords match category terms?
4. Historical patterns - has this vendor matched this category before?

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "selected_draw_line_id": "the UUID of the best candidate, or null if flagging for review",
  "confidence": 0.0 to 1.0,
  "reasoning": "One clear sentence explaining WHY this candidate is the best match",
  "flag_for_review": true or false,
  "factors": {
    "primary": "amount_match | trade_match | keyword_match | vendor_history",
    "supporting": ["array", "of", "supporting", "factors"]
  }
}`
}

/**
 * Parse AI response safely
 */
function parseAIResponse(content: string): AISelectionResponse | null {
  try {
    // Remove any markdown code blocks
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      selectedDrawLineId: parsed.selected_draw_line_id || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning || 'No reasoning provided',
      flagForReview: parsed.flag_for_review === true,
      factors: {
        primary: parsed.factors?.primary || 'unknown',
        supporting: Array.isArray(parsed.factors?.supporting) ? parsed.factors.supporting : [],
      },
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
    return null
  }
}

/**
 * Request AI selection from OpenAI
 *
 * This is only called when:
 * 1. Multiple candidates have similar scores (within CLEAR_WINNER_GAP)
 * 2. Top candidate score is between 0.5 and AUTO_MATCH_SCORE
 *
 * AI can only select from the provided candidates or flag for human review.
 */
export async function requestAISelection(
  request: AISelectionRequest
): Promise<AISelectionResponse> {
  const { candidates } = request

  // Validate we have candidates to choose from
  if (!candidates || candidates.length === 0) {
    return {
      selectedDrawLineId: null,
      confidence: 0,
      reasoning: 'No candidates provided for selection',
      flagForReview: true,
      factors: { primary: 'no_candidates', supporting: [] },
    }
  }

  // Build the prompt
  const prompt = buildSelectionPrompt(request)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are an expert construction finance analyst. You help match invoices to budget categories. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return {
        selectedDrawLineId: null,
        confidence: 0,
        reasoning: 'AI returned empty response',
        flagForReview: true,
        factors: { primary: 'ai_error', supporting: ['empty_response'] },
      }
    }

    const parsed = parseAIResponse(content)
    if (!parsed) {
      return {
        selectedDrawLineId: null,
        confidence: 0,
        reasoning: 'Failed to parse AI response',
        flagForReview: true,
        factors: { primary: 'parse_error', supporting: [] },
      }
    }

    // Validate that selected draw line is actually in our candidates
    if (parsed.selectedDrawLineId) {
      const isValidCandidate = candidates.some(c => c.drawLineId === parsed.selectedDrawLineId)
      if (!isValidCandidate) {
        console.warn('AI selected invalid draw line ID, flagging for review')
        return {
          selectedDrawLineId: null,
          confidence: 0,
          reasoning: 'AI selected an invalid candidate - flagged for manual review',
          flagForReview: true,
          factors: { primary: 'invalid_selection', supporting: ['draw_line_not_in_candidates'] },
        }
      }
    }

    return parsed
  } catch (error: any) {
    console.error('AI selection error:', error)
    return {
      selectedDrawLineId: null,
      confidence: 0,
      reasoning: `AI selection failed: ${error.message || 'Unknown error'}`,
      flagForReview: true,
      factors: { primary: 'ai_error', supporting: [error.message || 'unknown'] },
    }
  }
}

/**
 * Check if AI selection should be used based on classification
 */
export function shouldUseAISelection(
  classification: { status: string; needsAI: boolean },
  enableAI: boolean = true
): boolean {
  // Only use AI for MULTIPLE_CANDIDATES status when AI is enabled
  return enableAI && classification.status === 'MULTIPLE_CANDIDATES' && classification.needsAI
}

/**
 * Get the best candidate from AI selection or fall back to top scored candidate
 */
export function getBestCandidate(
  candidates: MatchCandidate[],
  aiResponse: AISelectionResponse | null
): MatchCandidate | null {
  if (!candidates || candidates.length === 0) {
    return null
  }

  // If AI made a valid selection, use it
  if (aiResponse?.selectedDrawLineId && !aiResponse.flagForReview) {
    const selected = candidates.find(c => c.drawLineId === aiResponse.selectedDrawLineId)
    if (selected) {
      return selected
    }
  }

  // Fall back to top scored candidate
  return candidates[0]
}
