import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Update budget spent amounts when a draw is funded
 * This ensures progress budget reports accurately reflect spending
 */
async function updateBudgetSpendForDraw(drawId: string, actor: string) {
  try {
    console.log(`[Budget Spend] Starting update for draw ${drawId}`)
    
    // Fetch all draw lines with their budgets
    const { data: lines, error: linesError } = await supabaseAdmin
      .from('draw_request_lines')
      .select('id, budget_id, amount_requested, amount_approved')
      .eq('draw_request_id', drawId)

    if (linesError) {
      console.error('[Budget Spend] Error fetching draw lines:', linesError)
      return
    }

    console.log(`[Budget Spend] Found ${lines?.length || 0} draw lines for draw ${drawId}`)

    let updatedCount = 0
    let skippedCount = 0
    
    for (const line of (lines || [])) {
      const amountToRecord = (line.amount_approved ?? line.amount_requested) || 0

      if (!line.budget_id || amountToRecord <= 0) {
        console.log(`[Budget Spend] Skipping line ${line.id} - no budget_id or zero amount`)
        skippedCount++
        continue
      }

      // Idempotency: don't double-count if this draw line was already recorded.
      const { data: existingAudit } = await supabaseAdmin
        .from('audit_events')
        .select('id')
        .eq('entity_type', 'budget')
        .eq('entity_id', line.budget_id)
        .eq('action', 'spend_recorded')
        .contains('new_data', { draw_line_id: line.id })
        .maybeSingle()

      if (existingAudit) {
        console.log(`[Budget Spend] Skipping line ${line.id} - already recorded`)
        skippedCount++
        continue
      }

      // Get current budget values
      const { data: budget, error: budgetError } = await supabaseAdmin
        .from('budgets')
        .select('id, spent_amount, current_amount')
        .eq('id', line.budget_id)
        .single()

      if (budgetError || !budget) {
        console.error(`Error fetching budget ${line.budget_id}:`, budgetError)
        continue
      }

      // Calculate new values
      const currentSpent = budget.spent_amount || 0
      const currentRemaining = budget.current_amount - currentSpent
      const newSpent = currentSpent + amountToRecord
      const newRemaining = budget.current_amount - newSpent

      // Update budget: remaining_amount is a generated column in the schema, so don't write it.
      const { error: updateError } = await supabaseAdmin
        .from('budgets')
        .update({
          spent_amount: newSpent
        })
        .eq('id', line.budget_id)

      if (updateError) {
        console.error(`[Budget Spend] Error updating budget ${line.budget_id}:`, updateError)
        continue
      }

      console.log(`[Budget Spend] Updated budget ${line.budget_id}: spent ${currentSpent} → ${newSpent}, remaining ${currentRemaining} → ${newRemaining}`)
      updatedCount++

      // Log audit event for budget update
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'budget',
        entity_id: line.budget_id,
        action: 'spend_recorded',
        actor,
        old_data: { 
          spent_amount: currentSpent,
          remaining_amount: currentRemaining
        },
        new_data: { 
          spent_amount: newSpent,
          remaining_amount: newRemaining,
          draw_request_id: drawId,
          draw_line_id: line.id,
          amount: amountToRecord
        }
      })
    }
    
    console.log(`[Budget Spend] Completed for draw ${drawId}: ${updatedCount} budgets updated, ${skippedCount} lines skipped (no budget match)`)
  } catch (error) {
    console.error('[Budget Spend] Fatal error updating budget spend:', error)
  }
}

