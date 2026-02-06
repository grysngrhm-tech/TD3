/**
 * Invoice Learning Module
 *
 * Captures training data when draws are approved (funded).
 * This is the core of the self-improving matching system.
 *
 * Every approved draw becomes training data that improves future matching:
 * - Vendor → Category associations are recorded and strengthened
 * - Keyword → Category patterns are captured
 * - Trade → Category mappings are validated
 *
 * The system gets smarter with every approval - no manual intervention needed.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { normalizeVendorName } from './invoiceMatching'
import type { ExtractedInvoiceData } from '@/types/custom'

// Lazy-initialize Supabase admin client to avoid runtime errors when imported from client components
let _supabaseAdmin: SupabaseClient | null = null
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabaseAdmin
}

interface MatchedInvoice {
  id: string
  vendor_name: string
  amount: number
  extracted_data: ExtractedInvoiceData | null
  matched_to_category: string | null
  matched_to_nahb_code: string | null
  match_status: string
  confidence_score: number | null
  was_manually_corrected: boolean
  draw_request_line_id: string | null
}

interface TrainingCaptureResult {
  success: boolean
  invoicesProcessed: number
  trainingRecordsCreated: number
  vendorAssociationsUpdated: number
  errors: string[]
}

/**
 * Capture training data when a draw is funded
 *
 * This is called from the wire batch funding flow.
 * Every matched invoice becomes a training record.
 */
export async function captureTrainingDataForDraw(
  drawId: string,
  supabase?: SupabaseClient
): Promise<TrainingCaptureResult> {
  const client = supabase || getSupabaseAdmin()
  const result: TrainingCaptureResult = {
    success: true,
    invoicesProcessed: 0,
    trainingRecordsCreated: 0,
    vendorAssociationsUpdated: 0,
    errors: [],
  }

  try {
    console.log(`[Learning] Capturing training data for draw ${drawId}`)

    // Get all invoices matched to this draw's lines
    const { data: invoices, error: invoicesError } = await client
      .from('invoices')
      .select(`
        id,
        vendor_name,
        amount,
        extracted_data,
        matched_to_category,
        matched_to_nahb_code,
        match_status,
        confidence_score,
        was_manually_corrected,
        draw_request_line_id
      `)
      .eq('draw_request_id', drawId)
      .not('matched_to_category', 'is', null)

    if (invoicesError) {
      result.success = false
      result.errors.push(`Failed to fetch invoices: ${invoicesError.message}`)
      return result
    }

    if (!invoices || invoices.length === 0) {
      console.log(`[Learning] No matched invoices found for draw ${drawId}`)
      return result
    }

    result.invoicesProcessed = invoices.length
    const approvedAt = new Date().toISOString()

    for (const invoice of invoices as MatchedInvoice[]) {
      try {
        // Parse extracted_data if it's a string
        let extracted = invoice.extracted_data
        if (typeof extracted === 'string') {
          try {
            extracted = JSON.parse(extracted)
          } catch {
            extracted = null
          }
        }

        // Determine match method
        let matchMethod: 'auto' | 'ai' | 'manual' = 'auto'
        if (invoice.match_status === 'ai_matched') {
          matchMethod = 'ai'
        } else if (invoice.match_status === 'manually_matched' || invoice.was_manually_corrected) {
          matchMethod = 'manual'
        }

        // Create training record
        const trainingRecord = {
          invoice_id: invoice.id,
          draw_request_id: drawId,
          approved_at: approvedAt,

          // Extraction data (for future matching)
          vendor_name_normalized: normalizeVendorName(invoice.vendor_name || 'Unknown'),
          amount: invoice.amount || 0,
          context: extracted?.context || null,
          keywords: extracted?.keywords || [],
          trade: extracted?.trade || null,
          work_type: extracted?.workType || null,

          // Match result (ground truth from approval)
          budget_category: invoice.matched_to_category!,
          nahb_category: invoice.matched_to_nahb_code || null,

          // Match metadata
          match_method: matchMethod,
          confidence_at_match: invoice.confidence_score || null,
          was_corrected: invoice.was_manually_corrected || false,
        }

        const { error: insertError } = await client
          .from('invoice_match_training')
          .insert(trainingRecord)

        if (insertError) {
          // Check if it's a duplicate (invoice already trained)
          if (insertError.code === '23505') {
            console.log(`[Learning] Invoice ${invoice.id} already has training record, skipping`)
          } else {
            result.errors.push(`Failed to create training record for invoice ${invoice.id}: ${insertError.message}`)
          }
        } else {
          result.trainingRecordsCreated++
          console.log(`[Learning] Created training record for invoice ${invoice.id} → ${invoice.matched_to_category}`)
        }

        // Update vendor association (aggregated lookup table)
        const vendorAssocResult = await upsertVendorAssociation(
          client,
          normalizeVendorName(invoice.vendor_name || 'Unknown'),
          invoice.matched_to_category!,
          invoice.matched_to_nahb_code || null,
          invoice.amount || 0
        )

        if (vendorAssocResult) {
          result.vendorAssociationsUpdated++
        }

      } catch (invoiceError: any) {
        result.errors.push(`Error processing invoice ${invoice.id}: ${invoiceError.message}`)
      }
    }

    console.log(`[Learning] Completed for draw ${drawId}: ${result.trainingRecordsCreated} training records, ${result.vendorAssociationsUpdated} vendor associations`)

  } catch (error: any) {
    result.success = false
    result.errors.push(`Fatal error: ${error.message}`)
  }

  return result
}

