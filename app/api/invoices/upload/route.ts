import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
        
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('documents')
          .getPublicUrl(filePath)
        
        // Create invoice record in database
        const { data: invoice, error: insertError } = await supabaseAdmin
          .from('invoices')
          .insert({
            project_id: projectId,
            draw_request_id: drawRequestId,
            vendor_name: 'Pending Review',
            amount: 0,
            file_path: filePath,
            file_url: urlData.publicUrl,
            status: 'pending'
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

