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
        .select('id, category, nahb_category, budget_amount, drawn_to_date')
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
      budgetAmount: b.budget_amount || 0,
      drawnToDate: b.drawn_to_date || 0,
      remaining: (b.budget_amount || 0) - (b.drawn_to_date || 0)
    }))
    
    // Format draw lines for n8n
    const formattedDrawLines = drawLines.map((line: any) => ({
      id: line.id,
      budgetId: line.budget_id,
      budgetCategory: line.budgets?.category || null,
      amountRequested: line.amount_requested || 0
    }))
    
    // Reset invoices to pending status before re-processing
    await supabaseAdmin
      .from('invoices')
      .update({ 
        status: 'pending', 
        flags: 'PROCESSING',
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
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from('documents')
            .createSignedUrl(invoice.file_path, 3600) // 1 hour expiry
          
          if (signedUrlData?.signedUrl) {
            fileUrl = signedUrlData.signedUrl
          }
        }
        
        const payload: InvoiceProcessPayload = {
          invoiceId: invoice.id,
          fileUrl: fileUrl || '',
          fileName: invoice.file_path?.split('/').pop() || 'invoice.pdf',
          drawRequestId,
          projectId,
          projectCode,
          budgetCategories,
          drawLines: formattedDrawLines
        }
        
        // Fire and forget - trigger processing
        triggerInvoiceProcess(payload).then(result => {
          if (!result.success) {
            console.warn(`Invoice ${invoice.id} processing trigger failed:`, result.message)
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
