import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { captureTrainingDataForDraw } from '@/lib/invoiceLearning'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Get the authenticated user from the request cookies
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Not needed for read-only operations
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Check if a user has a specific permission
 */
async function checkPermission(userId: string, permission: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('has_permission', {
    check_user_id: userId,
    required_permission: permission,
  })

  if (error) {
    console.error('Error checking permission:', error)
    return false
  }

  return data === true
}

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
      // Verify user has fund_draws permission
      const user = await getAuthenticatedUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const hasFundPermission = await checkPermission(user.id, 'fund_draws')

      if (!hasFundPermission) {
        return NextResponse.json(
          { error: 'Permission denied: fund_draws permission required to record funding' },
          { status: 403 }
        )
      }

      // Use provided funded_at date or default to now
      const fundedAt = funded_at ? new Date(funded_at).toISOString() : new Date().toISOString()
      // Use actual user email for audit trail
      const actorEmail = user.email || funded_by || 'unknown'

      // Update wire batch
      const { error: batchError } = await supabaseAdmin
        .from('wire_batches')
        .update({
          status: 'funded',
          funded_at: fundedAt,
          funded_by: actorEmail,
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
          actor: actorEmail,
          old_data: { status: 'pending_wire' },
          new_data: { status: 'funded', funded_at: fundedAt }
        })

        // Update budget spent amounts for each draw line
        await updateBudgetSpendForDraw(draw.id, actorEmail)

        // Capture invoice training data (learning system)
        // Every approved draw becomes training data for future matching
        try {
          const learningResult = await captureTrainingDataForDraw(draw.id, supabaseAdmin)
          if (learningResult.trainingRecordsCreated > 0) {
            console.log(`[Learning] Draw ${draw.id}: ${learningResult.trainingRecordsCreated} training records created`)
          }
          if (learningResult.errors.length > 0) {
            console.warn(`[Learning] Draw ${draw.id} had errors:`, learningResult.errors)
          }
        } catch (learningError) {
          // Don't fail the funding if learning capture fails
          console.error(`[Learning] Failed to capture training data for draw ${draw.id}:`, learningError)
        }
      }

      // Log wire batch funded event
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'wire_batch',
        entity_id: batchId,
        action: 'funded',
        actor: actorEmail,
        new_data: { 
          status: 'funded',
          funded_at: fundedAt,
          wire_reference
        }
      })

      return NextResponse.json({ success: true, funded_at: fundedAt })

    } else if (action === 'cancel') {
      // Verify user has processor permission
      const user = await getAuthenticatedUser()
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const hasProcessorPermission = await checkPermission(user.id, 'processor')
      if (!hasProcessorPermission) {
        return NextResponse.json(
          { error: 'Permission denied: processor permission required to cancel batch' },
          { status: 403 }
        )
      }

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
