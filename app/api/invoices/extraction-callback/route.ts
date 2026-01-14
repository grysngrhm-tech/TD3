import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  generateMatchCandidates,
  classifyMatchResult,
  normalizeVendorName,
} from '@/lib/invoiceMatching'
import type {
  ExtractedInvoiceData,
  MatchCandidate,
  MatchClassificationResult,
} from '@/types/database'

/**
 * Extraction Callback API
 *
 * Called by n8n after AI extraction completes.
 * Flow:
 * 1. Store extracted data in invoice record
 * 2. Run deterministic candidate generation
 * 3. Classify result (SINGLE_MATCH, MULTIPLE_CANDIDATES, AMBIGUOUS, NO_CANDIDATES)
 * 4. For SINGLE_MATCH: auto-apply match
 * 5. For MULTIPLE_CANDIDATES: call AI selection (if enabled)
 * 6. For AMBIGUOUS/NO_CANDIDATES: flag for manual review
 */

// Payload from n8n extraction workflow
interface ExtractionCallbackPayload {
  invoiceId: string
  n8nExecutionId?: string
  success: boolean
  error?: string
  extractedData?: ExtractedInvoiceData
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const expectedSecret = process.env.N8N_CALLBACK_SECRET
    if (expectedSecret) {
      const provided = request.headers.get('x-td3-webhook-secret')
      if (!provided || provided !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body: ExtractionCallbackPayload = await request.json()
    const { invoiceId, n8nExecutionId, success, error, extractedData } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
    }

    // Get existing invoice
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*, draw_request_id, project_id')
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
        extracted_data: extractedData as any,
        updated_at: now,
      })
      .eq('id', invoiceId)

    // Get draw lines and budgets for matching
    const { data: drawLines } = await supabaseAdmin
      .from('draw_request_lines')
      .select('*')
      .eq('draw_request_id', existingInvoice.draw_request_id)

    const { data: budgets } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .eq('project_id', existingInvoice.project_id)

    if (!drawLines || drawLines.length === 0) {
      // No draw lines to match against
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

    // Generate candidates using deterministic matching
    const candidates = await generateMatchCandidates(
      extractedData,
      drawLines,
      budgets || [],
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
        // For now, flag for review. AI selection can be added later.
        // TODO: Implement AI selection for ambiguous cases
        matchResult = await flagForReview(
          invoiceId,
          classification,
          'multiple_candidates',
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
    await reconcileNoInvoiceFlags(existingInvoice.draw_request_id)

    return NextResponse.json({
      success: true,
      invoiceId,
      ...matchResult,
      candidateCount: candidates.length,
      classification: classification.status,
    })
  } catch (error: any) {
    console.error('Extraction callback error:', error)
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
  n8nExecutionId?: string
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

  await supabaseAdmin
    .from('draw_request_lines')
    .update({
      invoice_file_id: invoiceId,
      invoice_file_url: invoice.file_url,
      invoice_file_name: invoice.file_path?.split('/').pop() || null,
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
    candidates: classification.candidates as any,
    selected_draw_line_id: candidate.drawLineId,
    selected_confidence: candidate.scores.composite,
    selection_factors: candidate.scores as any,
    flags,
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
  n8nExecutionId?: string
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
    candidates: classification.candidates as any,
    selected_draw_line_id: null,
    selected_confidence: null,
    flags: ['NEEDS_REVIEW'],
    decided_at: now,
  })

  return {
    status: 'needs_review',
    needsReview: true,
    aiUsed: false,
  }
}

/**
 * Reconcile NO_INVOICE flags across all draw lines
 */
async function reconcileNoInvoiceFlags(drawRequestId: string) {
  // Get all lines and their invoice status
  const { data: lines } = await supabaseAdmin
    .from('draw_request_lines')
    .select('id, amount_requested, invoice_file_id, matched_invoice_amount, flags')
    .eq('draw_request_id', drawRequestId)

  if (!lines) return

  // Check if draw has any invoices
  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('draw_request_id', drawRequestId)

  const hasAnyInvoices = (invoices?.length || 0) > 0

  // Only flag lines if the draw has at least one invoice
  if (!hasAnyInvoices) return

  for (const line of lines) {
    const hasInvoice = !!line.invoice_file_id || !!line.matched_invoice_amount
    const needsInvoice = (line.amount_requested || 0) > 0 && !hasInvoice

    let currentFlags: string[] = []
    try {
      currentFlags = line.flags ? JSON.parse(line.flags) : []
      if (!Array.isArray(currentFlags)) currentFlags = []
    } catch {
      currentFlags = []
    }

    const flagSet = new Set(currentFlags)
    const hadNoInvoice = flagSet.has('NO_INVOICE')

    if (needsInvoice && !hadNoInvoice) {
      flagSet.add('NO_INVOICE')
    } else if (!needsInvoice && hadNoInvoice) {
      flagSet.delete('NO_INVOICE')
    } else {
      continue // No change needed
    }

    await supabaseAdmin
      .from('draw_request_lines')
      .update({
        flags: flagSet.size > 0 ? JSON.stringify([...flagSet]) : null,
      })
      .eq('id', line.id)
  }
}