/**
 * Upsert a vendor → category association
 *
 * This creates or updates the aggregated vendor association table
 * which is used for quick vendor history lookups during matching.
 */
async function upsertVendorAssociation(
  supabase: SupabaseClient,
  vendorNormalized: string,
  budgetCategory: string,
  nahbCategory: string | null,
  amount: number
): Promise<boolean> {
  try {
    // Try to insert first
    const { error: insertError } = await supabase
      .from('vendor_category_associations')
      .insert({
        vendor_name_normalized: vendorNormalized,
        budget_category: budgetCategory,
        nahb_category: nahbCategory,
        match_count: 1,
        total_amount: amount,
        last_matched_at: new Date().toISOString(),
      })

    if (!insertError) {
      console.log(`[Learning] Created vendor association: ${vendorNormalized} → ${budgetCategory}`)
      return true
    }

    // If duplicate, update instead
    if (insertError.code === '23505') {
      const { error: updateError } = await supabase
        .from('vendor_category_associations')
        .update({
          match_count: supabase.rpc ? undefined : 1, // Will use RPC below
          last_matched_at: new Date().toISOString(),
        })
        .eq('vendor_name_normalized', vendorNormalized)
        .eq('budget_category', budgetCategory)

      // Use raw SQL for atomic increment if RPC is available
      // For now, do a read-modify-write
      const { data: existing } = await supabase
        .from('vendor_category_associations')
        .select('match_count, total_amount')
        .eq('vendor_name_normalized', vendorNormalized)
        .eq('budget_category', budgetCategory)
        .single()

      if (existing) {
        await supabase
          .from('vendor_category_associations')
          .update({
            match_count: (existing.match_count || 0) + 1,
            total_amount: (existing.total_amount || 0) + amount,
            last_matched_at: new Date().toISOString(),
          })
          .eq('vendor_name_normalized', vendorNormalized)
          .eq('budget_category', budgetCategory)

        console.log(`[Learning] Updated vendor association: ${vendorNormalized} → ${budgetCategory} (count: ${existing.match_count + 1})`)
        return true
      }
    }

    console.error(`[Learning] Failed to upsert vendor association: ${insertError.message}`)
    return false

  } catch (error: any) {
    console.error(`[Learning] Error upserting vendor association: ${error.message}`)
    return false
  }
}

/**
 * Record a manual correction
 *
 * When a user overrides an auto or AI match, record the correction
 * so the system can learn from mistakes.
 */
