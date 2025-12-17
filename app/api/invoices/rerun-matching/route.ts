import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://grysngrhm.app.n8n.cloud/webhook'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { drawRequestId, projectId, lines, invoiceCount, rerunMatching } = body
    
    if (!drawRequestId) {
      return NextResponse.json(
        { error: 'Missing drawRequestId' },
        { status: 400 }
      )
    }
    
    // Call n8n webhook from server (avoids CORS)
    const webhookUrl = `${N8N_BASE_URL}/td3-invoice-process`
    
    // For re-running matching, we need to trigger processing for each invoice
    // This is a batch operation - we'll trigger the workflow with rerun flag
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        drawRequestId,
        projectId,
        lines,
        invoiceCount,
        rerunMatching: true
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('n8n webhook error:', errorText)
      return NextResponse.json(
        { error: `Webhook returned ${response.status}` },
        { status: 502 }
      )
    }
    
    // Handle empty responses
    const text = await response.text()
    if (!text) {
      return NextResponse.json(
        { error: 'Workflow returned empty response' },
        { status: 502 }
      )
    }
    
    let result
    try {
      result = JSON.parse(text)
    } catch {
      // If n8n returns non-JSON, treat as success acknowledgment
      result = { success: true, message: text }
    }
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('Rerun matching API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

