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
    // Fetch all draw lines with their budgets
    const { data: lines, error: linesError } = await supabaseAdmin
      .from('draw_request_lines')
      .select('id, budget_id, amount_requested')
      .eq('draw_request_id', drawId)

    if (linesError) {
      console.error('Error fetching draw lines:', linesError)
      return
    }

    for (const line of (lines || [])) {
      if (!line.budget_id || !line.amount_requested) continue

      // Get current budget values
      const { data: budget, error: budgetError } = await supabaseAdmin
        .from('budgets')
        .select('id, spent_amount, remaining_amount, current_amount')
        .eq('id', line.budget_id)
        .single()

      if (budgetError || !budget) {
        console.error(`Error fetching budget ${line.budget_id}:`, budgetError)
        continue
      }

      // Calculate new values
      const currentSpent = budget.spent_amount || 0
      const currentRemaining = budget.remaining_amount ?? (budget.current_amount - currentSpent)
      const newSpent = currentSpent + line.amount_requested
      const newRemaining = currentRemaining - line.amount_requested

      // Update budget
      const { error: updateError } = await supabaseAdmin
        .from('budgets')
        .update({
          spent_amount: newSpent,
          remaining_amount: newRemaining
        })
        .eq('id', line.budget_id)

      if (updateError) {
        console.error(`Error updating budget ${line.budget_id}:`, updateError)
        continue
      }

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
          amount: line.amount_requested
        }
      })
    }
  } catch (error) {
    console.error('Error updating budget spend:', error)
  }
}

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
    const { action, wire_reference, notes, funded_by, funded_at } = body

    if (action === 'fund') {
      // Use provided funded_at date or default to now
      const fundedAt = funded_at ? new Date(funded_at).toISOString() : new Date().toISOString()

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

        // Update budget spent amounts for each draw line
        await updateBudgetSpendForDraw(draw.id, funded_by || 'bookkeeper')
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
