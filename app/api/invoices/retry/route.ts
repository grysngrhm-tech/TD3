import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { triggerInvoiceProcess, InvoiceProcessPayload } from '@/lib/n8n'

/**
 * POST /api/invoices/retry
 * Re-trigger invoice processing for stuck invoices
 *
 * Body: { invoiceId: string } or { drawRequestId: string } (for all invoices in draw)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, drawRequestId } = body

    if (!invoiceId && !drawRequestId) {
      return NextResponse.json(
        { error: 'Missing invoiceId or drawRequestId' },
        { status: 400 }
      )
    }

    // Get invoices to retry
    let query = supabaseAdmin
      .from('invoices')
      .select('id, project_id, draw_request_id, file_url, file_path')

    if (invoiceId) {
      query = query.eq('id', invoiceId)
    } else if (drawRequestId) {
      query = query.eq('draw_request_id', drawRequestId)
    }

    const { data: invoices, error: fetchError } = await query

    if (fetchError || !invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found to retry' },
        { status: 404 }
      )
    }

    const results = []

    for (const invoice of invoices) {
      const projectId = invoice.project_id
      const drawReqId = invoice.draw_request_id

      if (!projectId || !drawReqId) {
        results.push({ id: invoice.id, success: false, error: 'Missing project or draw request' })
        continue
      }

      // Fetch context data for AI matching
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
          .eq('draw_request_id', drawReqId)
      ])

      const projectCode = projectResult.data?.project_code || null
      const budgets = budgetsResult.data || []
      const drawLines = drawLinesResult.data || []

      // Format budget categories for n8n
      const budgetCategories = budgets.map(b => ({
        id: b.id,
        category: b.category,
        nahbCategory: b.nahb_category,
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

      // Generate new signed URL for secure file access
      const filePath = invoice.file_path
      let fileUrlForProcessing = invoice.file_url

      if (filePath) {
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('documents')
          .createSignedUrl(filePath, 3600)

        if (!signedUrlError && signedUrlData) {
          fileUrlForProcessing = signedUrlData.signedUrl
        }
      }

      // Get the base URL for callback
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || 'https://td3.vercel.app'

      const payload: InvoiceProcessPayload = {
        invoiceId: invoice.id,
        fileUrl: fileUrlForProcessing || '',
        fileName: filePath?.split('/').pop() || 'invoice.pdf',
        drawRequestId: drawReqId,
        projectId,
        projectCode,
        callbackUrl: `${baseUrl}/api/invoices/process-callback`,
        budgetCategories,
        drawLines: formattedDrawLines
      }

      // Reset invoice status
      await supabaseAdmin
        .from('invoices')
        .update({
          vendor_name: 'Processing...',
          extraction_status: 'pending',
          match_status: 'pending',
          extracted_data: null,
          flags: JSON.stringify({ status_detail: 'retry', retry_started_at: new Date().toISOString() }),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      // Trigger n8n
      const triggerResult = await triggerInvoiceProcess(payload)

      results.push({
        id: invoice.id,
        success: triggerResult.success,
        message: triggerResult.message,
        callbackUrl: payload.callbackUrl
      })
    }

    return NextResponse.json({
      success: true,
      retriedCount: results.length,
      results
    })

  } catch (error: any) {
    console.error('Invoice retry error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