export async function recordMatchCorrection(
  invoiceId: string,
  previousDrawLineId: string | null,
  newDrawLineId: string,
  newCategory: string,
  correctionReason: string | null,
  userId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getSupabaseAdmin()
  try {
    // Get the invoice's current candidates
    const { data: invoice } = await client
      .from('invoices')
      .select('extracted_data, confidence_score')
      .eq('id', invoiceId)
      .single()

    // Get candidate info from the decision history
    const { data: lastDecision } = await client
      .from('invoice_match_decisions')
      .select('candidates')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Record the correction decision
    const { error } = await client
      .from('invoice_match_decisions')
      .insert({
        invoice_id: invoiceId,
        draw_request_line_id: newDrawLineId,
        decision_type: 'manual_override',
        decision_source: 'user',
        candidates: lastDecision?.candidates || [],
        selected_draw_line_id: newDrawLineId,
        selected_confidence: invoice?.confidence_score || null,
        selection_factors: { correction_reason: correctionReason, corrected_by: userId },
        previous_draw_line_id: previousDrawLineId,
        correction_reason: correctionReason,
        decided_at: new Date().toISOString(),
      })

    if (error) {
      console.error(`[Learning] Failed to record correction: ${error.message}`)
      return false
    }

    // Mark the invoice as manually corrected
    await client
      .from('invoices')
      .update({
        was_manually_corrected: true,
        match_status: 'manually_matched',
        draw_request_line_id: newDrawLineId,
        matched_to_category: newCategory,
      })
      .eq('id', invoiceId)

    console.log(`[Learning] Recorded correction for invoice ${invoiceId}: ${previousDrawLineId} → ${newDrawLineId}`)
    return true

  } catch (error: any) {
    console.error(`[Learning] Error recording correction: ${error.message}`)
    return false
  }
}

/**
 * Get vendor history for matching boost
 *
 * Used during candidate generation to boost scores for
 * vendors that have matched to a category before.
 */
export async function getVendorHistory(
  vendorName: string,
  supabase?: SupabaseClient
): Promise<Map<string, { matchCount: number; totalAmount: number }>> {
  const client = supabase || getSupabaseAdmin()
  const normalized = normalizeVendorName(vendorName)
  const history = new Map<string, { matchCount: number; totalAmount: number }>()

  try {
    const { data: associations } = await client
      .from('vendor_category_associations')
      .select('budget_category, match_count, total_amount')
      .eq('vendor_name_normalized', normalized)

    if (associations) {
      for (const assoc of associations) {
        history.set(assoc.budget_category, {
          matchCount: assoc.match_count || 0,
          totalAmount: assoc.total_amount || 0,
        })
      }
    }
  } catch (error: any) {
    console.error(`[Learning] Error fetching vendor history: ${error.message}`)
  }

  return history
}

/**
 * Get trade → category patterns from training data
 *
 * Used to boost candidates when the extracted trade matches
 * historically successful category mappings.
 */
export async function getTradePatterns(
  trade: string,
  supabase?: SupabaseClient
): Promise<Map<string, number>> {
  const client = supabase || getSupabaseAdmin()
  const patterns = new Map<string, number>()

  try {
    const { data: training } = await client
      .from('invoice_match_training')
      .select('budget_category')
      .eq('trade', trade)

    if (training) {
      for (const record of training) {
        const count = patterns.get(record.budget_category) || 0
        patterns.set(record.budget_category, count + 1)
      }
    }
  } catch (error: any) {
    console.error(`[Learning] Error fetching trade patterns: ${error.message}`)
  }

  return patterns
}

/**
 * Get keyword → category patterns from training data
 *
 * Used to boost candidates when invoice keywords overlap
 * with keywords from previously successful matches.
 */
export async function getKeywordPatterns(
  keywords: string[],
  budgetCategory: string,
  supabase?: SupabaseClient
): Promise<number> {
  if (!keywords || keywords.length === 0) {
    return 0
  }

  const client = supabase || getSupabaseAdmin()

  try {
    // Find training records for this category that have overlapping keywords
    const { data: training } = await client
      .from('invoice_match_training')
      .select('keywords')
      .eq('budget_category', budgetCategory)
      .limit(100)

    if (!training || training.length === 0) {
      return 0
    }

    // Count records with keyword overlap
    let overlapCount = 0
    for (const record of training) {
      const recordKeywords = record.keywords || []
      const hasOverlap = recordKeywords.some((k: string) =>
        keywords.some(invoiceKw => k.toLowerCase() === invoiceKw.toLowerCase())
      )
      if (hasOverlap) {
        overlapCount++
      }
    }

    return overlapCount

  } catch (error: any) {
    console.error(`[Learning] Error fetching keyword patterns: ${error.message}`)
    return 0
  }
}