/**
 * POST - Create wire batch
 * 
 * Supports two actions:
 * 
 * 1. action: 'submit_for_wire' (default workflow)
 *    - Creates a pending wire batch
 *    - Moves draws from 'staged' to 'pending_wire'
 *    - Bookkeeper will confirm funding later
 * 
 * 2. action: 'fund' (backfill/direct funding)
 *    - Creates a funded wire batch
 *    - Immediately marks draws as funded
 *    - Used for historical data import
 * 
 * Request body for submit_for_wire:
 * {
 *   action: 'submit_for_wire',
 *   builder_id: string,
 *   draw_ids: string[]
 * }
 * 
 * Request body for fund (direct):
 * {
 *   action?: 'fund',  // optional, this is legacy behavior
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
    const { action, builder_id, draw_ids } = body

    // Validate required fields
    if (!builder_id) {
      return NextResponse.json({ error: 'builder_id is required' }, { status: 400 })
    }
    if (!draw_ids || !Array.isArray(draw_ids) || draw_ids.length === 0) {
      return NextResponse.json({ error: 'draw_ids array is required' }, { status: 400 })
    }

    // Route to appropriate handler based on action
    if (action === 'submit_for_wire') {
      return handleSubmitForWire(builder_id, draw_ids)
    } else {
      // Default/legacy behavior: direct funding
      const { funded_at, wire_reference, notes } = body
      return handleDirectFund(builder_id, draw_ids, funded_at, wire_reference, notes)
    }

  } catch (error) {
    console.error('Error in wire batch creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Submit draws for wire funding (pending status)
 * This is the normal workflow: staged -> pending_wire -> funded
 */
async function handleSubmitForWire(builder_id: string, draw_ids: string[]) {
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

  // Check that all draws are staged
  const invalidDraws = draws.filter(d => d.status !== 'staged')
  if (invalidDraws.length > 0) {
    return NextResponse.json({ 
      error: `Cannot submit draws that are not staged. Invalid draws: ${invalidDraws.map(d => d.id).join(', ')}` 
    }, { status: 400 })
  }

  // Calculate total amount
  const totalAmount = draws.reduce((sum, d) => sum + (d.total_amount || 0), 0)
  const submittedAt = new Date().toISOString()

  // Create the wire batch with status 'pending'
  const { data: batch, error: batchError } = await supabaseAdmin
    .from('wire_batches')
    .insert({
      builder_id,
      total_amount: totalAmount,
      status: 'pending',
      submitted_at: submittedAt,
      submitted_by: 'loan_officer'
    })
    .select()
    .single()

  if (batchError) {
    console.error('Error creating wire batch:', batchError)
    return NextResponse.json({ error: 'Failed to create wire batch' }, { status: 500 })
  }

  // Update all draws to pending_wire status and link to batch
  for (const draw of draws) {
    const { error: updateError } = await supabaseAdmin
      .from('draw_requests')
      .update({
        status: 'pending_wire',
        wire_batch_id: batch.id
      })
      .eq('id', draw.id)

    if (updateError) {
      console.error(`Error updating draw ${draw.id}:`, updateError)
    }

    // Log audit event for each draw
    await supabaseAdmin.from('audit_events').insert({
      entity_type: 'draw_request',
      entity_id: draw.id,
      action: 'submitted_for_wire',
      actor: 'loan_officer',
      old_data: { status: 'staged' },
      new_data: { 
        status: 'pending_wire',
        wire_batch_id: batch.id 
      }
    })
  }

  // Log wire batch creation event
  await supabaseAdmin.from('audit_events').insert({
    entity_type: 'wire_batch',
    entity_id: batch.id,
    action: 'created',
    actor: 'loan_officer',
    new_data: { 
      builder_id,
      draw_count: draws.length,
      total_amount: totalAmount,
      status: 'pending'
    }
  })

  // Send notification to bookkeeper (optional - fire and forget)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/wire-batches/${batch.id}/notify`, {
      method: 'POST'
    }).catch(() => {})
  } catch (e) {
    // Ignore notification errors
  }

  return NextResponse.json({ 
    success: true, 
    batch_id: batch.id,
    submitted_at: submittedAt,
    draw_count: draws.length,
    total_amount: totalAmount,
    status: 'pending'
  })
}

/**
 * Direct funding (legacy/backfill mode)
 * Creates batch and immediately marks as funded
 */
async function handleDirectFund(
  builder_id: string, 
  draw_ids: string[], 
  funded_at: string,
  wire_reference?: string,
  notes?: string
) {
  if (!funded_at) {
    return NextResponse.json({ error: 'funded_at date is required for direct funding' }, { status: 400 })
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

    // Update budget spent amounts for each draw line
    await updateBudgetSpendForDraw(draw.id, 'user')
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
}