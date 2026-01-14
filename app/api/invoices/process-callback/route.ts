import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type {
  ExtractedInvoiceData,
  MatchCandidate,
  MatchStatus,
  Budget,
  DrawRequestLine,
} from '@/types/database'
import {
  generateMatchCandidates,
  classifyMatchResult,
} from '@/lib/invoiceMatching'

// Payload from n8n after extraction (extraction-only, no matching)
type ExtractionCallbackPayload = {
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
    // Verify callbacks are actually from our n8n instance
    const expectedSecret = process.env.N8N_CALLBACK_SECRET
    if (expectedSecret) {
      const provided = request.headers.get('x-td3-webhook-secret')
      if (!provided || provided !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body: ExtractionCallbackPayload = await request.json()
    const { invoiceId, n8nExecutionId, success, error, extractedData, metadata } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
    }

    // If extraction failed, update status and return
    if (!success) {
      await supabaseAdmin
        .from('invoices')
        .update({
          extraction_status: 'extraction_failed',
          match_status: 'no_match',
          updated_at: new Date().toISOString(),
          flags: JSON.stringify({
            error: error || 'Extraction failed',
            n8n_execution_id: n8nExecutionId,
            failed_at: new Date().toISOString(),
          }),
        })
        .eq('id', invoiceId)

      return NextResponse.json({
        success: false,
        message: error || 'Extraction failed',
      })
    }

    if (!extractedData) {
      return NextResponse.json({
        success: false,
        message: 'No extracted data in successful response',
      }, { status: 400 })
    }

    // Step 1: Store extracted data
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, draw_request_id, file_url, file_path')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Update invoice with extracted data
    await supabaseAdmin
      .from('invoices')
      .update({
        vendor_name: extractedData.vendorName || 'Unknown Vendor',
        amount: extractedData.amount || 0,
        invoice_number: extractedData.invoiceNumber,
        invoice_date: extractedData.invoiceDate,
        extraction_status: 'extracted',
        extracted_data: extractedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    // Step 2: Get draw request lines and budgets for matching
    const drawRequestId = invoice.draw_request_id || metadata?.drawRequestId
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

    // Fetch draw lines
    const { data: drawLines } = await supabaseAdmin
      .from('draw_request_lines')
      .select('*')
      .eq('draw_request_id', drawRequestId)

    if (!drawLines || drawLines.length === 0) {
      await supabaseAdmin
        .from('invoices')
        .update({ match_status: 'no_match' })
        .eq('id', invoiceId)

      return NextResponse.json({
        success: true,
        invoiceId,
        status: 'no_match',
        message: 'No draw lines to match against',
      })
    }

    // Fetch budgets for matching
    const budgetIds = [...new Set(drawLines.map(l => l.budget_id).filter(Boolean))]
    const { data: budgets } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .in('id', budgetIds)

    // Step 3: Run deterministic matching
    const candidates = await generateMatchCandidates(
      extractedData,
      drawLines as DrawRequestLine[],
      (budgets || []) as Budget[],
      { supabase: supabaseAdmin }
    )

    const classification = classifyMatchResult(candidates)

    // Step 4: Apply match result based on classification
    let matchStatus: MatchStatus = 'pending'
    let matchedDrawLineId: string | null = null
    let decisionType: string | null = null

    if (classification.status === 'SINGLE_MATCH' && classification.topCandidate) {
      // Auto-apply high-confidence single match
      matchStatus = 'auto_matched'
      matchedDrawLineId = classification.topCandidate.drawLineId
      decisionType = 'auto_single'

      // Record decision in audit trail
      await supabaseAdmin.from('invoice_match_decisions').insert({
        invoice_id: invoiceId,
        draw_request_line_id: matchedDrawLineId,
        decision_type: 'auto_single',
        decision_source: 'system',
        candidates: candidates,
        selected_draw_line_id: matchedDrawLineId,
        selected_confidence: classification.topCandidate.scores.composite,
        selection_factors: classification.topCandidate.scores,
        flags: [],
      })

    } else if (classification.status === 'MULTIPLE_CANDIDATES') {
      // Multiple candidates - needs AI selection (will be handled separately)
      matchStatus = 'needs_review' // For now, flag for review until AI selection is implemented
      decisionType = 'needs_ai_selection'

      // Record candidates for later AI selection
      await supabaseAdmin.from('invoice_match_decisions').insert({
        invoice_id: invoiceId,
        decision_type: 'auto_single', // Will be updated when AI selects
        decision_source: 'system',
        candidates: candidates.slice(0, 5),
        selected_draw_line_id: null,
        selected_confidence: null,
        flags: ['MULTIPLE_CANDIDATES'],
      })

    } else if (classification.status === 'NO_CANDIDATES') {
      matchStatus = 'no_match'
    } else {
      // AMBIGUOUS - needs human review
      matchStatus = 'needs_review'
    }

    // Step 5: Update invoice with match result
    await supabaseAdmin
      .from('invoices')
      .update({
        match_status: matchStatus,
        draw_request_line_id: matchedDrawLineId,
        matched_to_category: classification.topCandidate?.budgetCategory || null,
        matched_to_nahb_code: classification.topCandidate?.nahbCategory || null,
        confidence_score: classification.topCandidate?.scores.composite || null,
        candidate_count: candidates.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    // Step 6: If we have a match, update the draw line
    if (matchedDrawLineId && classification.topCandidate) {
      const topCandidate = classification.topCandidate
      const invoiceFileName = invoice.file_path?.split('/').pop() || null

      // Parse existing flags
      const { data: drawLine } = await supabaseAdmin
        .from('draw_request_lines')
        .select('flags')
        .eq('id', matchedDrawLineId)
        .single()

      const parseLineFlags = (flagsStr: string | null): string[] => {
        if (!flagsStr) return []
        try {
          const parsed = JSON.parse(flagsStr)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return flagsStr.split(',').map(s => s.trim()).filter(Boolean)
        }
      }

      const existingFlags = parseLineFlags(drawLine?.flags ?? null)
      const mergedFlags = new Set<string>(existingFlags.filter(f => f !== 'NO_INVOICE'))

      // Add flags based on matching result
      if (topCandidate.factors.amountVariance > 0.10) {
        mergedFlags.add('AMOUNT_MISMATCH')
      }
      if (topCandidate.scores.composite < 0.7) {
        mergedFlags.add('LOW_CONFIDENCE')
      }

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
          confidence_score: topCandidate.scores.composite,
          variance: extractedData.amount - topCandidate.amountRequested,
          flags: mergedFlags.size > 0 ? JSON.stringify(Array.from(mergedFlags)) : null,
        })
        .eq('id', matchedDrawLineId)
    }

    // Step 7: Update NO_INVOICE flags on unmatched lines
    await updateNoInvoiceFlags(drawRequestId)

    return NextResponse.json({
      success: true,
      invoiceId,
      matchStatus,
      candidateCount: candidates.length,
      classification: classification.status,
      matchedDrawLineId,
      confidence: classification.topCandidate?.scores.composite || 0,
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
 * Update NO_INVOICE flags on draw lines
 * Lines with amount > 0 and no matched invoice should have NO_INVOICE flag
 */
async function updateNoInvoiceFlags(drawRequestId: string) {
  const parseLineFlags = (flagsStr: string | null): string[] => {
    if (!flagsStr) return []
    try {
      const parsed = JSON.parse(flagsStr)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return flagsStr.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  // Check if draw has any invoices
  const { data: invoiceCount } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('draw_request_id', drawRequestId)

  const hasAnyInvoices = (invoiceCount?.length || 0) > 0

  if (hasAnyInvoices) {
    const { data: allLines } = await supabaseAdmin
      .from('draw_request_lines')
      .select('id, amount_requested, invoice_file_id, matched_invoice_amount, flags')
      .eq('draw_request_id', drawRequestId)

    const updates = []
    for (const line of (allLines || [])) {
      const amountRequested = line.amount_requested || 0
      const hasInvoiceMatch = !!line.invoice_file_id || !!line.matched_invoice_amount
      const shouldFlagNoInvoice = amountRequested > 0 && !hasInvoiceMatch

      const currentFlags = parseLineFlags(line.flags ?? null)
      const next = new Set<string>(currentFlags)

      if (shouldFlagNoInvoice) next.add('NO_INVOICE')
      else next.delete('NO_INVOICE')

      const nextFlags = Array.from(next)
      const changed =
        currentFlags.length !== nextFlags.length ||
        currentFlags.some(f => !next.has(f)) ||
        nextFlags.some(f => !currentFlags.includes(f))

      if (changed) {
        updates.push({ id: line.id, flags: nextFlags.length > 0 ? JSON.stringify(nextFlags) : null })
      }
    }

    for (const u of updates) {
      await supabaseAdmin
        .from('draw_request_lines')
        .update({ flags: u.flags })
        .eq('id', u.id)
    }
  }
}
