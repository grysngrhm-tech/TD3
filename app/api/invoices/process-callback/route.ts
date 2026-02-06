import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyWebhookSecret } from '@/lib/api-auth'
import {
  generateMatchCandidates,
  classifyMatchResult,
} from '@/lib/invoiceMatching'
import { triggerInvoiceDisambiguation } from '@/lib/n8n'
import { reconcileNoInvoiceFlags } from '@/lib/invoiceFlags'
import type {
  ExtractedInvoiceData,
  MatchCandidate,
  MatchClassificationResult,
  Budget,
  DrawRequestLine,
  Json,
} from '@/types/custom'

/**
 * Invoice Process Callback API
 *
 * Called by n8n after AI extraction completes.
 * This is the single callback endpoint for invoice processing.
 *
 * Flow:
 * 1. Verify webhook secret
 * 2. Store extracted data in invoice record
 * 3. Run deterministic candidate generation
 * 4. Classify result (SINGLE_MATCH, MULTIPLE_CANDIDATES, AMBIGUOUS, NO_CANDIDATES)
 * 5. For SINGLE_MATCH: auto-apply match
 * 6. For MULTIPLE_CANDIDATES: flag for review (AI selection can be added later)
 * 7. For AMBIGUOUS/NO_CANDIDATES: flag for manual review
 * 8. Reconcile NO_INVOICE flags across draw lines
 */

// Payload from n8n extraction workflow
interface ExtractionCallbackPayload {
  invoiceId: string
  n8nExecutionId?: string | null
  success: boolean
  error?: string
  extractedData?: ExtractedInvoiceData
  metadata?: {
    drawRequestId?: string
    projectId?: string
    fileName?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (fail-closed: rejects if env var is unset)
    const [, authError] = verifyWebhookSecret(request)
    if (authError) return authError

    const body: ExtractionCallbackPayload = await request.json()
    const { invoiceId, n8nExecutionId, success, error, extractedData, metadata } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
    }

    // Get existing invoice
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*, draw_request_id, project_id, file_url, file_path')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Handle extraction failure
    if (!success || !extractedData) {
      await supabaseAdmin
        .from('invoices')
        .update({
          extraction_status: 'extraction_failed',
          match_status: 'no_match',
          flags: JSON.stringify({
            status_detail: 'extraction_failed',
            error: error || 'Extraction failed',
            n8n_execution_id: n8nExecutionId,
            completed_at: now,
          }),
          updated_at: now,
        })
        .eq('id', invoiceId)

      return NextResponse.json({
        success: false,
        invoiceId,
        status: 'extraction_failed',
        error: error || 'Extraction failed',
      })
    }

    // Store extracted data
    await supabaseAdmin
      .from('invoices')
      .update({
        vendor_name: extractedData.vendorName || 'Unknown Vendor',
        amount: extractedData.amount || 0,
        invoice_number: extractedData.invoiceNumber,
        invoice_date: extractedData.invoiceDate,
        extraction_status: 'extracted',
        extracted_data: extractedData as unknown as Record<string, unknown>,
        updated_at: now,
      })
      .eq('id', invoiceId)

    // Get draw request ID (from invoice or metadata)
    const drawRequestId = existingInvoice.draw_request_id || metadata?.drawRequestId

    if (!drawRequestId) {
      // No draw request to match against - just mark as extracted
      await supabaseAdmin
        .from('invoices')
        .update({ match_status: 'pending' })
        .eq('id', invoiceId)

      return NextResponse.json({
        success: true,
        invoiceId,
        status: 'extracted',
        message: 'Extraction complete, no draw request to match against',
      })
    }

    // Get draw lines and budgets for matching
    const { data: drawLines } = await supabaseAdmin
      .from('draw_request_lines')
      .select('*')
      .eq('draw_request_id', drawRequestId)

    if (!drawLines || drawLines.length === 0) {
      await supabaseAdmin
        .from('invoices')
        .update({
          match_status: 'no_match',
          candidate_count: 0,
          flags: JSON.stringify({
            status_detail: 'no_draw_lines',
            n8n_execution_id: n8nExecutionId,
            completed_at: now,
          }),
        })
        .eq('id', invoiceId)

      return NextResponse.json({
        success: true,
        invoiceId,
        status: 'no_match',
        reason: 'No draw lines to match against',
      })
    }

    // Fetch budgets for matching
    const budgetIds = [...new Set(drawLines.map(l => l.budget_id).filter(Boolean))]
    const { data: budgets } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .in('id', budgetIds)

