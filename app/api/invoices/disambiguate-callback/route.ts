import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyWebhookSecret } from '@/lib/api-auth'
import { reconcileNoInvoiceFlags } from '@/lib/invoiceFlags'
import type { Json } from '@/types/database'

/**
 * Invoice Disambiguation Callback API
 *
 * Called by n8n after AI disambiguation completes.
 * This endpoint handles the result when multiple candidates scored similarly
 * and AI was used to select the best match.
 *
 * Flow:
 * 1. Verify webhook secret
 * 2. Validate the AI selection
 * 3. Apply the match to invoice and draw line
 * 4. Record decision in audit trail
 */

interface DisambiguationCallbackPayload {
  invoiceId: string
  n8nExecutionId?: string | null
  success: boolean
  error?: string
  disambiguation?: {
    selectedDrawLineId: string
    selectedCategory: string
    selectedBudgetId: string | null
    confidence: number
    reasoning: string
    factors: string[]
    originalScores?: {
      amount: number
      trade: number
      keywords: number
      training: number
      composite: number
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (fail-closed: rejects if env var is unset)
    const [, authError] = verifyWebhookSecret(request)
    if (authError) return authError

    const body: DisambiguationCallbackPayload = await request.json()
    const { invoiceId, n8nExecutionId, success, error, disambiguation } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Get existing invoice with extracted data
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Handle disambiguation failure
    if (!success || !disambiguation?.selectedDrawLineId) {
      await supabaseAdmin
        .from('invoices')
        .update({
          match_status: 'needs_review',
          flags: JSON.stringify({
            status_detail: 'ai_disambiguation_failed',
            error: error || 'AI could not select a match',
            n8n_execution_id: n8nExecutionId,
            completed_at: now,
          }),
          updated_at: now,
        })
        .eq('id', invoiceId)

      // Record failed decision in audit trail
      await supabaseAdmin.from('invoice_match_decisions').insert({
        invoice_id: invoiceId,
        decision_type: 'manual_initial',
        decision_source: 'ai',
        selected_draw_line_id: null,
        selected_confidence: null,
        ai_reasoning: error || 'AI disambiguation failed',
        flags: ['AI_DISAMBIGUATION_FAILED', 'NEEDS_REVIEW'] as unknown as Json,
        decided_at: now,
      })

      return NextResponse.json({
        success: false,
        invoiceId,
        status: 'needs_review',
        error: error || 'AI disambiguation failed',
      })
    }

    // Verify the selected draw line exists and belongs to this draw
    const { data: selectedLine, error: lineError } = await supabaseAdmin
      .from('draw_request_lines')
      .select('*')
      .eq('id', disambiguation.selectedDrawLineId)
      .single()

    if (lineError || !selectedLine) {
      return NextResponse.json({
        error: 'Selected draw line not found',
        selectedDrawLineId: disambiguation.selectedDrawLineId,
      }, { status: 400 })
    }

    // Get budget for the selected line
    let budgetNahbCategory: string | null = null
    if (selectedLine.budget_id) {
      const { data: budget } = await supabaseAdmin
        .from('budgets')
        .select('nahb_category')
        .eq('id', selectedLine.budget_id)
        .single()
      budgetNahbCategory = budget?.nahb_category || null
    }

    // Get extracted data from invoice
    const extractedData = (existingInvoice.extracted_data || {}) as Record<string, unknown>
    const invoiceAmount = (extractedData.amount as number) || existingInvoice.amount || 0
    const vendorName = (extractedData.vendorName as string) || existingInvoice.vendor_name || 'Unknown Vendor'

    // Calculate variance
    const requestedAmount = selectedLine.amount_requested || 0
    const variance = invoiceAmount - requestedAmount
    const variancePct = requestedAmount > 0 ? Math.abs(variance) / requestedAmount : 0

    // Build flags
    const flags: string[] = []
    if (variancePct > 0.10) flags.push('AMOUNT_MISMATCH')
    if (disambiguation.confidence < 0.7) flags.push('LOW_CONFIDENCE')

    // Update invoice with AI match
    await supabaseAdmin
      .from('invoices')
      .update({
        match_status: 'ai_matched',
        matched_to_category: disambiguation.selectedCategory,
        matched_to_nahb_code: budgetNahbCategory,
        draw_request_line_id: disambiguation.selectedDrawLineId,
        confidence_score: disambiguation.confidence,
        flags: JSON.stringify({
          status_detail: 'ai_selected',
          confidence: disambiguation.confidence,
          ai_reasoning: disambiguation.reasoning,
          ai_factors: disambiguation.factors,
          n8n_execution_id: n8nExecutionId,
          completed_at: now,
        }),
        updated_at: now,
      })
      .eq('id', invoiceId)

    // Update draw line with invoice data
    const invoiceFileName = existingInvoice.file_path?.split('/').pop() || null

    await supabaseAdmin
      .from('draw_request_lines')
      .update({
        invoice_file_id: invoiceId,
        invoice_file_url: existingInvoice.file_url,
        invoice_file_name: invoiceFileName,
        invoice_vendor_name: vendorName,
        invoice_number: (extractedData.invoiceNumber as string) || null,
        invoice_date: (extractedData.invoiceDate as string) || null,
        matched_invoice_amount: invoiceAmount,
        confidence_score: disambiguation.confidence,
        variance,
        flags: flags.length > 0 ? JSON.stringify(flags) : null,
      })
      .eq('id', disambiguation.selectedDrawLineId)

    // Record decision in audit trail
    await supabaseAdmin.from('invoice_match_decisions').insert({
      invoice_id: invoiceId,
      draw_request_line_id: disambiguation.selectedDrawLineId,
      decision_type: 'ai_selected',
      decision_source: 'ai',
      selected_draw_line_id: disambiguation.selectedDrawLineId,
      selected_confidence: disambiguation.confidence,
      selection_factors: disambiguation.originalScores as unknown as Json,
      ai_reasoning: disambiguation.reasoning,
      flags: flags as unknown as Json,
      decided_at: now,
    })

    // Reconcile NO_INVOICE flags
    if (existingInvoice.draw_request_id) {
      await reconcileNoInvoiceFlags(existingInvoice.draw_request_id)
    }

    return NextResponse.json({
      success: true,
      invoiceId,
      status: 'ai_matched',
      matchedLineId: disambiguation.selectedDrawLineId,
      matchedCategory: disambiguation.selectedCategory,
      confidence: disambiguation.confidence,
      reasoning: disambiguation.reasoning,
    })
  } catch (error: any) {
    console.error('Disambiguate callback error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

