import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Payload from n8n after processing invoice
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
  }
  matching?: {
    matchedCategory: string | null
    matchedNahbCode: string | null
    matchedDrawLineId: string | null
    confidenceScore: number
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
      updateData.flags = matching.flags?.length > 0 ? JSON.stringify(matching.flags) : null
      
      // Set status based on confidence
      if (matching.confidenceScore >= 0.9) {
        updateData.status = 'matched'
      } else if (matching.confidenceScore >= 0.7) {
        updateData.status = 'review' // Needs human review
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
      const { error: lineUpdateError } = await supabaseAdmin
        .from('draw_request_lines')
        .update({
          invoice_file_id: invoiceId,
          invoice_vendor_name: extractedData.vendorName,
          invoice_number: extractedData.invoiceNumber,
          invoice_date: extractedData.invoiceDate,
          matched_invoice_amount: extractedData.amount,
          confidence_score: matching.confidenceScore,
          variance: null // Will be calculated on the frontend or in a separate step
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

