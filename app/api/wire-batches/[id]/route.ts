import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get wire batch details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batchId = params.id

    // Fetch wire batch with builder and draws
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('wire_batches')
      .select(`
        *,
        builder:builders(*),
        draws:draw_requests(
          *,
          project:projects(*)
        )
      `)
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Wire batch not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(batch)

  } catch (error) {
    console.error('Error fetching wire batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update wire batch (mark as funded)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batchId = params.id
    const body = await request.json()
    const { action, wire_reference, notes, funded_by } = body

    if (action === 'fund') {
      const fundedAt = new Date().toISOString()

      // Update wire batch
      const { error: batchError } = await supabaseAdmin
        .from('wire_batches')
        .update({
          status: 'funded',
          funded_at: fundedAt,
          funded_by: funded_by || 'bookkeeper',
          wire_reference: wire_reference || null,
          notes: notes || null
        })
        .eq('id', batchId)

      if (batchError) throw batchError

      // Update all draws in this batch to funded
      const { data: draws } = await supabaseAdmin
        .from('draw_requests')
        .select('id')
        .eq('wire_batch_id', batchId)

      for (const draw of (draws || [])) {
        await supabaseAdmin
          .from('draw_requests')
          .update({
            status: 'funded',
            funded_at: fundedAt
          })
          .eq('id', draw.id)

        // Log audit event
        await supabaseAdmin.from('audit_events').insert({
          entity_type: 'draw_request',
          entity_id: draw.id,
          action: 'funded',
          actor: funded_by || 'bookkeeper',
          old_data: { status: 'pending_wire' },
          new_data: { status: 'funded', funded_at: fundedAt }
        })
      }

      // Log wire batch funded event
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'wire_batch',
        entity_id: batchId,
        action: 'funded',
        actor: funded_by || 'bookkeeper',
        new_data: { 
          status: 'funded',
          funded_at: fundedAt,
          wire_reference
        }
      })

      return NextResponse.json({ success: true, funded_at: fundedAt })

    } else if (action === 'cancel') {
      // Cancel wire batch
      const { error: batchError } = await supabaseAdmin
        .from('wire_batches')
        .update({ status: 'cancelled' })
        .eq('id', batchId)

      if (batchError) throw batchError

      // Move draws back to staged
      const { data: draws } = await supabaseAdmin
        .from('draw_requests')
        .select('id')
        .eq('wire_batch_id', batchId)

      for (const draw of (draws || [])) {
        await supabaseAdmin
          .from('draw_requests')
          .update({
            status: 'staged',
            wire_batch_id: null
          })
          .eq('id', draw.id)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error updating wire batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
