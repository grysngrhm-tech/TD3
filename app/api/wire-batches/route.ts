import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST - Create wire batch and mark draws as funded
 * 
 * This endpoint creates a wire batch and immediately funds the draws,
 * which is the simplified flow for backfilling historical data.
 * 
 * Request body:
 * {
 *   builder_id: string,
 *   draw_ids: string[],
 *   funded_at: string,  // ISO date string for the fund date
 *   wire_reference?: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { builder_id, draw_ids, funded_at, wire_reference, notes } = body

    // Validate required fields
    if (!builder_id) {
      return NextResponse.json({ error: 'builder_id is required' }, { status: 400 })
    }
    if (!draw_ids || !Array.isArray(draw_ids) || draw_ids.length === 0) {
      return NextResponse.json({ error: 'draw_ids array is required' }, { status: 400 })
    }
    if (!funded_at) {
      return NextResponse.json({ error: 'funded_at date is required' }, { status: 400 })
    }

    // Parse and validate the funded date
    const fundDate = new Date(funded_at)
    if (isNaN(fundDate.getTime())) {
      return NextResponse.json({ error: 'Invalid funded_at date format' }, { status: 400 })
    }
    const fundedAtISO = fundDate.toISOString()

    // Fetch the draws to calculate total amount and verify they exist
    const { data: draws, error: drawsError } = await supabaseAdmin
      .from('draw_requests')
      .select('id, total_amount, status')
      .in('id', draw_ids)

    if (drawsError) {
      console.error('Error fetching draws:', drawsError)
      return NextResponse.json({ error: 'Failed to fetch draws' }, { status: 500 })
    }

    if (!draws || draws.length !== draw_ids.length) {
      return NextResponse.json({ 
        error: `Some draws not found. Expected ${draw_ids.length}, found ${draws?.length || 0}` 
      }, { status: 400 })
    }

    // Check that all draws are in a valid state for funding (staged)
    const invalidDraws = draws.filter(d => d.status !== 'staged')
    if (invalidDraws.length > 0) {
      return NextResponse.json({ 
        error: `Cannot fund draws that are not staged. Invalid draws: ${invalidDraws.map(d => d.id).join(', ')}` 
      }, { status: 400 })
    }

    // Calculate total amount
    const totalAmount = draws.reduce((sum, d) => sum + (d.total_amount || 0), 0)

    // Create the wire batch with status 'funded' (simplified flow)
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('wire_batches')
      .insert({
        builder_id,
        total_amount: totalAmount,
        status: 'funded',
        submitted_at: fundedAtISO,
        funded_at: fundedAtISO,
        funded_by: 'user',
        wire_reference: wire_reference || null,
        notes: notes || null
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating wire batch:', batchError)
      return NextResponse.json({ error: 'Failed to create wire batch' }, { status: 500 })
    }

    // Update all draws to funded status
    for (const draw of draws) {
      const { error: updateError } = await supabaseAdmin
        .from('draw_requests')
        .update({
          status: 'funded',
          wire_batch_id: batch.id,
          funded_at: fundedAtISO
        })
        .eq('id', draw.id)

      if (updateError) {
        console.error(`Error updating draw ${draw.id}:`, updateError)
        // Continue with other draws even if one fails
      }

      // Log audit event for each draw
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'draw_request',
        entity_id: draw.id,
        action: 'funded',
        actor: 'user',
        old_data: { status: 'staged' },
        new_data: { 
          status: 'funded', 
          funded_at: fundedAtISO,
          wire_batch_id: batch.id 
        }
      })
    }

    // Log wire batch funded event
    await supabaseAdmin.from('audit_events').insert({
      entity_type: 'wire_batch',
      entity_id: batch.id,
      action: 'created_and_funded',
      actor: 'user',
      new_data: { 
        builder_id,
        draw_count: draws.length,
        total_amount: totalAmount,
        funded_at: fundedAtISO,
        wire_reference
      }
    })

    return NextResponse.json({ 
      success: true, 
      batch_id: batch.id,
      funded_at: fundedAtISO,
      draw_count: draws.length,
      total_amount: totalAmount
    })

  } catch (error) {
    console.error('Error in wire batch creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

