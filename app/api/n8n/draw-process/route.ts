import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

/**
 * Proxy n8n draw processing webhook calls to avoid CORS issues.
 * Client calls this API route, which then calls n8n server-to-server.
 */
export async function POST(request: NextRequest) {
  try {
    const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
    if (!N8N_BASE_URL) throw new Error('NEXT_PUBLIC_N8N_WEBHOOK_URL environment variable is required')
    const DRAW_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_DRAW_WEBHOOK || `${N8N_BASE_URL}/td3-draw-process`

    const [, authError] = await requireAuth()
    if (authError) return authError

    const payload = await request.json()

    const response = await fetch(DRAW_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // Handle empty responses
    const responseText = await response.text()
    if (!responseText || responseText.trim().length === 0) {
      if (!response.ok) {
        return NextResponse.json(
          { error: `n8n webhook error (${response.status})` },
          { status: response.status }
        )
      }
      return NextResponse.json({ success: true, message: 'Accepted' })
    }

    // Parse and forward the response
    try {
      const data = JSON.parse(responseText)
      return NextResponse.json(data, { status: response.status })
    } catch {
      // If not JSON, return as message
      return NextResponse.json(
        { success: response.ok, message: responseText },
        { status: response.status }
      )
    }
  } catch (error: any) {
    console.error('[API] Draw process webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to call n8n webhook' },
      { status: 500 }
    )
  }
}
