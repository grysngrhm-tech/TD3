import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { validateDrawRequest, canApprove } from '@/lib/validations'
import { verifyWebhookSecret } from '@/lib/api-auth'

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.srv1208741.hstgr.cloud/webhook'

export async function POST(request: NextRequest) {
  try {
    const [, authError] = verifyWebhookSecret(request)
    if (authError) return authError

    const body = await request.json()
    
    // Handle new draw upload processing (from /draws/new page)
    if (body.drawRequestId && body.categories && body.drawAmounts) {
      return handleDrawProcessing(body)
    }

    // Handle existing draw approval flow
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

// Handle processing of new draw uploads
async function handleDrawProcessing(body: {
  drawRequestId: string
  projectId: string
  drawNumber: number
  categories: string[]
  drawAmounts: number[]
  budgets: Array<{
    id: string
    category: string
    nahbCategory: string | null
    nahbSubcategory: string | null
    costCode: string | null
    remaining: number | null
  }>
  invoiceCount: number
}) {
  try {
    const { drawRequestId, projectId, drawNumber, categories, drawAmounts, budgets, invoiceCount } = body

    // Send to N8N for AI processing (invoice matching, flag generation)
    try {
      const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}/td3-draw-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawRequestId,
          projectId,
          drawNumber,
          categories,
          drawAmounts,
          budgets,
          invoiceCount
        })
      })

      if (n8nResponse.ok) {
        const n8nResult = await n8nResponse.json()
        
        // If N8N returns matched lines with flags, update the draw_request_lines
        if (n8nResult.lines && Array.isArray(n8nResult.lines)) {
          for (const line of n8nResult.lines) {
            if (line.id) {
              await supabaseAdmin
                .from('draw_request_lines')
                .update({
                  budget_id: line.budget_id || null,
                  confidence_score: line.confidence_score || null,
                  flags: line.flags ? JSON.stringify(line.flags) : null
                })
                .eq('id', line.id)
            }
          }
        }
      }
    } catch (n8nError) {
      console.warn('N8N webhook call failed, continuing without AI processing:', n8nError)
    }

    // Get invoices for this draw
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('draw_request_id', drawRequestId)

    // Get draw lines
    const { data: lines } = await supabaseAdmin
      .from('draw_request_lines')
      .select('*')
      .eq('draw_request_id', drawRequestId)

    // Generate flags for lines without invoices or with budget issues
    const lineUpdates = []
    for (let i = 0; i < (lines?.length || 0); i++) {
      const line = lines![i]
      const flags: string[] = []

      // Check if line has matching invoices
      const matchedInvoices = invoices?.filter(inv => inv.draw_request_line_id === line.id) || []
      if (matchedInvoices.length === 0 && invoiceCount > 0) {
        flags.push('NO_INVOICE')
      }

      // Check for budget overage
      if (line.budget_id) {
        const budget = budgets.find(b => b.id === line.budget_id)
        if (budget && budget.remaining !== null && line.amount_requested > budget.remaining) {
          flags.push('OVER_BUDGET')
        }
      }

      // Check AI confidence
      if (line.confidence_score !== null && line.confidence_score < 0.7) {
        flags.push('LOW_CONFIDENCE')
      }

      if (flags.length > 0) {
        lineUpdates.push({
          id: line.id,
          flags: JSON.stringify(flags)
        })
      }
    }

    // Update lines with flags
    for (const update of lineUpdates) {
      await supabaseAdmin
        .from('draw_request_lines')
        .update({ flags: update.flags })
        .eq('id', update.id)
    }

    return NextResponse.json({
      success: true,
      drawRequestId,
      linesProcessed: lines?.length || 0,
      invoicesCount: invoices?.length || 0,
      flaggedLines: lineUpdates.length
    })

  } catch (error) {
    console.error('Draw processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process draw' },
      { status: 500 }
    )
  }
}