    // Generate candidates using deterministic matching
    const candidates = await generateMatchCandidates(
      extractedData,
      drawLines as DrawRequestLine[],
      (budgets || []) as Budget[],
      { supabase: supabaseAdmin }
    )

    // Classify the result
    const classification = classifyMatchResult(candidates)

    // Store candidate count
    await supabaseAdmin
      .from('invoices')
      .update({ candidate_count: candidates.length })
      .eq('id', invoiceId)

    // Handle based on classification
    let matchResult: {
      status: string
      matchedLineId?: string
      confidence?: number
      needsReview: boolean
      aiUsed: boolean
    }

    switch (classification.status) {
      case 'SINGLE_MATCH':
        // Auto-apply the match
        matchResult = await applyMatch(
          invoiceId,
          existingInvoice,
          extractedData,
          classification.topCandidate!,
          classification,
          'auto_single',
          n8nExecutionId
        )
        break

      case 'MULTIPLE_CANDIDATES':
        // Trigger AI disambiguation workflow
        matchResult = await triggerDisambiguation(
          invoiceId,
          extractedData,
          classification,
          n8nExecutionId
        )
        break

      case 'AMBIGUOUS':
      case 'NO_CANDIDATES':
      default:
        matchResult = await flagForReview(
          invoiceId,
          classification,
          classification.status.toLowerCase(),
          n8nExecutionId
        )
        break
    }

    // Reconcile NO_INVOICE flags across the draw
    await reconcileNoInvoiceFlags(drawRequestId)

