import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

type FlagsObj = Record<string, any>

function parseFlags(flags: string | null): FlagsObj {
  if (!flags) return {}
  try {
    const parsed = JSON.parse(flags)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * POST /api/invoices/reconcile-processing
 *
 * Safety-net: invoices can get stuck in "processing" if n8n callback fails.
 * This endpoint marks old processing invoices as error and optionally retries once.
 *
 * Body:
 * {
 *   drawRequestId?: string,
 *   olderThanMinutes?: number (default 10),
 *   autoRetryOnce?: boolean (default false)
 * }
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.N8N_CALLBACK_SECRET
  if (expectedSecret) {
    const provided = request.headers.get('x-td3-webhook-secret')
    if (!provided || provided !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await request.json().catch(() => ({} as any))
  const drawRequestId = typeof body.drawRequestId === 'string' ? body.drawRequestId : null
  const olderThanMinutes = typeof body.olderThanMinutes === 'number' ? body.olderThanMinutes : 10
  const autoRetryOnce = body.autoRetryOnce === true

  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString()

  let q = supabaseAdmin
    .from('invoices')
    .select('id, flags, draw_request_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  if (drawRequestId) q = q.eq('draw_request_id', drawRequestId)

  const { data: invoices, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let markedError = 0
  let skipped = 0
  const markedIds: string[] = []

  for (const inv of invoices || []) {
    const flags = parseFlags(inv.flags ?? null)
    if (flags.status_detail !== 'processing') {
      skipped++
      continue
    }

    const nextFlags: FlagsObj = {
      ...flags,
      status_detail: 'error',
      error: `Timed out after ${olderThanMinutes} minutes waiting for n8n callback`,
      completed_at: new Date().toISOString(),
      reconciled: true
    }

    // optional single auto-retry marker
    if (autoRetryOnce && !flags.auto_retry_attempted) {
      nextFlags.auto_retry_attempted = true
    }

    const { error: updateErr } = await supabaseAdmin
      .from('invoices')
      .update({ flags: JSON.stringify(nextFlags) })
      .eq('id', inv.id)

    if (!updateErr) {
      markedError++
      markedIds.push(inv.id)
    }
  }

  return NextResponse.json({
    success: true,
    drawRequestId,
    cutoff,
    scanned: invoices?.length || 0,
    markedError,
    skipped,
    markedIds
  })
}


