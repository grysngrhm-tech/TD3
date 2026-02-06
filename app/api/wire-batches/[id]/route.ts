import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, requirePermission } from '@/lib/api-auth'
import { captureTrainingDataForDraw } from '@/lib/invoiceLearning'
import { updateBudgetSpendForDraw } from '@/lib/budgetSpend'

// GET - Get wire batch details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [, authError] = await requireAuth()
    if (authError) return authError

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
      const [user, fundAuthError] = await requirePermission('fund_draws')
      if (fundAuthError) return fundAuthError

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
      const [, cancelAuthError] = await requirePermission('processor')
      if (cancelAuthError) return cancelAuthError

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
