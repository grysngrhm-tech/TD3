import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyWebhookSecret } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const [, authError] = verifyWebhookSecret(request)
    if (authError) return authError

    const contentType = request.headers.get('content-type') || ''
    
    // Handle multipart form data (file upload from n8n)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const projectId = formData.get('projectId') as string
      const drawRequestId = formData.get('drawRequestId') as string
      const invoiceId = formData.get('invoiceId') as string | null

      if (!file || !projectId) {
        return NextResponse.json(
          { error: 'Missing required fields: file, projectId' },
          { status: 400 }
        )
      }

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${projectId}/${drawRequestId || 'general'}/${timestamp}_${sanitizedName}`

      // Upload to Supabase Storage
      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json(
          { error: 'Failed to upload file', details: uploadError.message },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Calculate file hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Insert document record
      const { data: docData, error: dbError } = await supabaseAdmin
        .from('documents')
        .insert({
          project_id: projectId,
          draw_request_id: drawRequestId || null,
          invoice_id: invoiceId || null,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          file_hash: fileHash,
        })
        .select()
        .single()

      if (dbError) {
        return NextResponse.json(
          { error: 'Failed to create document record', details: dbError.message },
          { status: 500 }
        )
      }

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'document',
        entity_id: docData.id,
        action: 'created',
        actor: 'n8n-workflow',
        new_data: {
          file_name: file.name,
          project_id: projectId,
          draw_request_id: drawRequestId,
        },
      })

      return NextResponse.json({
        success: true,
        document: docData,
        fileHash,
      })
    }

    // Handle JSON body (metadata only)
    const body = await request.json()
    const { documentId, metadata } = body

    if (documentId && metadata) {
      // Update existing document with extracted metadata
      const { data, error } = await supabaseAdmin
        .from('documents')
        .update(metadata)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update document' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        document: data,
      })
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Document webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

