import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Payload from n8n after processing invoice (two-stage: extraction + matching)
type InvoiceProcessResult = {
  invoiceId: string
  success: boolean
  error?: string
  extractedData?: {
    vendorName: string
    invoiceNumber: string | null
    invoiceDate: string | null
    amount: number
    lineItems?: Array<{
      description: string
      amount: number
    }>
    // Additional fields from two-stage processing
    constructionCategory?: string | null  // AI's guess of category
    projectReference?: string | null      // Project code found in invoice
  }
  matching?: {
    matchedCategory: string | null
    matchedNahbCode: string | null
    matchedDrawLineId: string | null
    matchedBudgetId?: string | null       // Direct budget reference
    confidenceScore: number
    matchReasoning?: string               // Explanation of match
    flags: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: InvoiceProcessResult = await request.json()
    
    const { invoiceId, success, error, extractedData, matching } = body
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing invoiceId' },
        { status: 400 }
      )
    }
    
    // If processing failed, update status to 'rejected' (DB only allows: pending, matched, rejected)
    if (!success) {
      const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({
          status: 'rejected',
          flags: JSON.stringify({ error: error || 'Processing failed', status_detail: 'error' }),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
      
      if (updateError) {
        console.error('Failed to update invoice error status:', updateError)
      }
      
      return NextResponse.json({
        success: false,
        message: error || 'Processing failed'
      })
    }
    
    // Update invoice with extracted data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    
    if (extractedData) {
      updateData.vendor_name = extractedData.vendorName || 'Unknown Vendor'
      updateData.amount = extractedData.amount || 0
      updateData.invoice_number = extractedData.invoiceNumber
      updateData.invoice_date = extractedData.invoiceDate
    }
    
    if (matching) {
      updateData.matched_to_category = matching.matchedCategory
      updateData.matched_to_nahb_code = matching.matchedNahbCode
      updateData.draw_request_line_id = matching.matchedDrawLineId
      updateData.confidence_score = matching.confidenceScore
      
      // Store flags and reasoning as JSON
      const metadata: Record<string, any> = {}
      if (matching.flags?.length > 0) metadata.flags = matching.flags
      if (matching.matchReasoning) metadata.reasoning = matching.matchReasoning
      if (extractedData?.constructionCategory) metadata.constructionCategory = extractedData.constructionCategory
      if (extractedData?.lineItems) metadata.lineItems = extractedData.lineItems
      
      // Set status based on confidence
      // DB constraint only allows: 'pending', 'matched', 'rejected'
      // Use flags field to store detailed status
      if (matching.confidenceScore >= 0.7) {
        updateData.status = 'matched'
        metadata.status_detail = matching.confidenceScore >= 0.9 ? 'high_confidence' : 'needs_review'
      } else {
        updateData.status = 'pending' // Low confidence = needs manual review
        metadata.status_detail = matching.confidenceScore >= 0.5 ? 'low_confidence' : 'unmatched'
      }
      
      // Update flags with metadata
      updateData.flags = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
    } else {
      updateData.status = 'pending' // Data extracted but not matched
      updateData.flags = JSON.stringify({ status_detail: 'extracted' })
    }
    
    // Update the invoice record
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
    
    if (updateError) {
      console.error('Failed to update invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }
    
    // If we have a matched draw line, update it with invoice info
    if (matching?.matchedDrawLineId && extractedData) {
      // Fetch invoice (for file URL/name) and draw line (for variance + flags merge)
      const [{ data: invoiceRow }, { data: drawLine }] = await Promise.all([
        supabaseAdmin
          .from('invoices')
          .select('file_url, file_path')
          .eq('id', invoiceId)
          .maybeSingle(),
        supabaseAdmin
          .from('draw_request_lines')
          .select('amount_requested, flags')
          .eq('id', matching.matchedDrawLineId)
          .single()
      ])

      const parseLineFlags = (flagsStr: string | null): string[] => {
        if (!flagsStr) return []
        try {
          const parsed = JSON.parse(flagsStr)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          // Backwards compatibility for old comma-separated storage
          return flagsStr.split(',').map(s => s.trim()).filter(Boolean)
        }
      }

      const existingFlags = parseLineFlags(drawLine?.flags ?? null)
      
      // Calculate variance between requested amount and invoice amount
      const variance = drawLine?.amount_requested 
        ? extractedData.amount - drawLine.amount_requested 
        : null

      // Merge flags:
      // - remove NO_INVOICE now that we have an attached invoice
      // - add any matching-provided flags + computed flags for confidence/variance
      const merged = new Set<string>(existingFlags.filter(f => f !== 'NO_INVOICE'))
      for (const f of (matching.flags || [])) merged.add(f)
      if (matching.confidenceScore < 0.7) merged.add('LOW_CONFIDENCE')

      // If the invoice total is materially different from requested, flag it.
      if (drawLine?.amount_requested && drawLine.amount_requested > 0) {
        const pct = Math.abs(extractedData.amount - drawLine.amount_requested) / drawLine.amount_requested
        if (pct > 0.10) merged.add('AMOUNT_MISMATCH')
      }

      const mergedFlags = Array.from(merged)
      const invoiceFileName =
        invoiceRow?.file_path ? invoiceRow.file_path.split('/').pop() || null : null
      
      const { error: lineUpdateError } = await supabaseAdmin
        .from('draw_request_lines')
        .update({
          invoice_file_id: invoiceId,
          invoice_file_url: invoiceRow?.file_url || null,
          invoice_file_name: invoiceFileName,
          invoice_vendor_name: extractedData.vendorName,
          invoice_number: extractedData.invoiceNumber,
          invoice_date: extractedData.invoiceDate,
          matched_invoice_amount: extractedData.amount,
          confidence_score: matching.confidenceScore,
          variance,
          flags: mergedFlags.length > 0 ? JSON.stringify(mergedFlags) : null,
          // Also set budget_id if matching provided it
          ...(matching.matchedBudgetId && { budget_id: matching.matchedBudgetId })
        })
        .eq('id', matching.matchedDrawLineId)
      
      if (lineUpdateError) {
        console.warn('Failed to update draw line with invoice:', lineUpdateError)
      }
    }
    
    return NextResponse.json({
      success: true,
      invoiceId,
      status: updateData.status
    })
    
  } catch (error: any) {
    console.error('Process callback error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

