import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST - Manually recalculate and update budget spent amounts for a funded draw
 * This is a diagnostic/fix endpoint for cases where budget updates didn't properly record
 * 
 * GET - Get diagnostic info about a draw's budget links without making changes
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const drawId = params.id

    // Get draw info
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draw_requests')
      .select('id, draw_number, total_amount, status, project_id, wire_batch_id, funded_at')
      .eq('id', drawId)
      .single()

    if (drawError || !draw) {
      return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    }

    // Get draw lines with budget info
    const { data: lines, error: linesError } = await supabaseAdmin
      .from('draw_request_lines')
      .select(`
        id,
        budget_id,
        amount_requested,
        amount_approved,
        budgets (
          id,
          nahb_category,
          builder_category_raw,
          current_amount,
          spent_amount,
          remaining_amount
        )
      `)
      .eq('draw_request_id', drawId)

    if (linesError) {
      return NextResponse.json({ error: 'Error fetching draw lines', details: linesError }, { status: 500 })
    }

    // Analyze the data
    const analysis = {
      draw: {
        id: draw.id,
        draw_number: draw.draw_number,
        total_amount: draw.total_amount,
        status: draw.status,
        project_id: draw.project_id,
        wire_batch_id: draw.wire_batch_id,
        funded_at: draw.funded_at
      },
      lines: lines?.map(line => ({
        line_id: line.id,
        budget_id: line.budget_id,
        amount_requested: line.amount_requested,
        amount_approved: line.amount_approved,
        has_budget_link: !!line.budget_id,
        budget: line.budgets ? {
          id: (line.budgets as any).id,
          category: (line.budgets as any).nahb_category || (line.budgets as any).builder_category_raw,
          current_amount: (line.budgets as any).current_amount,
          spent_amount: (line.budgets as any).spent_amount,
          remaining_amount: (line.budgets as any).remaining_amount
        } : null
      })),
      summary: {
        total_lines: lines?.length || 0,
        lines_with_budget: lines?.filter(l => l.budget_id).length || 0,
        lines_without_budget: lines?.filter(l => !l.budget_id).length || 0,
        lines_with_amount: lines?.filter(l => l.amount_requested && l.amount_requested > 0).length || 0,
        total_requested: lines?.reduce((sum, l) => sum + (l.amount_requested || 0), 0) || 0,
        // Canonical status is 'funded'. Keep 'paid' for legacy rows.
        can_update_budget: draw.status === 'funded' || draw.status === 'paid'
      }
    }

    return NextResponse.json(analysis)

  } catch (error) {
    console.error('Error in draw diagnostic:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const drawId = params.id
    console.log(`[Budget Recalculate] Starting manual recalculation for draw ${drawId}`)

    // Verify draw exists and is funded
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draw_requests')
      .select('id, status, project_id')
      .eq('id', drawId)
      .single()

    if (drawError || !draw) {
      return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    }

    if (draw.status !== 'funded' && draw.status !== 'paid') {
      return NextResponse.json({ 
        error: `Cannot update budget for draw with status '${draw.status}'. Only funded (or legacy 'paid') draws can have budget updates.` 
      }, { status: 400 })
    }

    // Fetch all draw lines
    const { data: lines, error: linesError } = await supabaseAdmin
      .from('draw_request_lines')
      .select('id, budget_id, amount_requested')
      .eq('draw_request_id', drawId)

    if (linesError) {
      console.error('[Budget Recalculate] Error fetching draw lines:', linesError)
      return NextResponse.json({ error: 'Failed to fetch draw lines', details: linesError }, { status: 500 })
    }

    console.log(`[Budget Recalculate] Found ${lines?.length || 0} draw lines`)

    const results: any[] = []
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const line of (lines || [])) {
      const result: any = {
        line_id: line.id,
        budget_id: line.budget_id,
        amount_requested: line.amount_requested,
        action: 'unknown',
        details: null
      }

      if (!line.budget_id) {
        result.action = 'skipped'
        result.details = 'No budget_id linked to this line'
        skippedCount++
        results.push(result)
        continue
      }

      if (!line.amount_requested || line.amount_requested <= 0) {
        result.action = 'skipped'
        result.details = 'No amount_requested or zero amount'
        skippedCount++
        results.push(result)
        continue
      }

      // Check if this line's amount was already recorded
      const { data: existingAudit } = await supabaseAdmin
        .from('audit_events')
        .select('id')
        .eq('entity_type', 'budget')
        .eq('entity_id', line.budget_id)
        .eq('action', 'spend_recorded')
        .contains('new_data', { draw_line_id: line.id })
        .single()

      if (existingAudit) {
        result.action = 'skipped'
        result.details = 'Already recorded (found matching audit event)'
        skippedCount++
        results.push(result)
        continue
      }

      // Get current budget values
      const { data: budget, error: budgetError } = await supabaseAdmin
        .from('budgets')
        .select('id, spent_amount, remaining_amount, current_amount, nahb_category')
        .eq('id', line.budget_id)
        .single()

      if (budgetError || !budget) {
        result.action = 'error'
        result.details = `Budget not found: ${budgetError?.message || 'unknown error'}`
        errorCount++
        results.push(result)
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
        result.action = 'error'
        result.details = `Update failed: ${updateError.message}`
        errorCount++
        results.push(result)
        continue
      }

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'budget',
        entity_id: line.budget_id,
        action: 'spend_recorded',
        actor: 'manual_recalculate',
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

      result.action = 'updated'
      result.details = {
        category: budget.nahb_category,
        old_spent: currentSpent,
        new_spent: newSpent,
        old_remaining: currentRemaining,
        new_remaining: newRemaining,
        amount_added: line.amount_requested
      }
      updatedCount++
      results.push(result)
    }

    console.log(`[Budget Recalculate] Complete: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      draw_id: drawId,
      summary: {
        total_lines: lines?.length || 0,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results
    })

  } catch (error) {
    console.error('[Budget Recalculate] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

