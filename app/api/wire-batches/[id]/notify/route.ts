import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/api-auth'

// POST - Send notification to bookkeeper about wire batch
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [, authError] = await requirePermission('processor')
    if (authError) return authError

    const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
    if (!N8N_WEBHOOK_URL) throw new Error('NEXT_PUBLIC_N8N_WEBHOOK_URL environment variable is required')

    const batchId = params.id

    // Fetch wire batch with all related data
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

    const builder = batch.builder
    const draws = batch.draws || []

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount)
    }

    // Prepare notification payload
    const notificationPayload = {
      type: 'wire_batch_notification',
      batchId,
      batchIdShort: batchId.slice(0, 8).toUpperCase(),
      builder: {
        companyName: builder?.company_name,
        bankName: builder?.bank_name,
        accountNumber: builder?.bank_account_number ? '****' + builder.bank_account_number.slice(-4) : null,
        routingNumber: builder?.bank_routing_number,
      },
      totalAmount: batch.total_amount,
      totalAmountFormatted: formatCurrency(batch.total_amount),
      drawCount: draws.length,
      draws: draws.map((draw: any) => ({
        projectCode: draw.project?.project_code || draw.project?.name,
        drawNumber: draw.draw_number,
        amount: draw.total_amount,
        amountFormatted: formatCurrency(draw.total_amount)
      })),
      submittedAt: batch.submitted_at,
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/wire-batches/${batchId}/report`,
      confirmUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staging?batch=${batchId}`
    }

    // Try to send to N8N webhook for email notification
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/td3-wire-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      })

      if (response.ok) {
        // Log notification sent
        await supabaseAdmin.from('audit_events').insert({
          entity_type: 'wire_batch',
          entity_id: batchId,
          action: 'notification_sent',
          actor: 'system',
          new_data: { method: 'n8n_webhook' }
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Notification sent successfully',
          method: 'n8n_webhook'
        })
      }
    } catch (webhookError) {
      console.warn('N8N webhook failed:', webhookError)
    }

    // Fallback: Return payload for manual notification
    // In production, you would integrate with SendGrid, AWS SES, etc.
    await supabaseAdmin.from('audit_events').insert({
      entity_type: 'wire_batch',
      entity_id: batchId,
      action: 'notification_pending',
      actor: 'system',
      new_data: { reason: 'n8n_webhook_unavailable' }
    })

    return NextResponse.json({
      success: true,
      message: 'Notification payload generated (webhook unavailable)',
      payload: notificationPayload,
      manualAction: 'Please manually notify bookkeeper with the report URL'
    })

  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
