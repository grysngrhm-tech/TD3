import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateDrawRequest, canApprove } from '@/lib/validations'

// Use service role for webhooks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { drawId, action, comments } = body

    if (!drawId) {
      return NextResponse.json(
        { error: 'Missing drawId parameter' },
        { status: 400 }
      )
    }

    // Fetch the draw request
    const { data: draw, error: fetchError } = await supabaseAdmin
      .from('draw_requests')
      .select('*, projects(*)')
      .eq('id', drawId)
      .single()

    if (fetchError || !draw) {
      return NextResponse.json(
        { error: 'Draw request not found' },
        { status: 404 }
      )
    }

    // Run validation
    const validation = await validateDrawRequest(drawId)
    const approvalCheck = await canApprove(drawId)

    // Process action if provided
    if (action === 'approve' || action === 'reject') {
      if (draw.status !== 'submitted') {
        return NextResponse.json(
          { error: `Cannot ${action}: draw is not in submitted status` },
          { status: 400 }
        )
      }

      if (action === 'approve' && !approvalCheck.canApprove) {
        return NextResponse.json(
          { 
            error: 'Cannot approve: blocking validation issues',
            blockers: approvalCheck.blockers,
            validation 
          },
          { status: 400 }
        )
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      // Update draw status
      const { error: updateError } = await supabaseAdmin
        .from('draw_requests')
        .update({ status: newStatus })
        .eq('id', drawId)

      if (updateError) throw updateError

      // Create approval record
      await supabaseAdmin.from('approvals').insert({
        draw_request_id: drawId,
        decision: action === 'approve' ? 'approved' : 'rejected',
        comments: comments || null,
        decided_at: new Date().toISOString(),
        approved_by: 'n8n-workflow'
      })

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        entity_type: 'draw_request',
        entity_id: drawId,
        action: newStatus,
        actor: 'n8n-workflow',
        old_data: { status: draw.status },
        new_data: { status: newStatus },
        metadata: comments ? { comments } : null
      })

      return NextResponse.json({
        success: true,
        drawId,
        newStatus,
        validation,
        project: {
          id: draw.project_id,
          name: (draw as any).projects?.name
        }
      })
    }

    // If no action, just return validation results
    return NextResponse.json({
      success: true,
      drawId,
      currentStatus: draw.status,
      totalAmount: draw.total_amount,
      validation,
      canApprove: approvalCheck.canApprove,
      blockers: approvalCheck.blockers,
      project: {
        id: draw.project_id,
        name: (draw as any).projects?.name
      }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