    return NextResponse.json({
      success: true,
      invoiceId,
      ...matchResult,
      candidateCount: candidates.length,
      classification: classification.status,
    })
  } catch (error: any) {
    console.error('Process callback error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Apply a match to an invoice and draw line
 */
async function applyMatch(
  invoiceId: string,
  invoice: any,
  extractedData: ExtractedInvoiceData,
  candidate: MatchCandidate,
  classification: MatchClassificationResult,
  decisionType: 'auto_single' | 'ai_selected',
  n8nExecutionId?: string | null
): Promise<{ status: string; matchedLineId: string; confidence: number; needsReview: boolean; aiUsed: boolean }> {
  const now = new Date().toISOString()

  // Update invoice
  await supabaseAdmin
    .from('invoices')
    .update({
      match_status: decisionType === 'auto_single' ? 'auto_matched' : 'ai_matched',
      matched_to_category: candidate.budgetCategory,
      matched_to_nahb_code: candidate.nahbCategory,
      draw_request_line_id: candidate.drawLineId,
      confidence_score: candidate.scores.composite,
      flags: JSON.stringify({
        status_detail: decisionType,
        confidence: candidate.scores.composite,
        n8n_execution_id: n8nExecutionId,
        completed_at: now,
        candidates_considered: classification.candidates.length,
      }),
      updated_at: now,
    })
    .eq('id', invoiceId)

  // Update draw line
  const variance = extractedData.amount - candidate.amountRequested
  const variancePct = Math.abs(variance) / candidate.amountRequested

  // Build flags
  const flags: string[] = []
  if (variancePct > 0.10) flags.push('AMOUNT_MISMATCH')
  if (candidate.scores.composite < 0.7) flags.push('LOW_CONFIDENCE')

  const invoiceFileName = invoice.file_path?.split('/').pop() || null

  await supabaseAdmin
    .from('draw_request_lines')
    .update({
      invoice_file_id: invoiceId,
      invoice_file_url: invoice.file_url,
      invoice_file_name: invoiceFileName,
      invoice_vendor_name: extractedData.vendorName,
      invoice_number: extractedData.invoiceNumber,
      invoice_date: extractedData.invoiceDate,
      matched_invoice_amount: extractedData.amount,
      confidence_score: candidate.scores.composite,
      variance,
      flags: flags.length > 0 ? JSON.stringify(flags) : null,
    })
    .eq('id', candidate.drawLineId)

  // Record decision in audit trail
  await supabaseAdmin.from('invoice_match_decisions').insert({
    invoice_id: invoiceId,
    draw_request_line_id: candidate.drawLineId,
    decision_type: decisionType,
    decision_source: decisionType === 'auto_single' ? 'system' : 'ai',
    candidates: classification.candidates as unknown as Json,
    selected_draw_line_id: candidate.drawLineId,
    selected_confidence: candidate.scores.composite,
    selection_factors: candidate.scores as unknown as Json,
    flags: flags as unknown as Json,
    decided_at: now,
  })

  return {
    status: decisionType === 'auto_single' ? 'auto_matched' : 'ai_matched',
    matchedLineId: candidate.drawLineId,
    confidence: candidate.scores.composite,
    needsReview: false,
    aiUsed: decisionType === 'ai_selected',
  }
}

/**
 * Flag an invoice for manual review
 */
async function flagForReview(
  invoiceId: string,
  classification: MatchClassificationResult,
  reason: string,
  n8nExecutionId?: string | null
): Promise<{ status: string; needsReview: boolean; aiUsed: boolean }> {
  const now = new Date().toISOString()

  await supabaseAdmin
    .from('invoices')
    .update({
      match_status: 'needs_review',
      confidence_score: classification.topCandidate?.scores.composite || 0,
      flags: JSON.stringify({
        status_detail: reason,
        confidence: classification.topCandidate?.scores.composite || 0,
        n8n_execution_id: n8nExecutionId,
        completed_at: now,
        candidates_considered: classification.candidates.length,
        top_candidates: classification.candidates.slice(0, 3).map(c => ({
          category: c.budgetCategory,
          score: c.scores.composite,
          amountVariance: c.factors.amountVariance,
        })),
      }),
      updated_at: now,
    })
    .eq('id', invoiceId)

  // Record decision (no selection made)
  await supabaseAdmin.from('invoice_match_decisions').insert({
    invoice_id: invoiceId,
    decision_type: 'manual_initial',
    decision_source: 'system',
    candidates: classification.candidates as unknown as Json,
    selected_draw_line_id: null,
    selected_confidence: null,
    flags: ['NEEDS_REVIEW'] as unknown as Json,
    decided_at: now,
  })

  return {
    status: 'needs_review',
    needsReview: true,
    aiUsed: false,
  }
}

/**
 * Trigger AI disambiguation for multiple candidates
 */
async function triggerDisambiguation(
  invoiceId: string,
  extractedData: ExtractedInvoiceData,
  classification: MatchClassificationResult,
  n8nExecutionId?: string | null
): Promise<{ status: string; needsReview: boolean; aiUsed: boolean }> {
  const now = new Date().toISOString()

  // Build callback URL - use VERCEL_URL for preview deployments
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'https://td3.vercel.app'
  const callbackUrl = `${baseUrl}/api/invoices/disambiguate-callback`

  // Prepare payload for n8n
  const payload = {
    invoiceId,
    callbackUrl,
    extractedData: {
      vendorName: extractedData.vendorName,
      amount: extractedData.amount,
      context: extractedData.context,
      keywords: extractedData.keywords,
      trade: extractedData.trade,
      workType: extractedData.workType,
      vendorType: extractedData.vendorType,
    },
    candidates: classification.candidates.slice(0, 5).map(c => ({
      drawLineId: c.drawLineId,
      budgetId: c.budgetId,
      budgetCategory: c.budgetCategory,
      nahbCategory: c.nahbCategory,
      amountRequested: c.amountRequested,
      scores: c.scores,
      factors: c.factors,
    })),
  }

  // Update invoice to show disambiguation in progress
  await supabaseAdmin
    .from('invoices')
    .update({
      match_status: 'ai_processing',
      flags: JSON.stringify({
        status_detail: 'disambiguation_in_progress',
        candidates_count: classification.candidates.length,
        n8n_execution_id: n8nExecutionId,
        disambiguation_started_at: now,
      }),
      updated_at: now,
    })
    .eq('id', invoiceId)

  // Trigger the disambiguation workflow
  const result = await triggerInvoiceDisambiguation(payload)

  if (!result.success) {
    // If webhook fails, fall back to flagging for review
    console.warn('Disambiguation webhook failed, flagging for review:', result.message)

    await supabaseAdmin
      .from('invoices')
      .update({
        match_status: 'needs_review',
        flags: JSON.stringify({
          status_detail: 'disambiguation_webhook_failed',
          error: result.message,
          candidates_count: classification.candidates.length,
          n8n_execution_id: n8nExecutionId,
          completed_at: now,
        }),
        updated_at: now,
      })
      .eq('id', invoiceId)

    return {
      status: 'needs_review',
      needsReview: true,
      aiUsed: false,
    }
  }

  // Return status indicating AI is processing
  // The actual match will be applied when the disambiguation callback is received
  return {
    status: 'ai_processing',
    needsReview: false,
    aiUsed: true,
  }
}

