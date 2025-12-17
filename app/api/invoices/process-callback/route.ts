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
    
    // If processing failed, update status to 'error'
    if (!success) {
      const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({
          status: 'error',
          flags: error || 'Processing failed',
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
      
      updateData.flags = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
      
      // Set status based on confidence
      if (matching.confidenceScore >= 0.9) {
        updateData.status = 'matched'
      } else if (matching.confidenceScore >= 0.7) {
        updateData.status = 'review' // Needs human review
      } else if (matching.confidenceScore >= 0.5) {
        updateData.status = 'low_confidence'
      } else {
        updateData.status = 'unmatched'
      }
    } else {
      updateData.status = 'extracted' // Data extracted but not matched
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
      // Get the draw line to calculate variance
      const { data: drawLine } = await supabaseAdmin
        .from('draw_request_lines')
        .select('amount_requested')
        .eq('id', matching.matchedDrawLineId)
        .single()
      
      // Calculate variance between requested amount and invoice amount
      const variance = drawLine?.amount_requested 
        ? extractedData.amount - drawLine.amount_requested 
        : null
      
      const { error: lineUpdateError } = await supabaseAdmin
        .from('draw_request_lines')
        .update({
          invoice_file_id: invoiceId,
          invoice_vendor_name: extractedData.vendorName,
          invoice_number: extractedData.invoiceNumber,
          invoice_date: extractedData.invoiceDate,
          matched_invoice_amount: extractedData.amount,
          confidence_score: matching.confidenceScore,
          variance,
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

