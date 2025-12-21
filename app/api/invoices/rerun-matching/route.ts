import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { triggerInvoiceProcess, InvoiceProcessPayload } from '@/lib/n8n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { drawRequestId, projectId } = body
    
    if (!drawRequestId) {
      return NextResponse.json(
        { error: 'Missing drawRequestId' },
        { status: 400 }
      )
    }
    
    // Fetch all invoices for this draw request
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id, file_url, file_path')
      .eq('draw_request_id', drawRequestId) as { data: { id: string; file_url: string | null; file_path: string | null }[] | null; error: any }
    
    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invoices to process',
        processedCount: 0
      })
    }
    
    // Fetch context data for AI matching (budgets, draw lines, project info)
    const [projectResult, budgetsResult, drawLinesResult] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('project_code')
        .eq('id', projectId)
        .single(),
      supabaseAdmin
        .from('budgets')
        .select('id, category, nahb_category, current_amount, spent_amount')
        .eq('project_id', projectId),
      supabaseAdmin
        .from('draw_request_lines')
        .select('id, budget_id, amount_requested, budgets(category)')
        .eq('draw_request_id', drawRequestId)
    ])
    
    const projectCode = projectResult.data?.project_code || null
    const budgets = budgetsResult.data || []
    const drawLines = drawLinesResult.data || []
    
    // Format budget categories for n8n
    const budgetCategories = budgets.map((b: any) => ({
      id: b.id,
      category: b.category,
      nahbCategory: b.nahb_category,
      // Canonical schema: current_amount/spent_amount (+ generated remaining_amount)
      budgetAmount: b.current_amount || 0,
      drawnToDate: b.spent_amount || 0,
      remaining: (b.current_amount || 0) - (b.spent_amount || 0)
    }))
    
    // Format draw lines for n8n
    const formattedDrawLines = drawLines.map((line: any) => ({
      id: line.id,
      budgetId: line.budget_id,
      budgetCategory: line.budgets?.category || null,
      amountRequested: line.amount_requested || 0
    }))
    
    // Reset invoices to pending status before re-processing
    const processingStartedAt = new Date().toISOString()
    await supabaseAdmin
      .from('invoices')
      .update({ 
        status: 'pending', 
        flags: JSON.stringify({ status_detail: 'processing', processing_started_at: processingStartedAt }),
        confidence_score: null,
        matched_to_category: null,
        matched_to_nahb_code: null
      })
      .eq('draw_request_id', drawRequestId)
    
    // Trigger n8n workflow for each invoice
    let processedCount = 0
    let errorCount = 0
    
    for (const invoice of invoices) {
      try {
        // Generate signed URL for the invoice file
        let fileUrl = invoice.file_url
        
        if (invoice.file_path) {
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('documents')
            .createSignedUrl(invoice.file_path, 3600) // 1 hour expiry
          
          if (signedUrlError) {
            console.error(`Error generating signed URL for invoice ${invoice.id}:`, signedUrlError)
          } else if (signedUrlData?.signedUrl) {
            fileUrl = signedUrlData.signedUrl
          }
        }
        
        // Skip invoices without valid file URLs
        if (!fileUrl) {
          console.warn(`Invoice ${invoice.id} has no valid file URL, skipping`)
          // Update invoice with error status
          await supabaseAdmin
            .from('invoices')
            .update({ 
              status: 'rejected',
              flags: JSON.stringify({ status_detail: 'error', error: 'No file URL available' })
            })
            .eq('id', invoice.id)
          errorCount++
          continue
        }
        
        // Get the base URL for callback (use Vercel URL or fallback)
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : process.env.NEXT_PUBLIC_APP_URL || 'https://td3.vercel.app'
        
        const payload: InvoiceProcessPayload = {
          invoiceId: invoice.id,
          fileUrl,
          fileName: invoice.file_path?.split('/').pop() || 'invoice.pdf',
          drawRequestId,
          projectId,
          projectCode,
          callbackUrl: `${baseUrl}/api/invoices/process-callback`,
          budgetCategories,
          drawLines: formattedDrawLines
        }
        
        console.log(`Triggering processing for invoice ${invoice.id} with fileUrl: ${fileUrl.substring(0, 50)}...`)
        
        // Fire and forget - trigger processing
        triggerInvoiceProcess(payload).then(result => {
          if (!result.success) {
            console.warn(`Invoice ${invoice.id} processing trigger failed:`, result.message)
            // Mark as error so UI doesn't show "processing" forever.
            supabaseAdmin
              .from('invoices')
              .update({
                status: 'pending',
                flags: JSON.stringify({ status_detail: 'error', error: result.message, processing_started_at: processingStartedAt })
              })
              .eq('id', invoice.id)
              .then(() => {})
          }
        })
        
        processedCount++
      } catch (err) {
        console.error(`Error triggering processing for invoice ${invoice.id}:`, err)
        errorCount++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Re-processing ${processedCount} invoices`,
      processedCount,
      errorCount,
      totalInvoices: invoices.length
    })
    
  } catch (error: any) {
    console.error('Rerun matching API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
