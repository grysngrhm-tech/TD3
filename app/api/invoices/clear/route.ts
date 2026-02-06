import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/api-auth'

export async function DELETE(request: NextRequest) {
  try {
    const [, authError] = await requirePermission('processor')
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const drawRequestId = searchParams.get('drawRequestId')

    if (!drawRequestId) {
      return NextResponse.json({ error: 'Missing drawRequestId' }, { status: 400 })
    }

    // Get all invoices for this draw request
    const { data: invoices, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, file_path')
      .eq('draw_request_id', drawRequestId)

    if (fetchError) {
      console.error('Error fetching invoices:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    // Delete files from storage
    const filePaths = invoices
      .map(inv => inv.file_path)
      .filter(Boolean) as string[]

    if (filePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('documents')
        .remove(filePaths)

      if (storageError) {
        console.error('Error deleting files from storage:', storageError)
        // Continue to delete DB records even if storage deletion fails
      }
    }

    // Delete invoice records from database
    const { error: deleteError } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('draw_request_id', drawRequestId)

    if (deleteError) {
      console.error('Error deleting invoices from database:', deleteError)
      return NextResponse.json({ error: 'Failed to delete invoice records' }, { status: 500 })
    }

    // Clear invoice-related fields from draw request lines
    const { error: updateError } = await supabaseAdmin
      .from('draw_request_lines')
      .update({
        invoice_file_url: null,
        invoice_vendor_name: null,
        matched_invoice_amount: null,
        confidence_score: null
      })
      .eq('draw_request_id', drawRequestId)

    if (updateError) {
      console.error('Error clearing line invoice fields:', updateError)
      // Not critical, continue
    }

    return NextResponse.json({ 
      success: true, 
      deleted: invoices.length,
      filesRemoved: filePaths.length
    })

  } catch (error) {
    console.error('API clear invoices error:', error)
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 })
  }
}

