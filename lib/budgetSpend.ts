import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * Update budget spent amounts when a draw is funded.
 * This ensures progress budget reports accurately reflect spending.
 *
 * Idempotent — checks audit_events before recording to avoid double-counting.
 */
export async function updateBudgetSpendForDraw(drawId: string, actor: string) {
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

      // Atomically increment budget spent_amount to avoid race conditions
      const { data: result, error: rpcError } = await supabaseAdmin.rpc('increment_budget_spent', {
        p_budget_id: line.budget_id,
        p_amount: amountToRecord
      })

      if (rpcError) {
        console.error(`[Budget Spend] Error updating budget ${line.budget_id}:`, rpcError)
        continue
      }

      const newSpent = result?.[0]?.new_spent_amount ?? 0
      const currentAmount = result?.[0]?.current_amount ?? 0
      const previousSpent = newSpent - amountToRecord
      const newRemaining = currentAmount - newSpent

      console.log(`[Budget Spend] Updated budget ${line.budget_id}: spent ${previousSpent} → ${newSpent}, remaining ${currentAmount - previousSpent} → ${newRemaining}`)
      updatedCount++

      // Log audit event for budget update
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'budget',
        entity_id: line.budget_id,
        action: 'spend_recorded',
        actor,
        old_data: {
          spent_amount: previousSpent,
          remaining_amount: currentAmount - previousSpent
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
