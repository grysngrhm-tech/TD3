import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { triggerInvoiceProcess, InvoiceProcessPayload } from '@/lib/n8n'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const projectId = formData.get('projectId') as string
    const drawRequestId = formData.get('drawRequestId') as string
    const files = formData.getAll('files') as File[]
    
    if (!projectId || !drawRequestId) {
      return NextResponse.json(
        { error: 'Missing projectId or drawRequestId' },
        { status: 400 }
      )
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
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
    const budgetCategories = budgets.map(b => ({
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
    
    const uploadedInvoices = []
    const errors = []
    
    for (const file of files) {
      try {
        // Generate unique file path
        const fileId = crypto.randomUUID()
        const filePath = `invoices/${projectId}/${drawRequestId}/${fileId}-${file.name}`
        
        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from('documents')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
          })
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          errors.push({ file: file.name, error: uploadError.message })
          continue
        }
        
        // Generate signed URL for secure access (valid for 1 hour)
        // This ensures n8n can download the file even if the bucket isn't public
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('documents')
          .createSignedUrl(filePath, 3600) // 1 hour expiry
        
        // Also get public URL for long-term storage reference
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('documents')
          .getPublicUrl(filePath)
        
        // Use signed URL for n8n processing, public URL for database storage
        const fileUrlForProcessing = signedUrlError ? publicUrlData.publicUrl : signedUrlData.signedUrl
        const fileUrlForStorage = publicUrlData.publicUrl
        
        // Create invoice record in database with 'pending' status
        // Note: DB constraint only allows 'pending', 'matched', 'rejected'
        const { data: invoice, error: insertError } = await supabaseAdmin
          .from('invoices')
          .insert({
            project_id: projectId,
            draw_request_id: drawRequestId,
            vendor_name: 'Processing...',
            amount: 0,
            file_path: filePath,
            file_url: fileUrlForStorage,
            status: 'pending',
            flags: 'PROCESSING'
          })
          .select()
          .single()
        
        if (insertError) {
          console.error('Database insert error:', insertError)
          errors.push({ file: file.name, error: insertError.message })
          // Try to clean up the uploaded file
          await supabaseAdmin.storage.from('documents').remove([filePath])
          continue
        }
        
        uploadedInvoices.push(invoice)
        
        // Trigger n8n workflow for AI processing (non-blocking)
        // Use signed URL for secure file access from n8n
        const payload: InvoiceProcessPayload = {
          invoiceId: invoice.id,
          fileUrl: fileUrlForProcessing,
          fileName: file.name,
          drawRequestId,
          projectId,
          projectCode,
          budgetCategories,
          drawLines: formattedDrawLines
        }
        
        // Fire and forget - don't wait for processing to complete
        triggerInvoiceProcess(payload).then(result => {
          if (!result.success) {
            console.warn(`Invoice ${invoice.id} processing trigger failed:`, result.message)
            // Update status to pending if trigger failed
            supabaseAdmin
              .from('invoices')
              .update({ status: 'pending', vendor_name: 'Pending Review' })
              .eq('id', invoice.id)
              .then(() => {})
          }
        })
        
      } catch (fileError: any) {
        console.error('File processing error:', fileError)
        errors.push({ file: file.name, error: fileError.message || 'Unknown error' })
      }
    }
    
    return NextResponse.json({
      success: true,
      uploaded: uploadedInvoices.length,
      failed: errors.length,
      invoices: uploadedInvoices,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error: any) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

