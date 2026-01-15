import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.srv1208741.hstgr.cloud/webhook'
const BUDGET_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_BUDGET_WEBHOOK || `${N8N_BASE_URL}/budget-import`

/**
 * Proxy n8n budget import webhook calls to avoid CORS issues.
 * Client calls this API route, which then calls n8n server-to-server.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    if (!BUDGET_WEBHOOK_URL) {
      return NextResponse.json(
        { error: 'Budget webhook URL not configured' },
        { status: 500 }
      )
    }

    console.log('[API] Budget import: sending', payload.lineItems?.length || 0, 'categories to n8n')

    const response = await fetch(BUDGET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log('[API] Budget import: n8n response status:', response.status)

    // Handle empty responses
    const responseText = await response.text()
    if (!responseText || responseText.trim().length === 0) {
      if (!response.ok) {
        return NextResponse.json(
          { error: `n8n webhook error (${response.status})` },
          { status: response.status }
        )
      }
      return NextResponse.json({ success: true, message: 'Accepted by n8n' })
    }

    // Parse and forward the response
    try {
      const data = JSON.parse(responseText)
      console.log('[API] Budget import: n8n response:', data)
      return NextResponse.json(data, { status: response.status })
    } catch {
      console.error('[API] Budget import: failed to parse response:', responseText.substring(0, 200))
      return NextResponse.json(
        { success: response.ok, message: responseText },
        { status: response.status }
      )
    }
  } catch (error: any) {
    console.error('[API] Budget import webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to call n8n webhook' },
      { status: 500 }
    )
  }
}
