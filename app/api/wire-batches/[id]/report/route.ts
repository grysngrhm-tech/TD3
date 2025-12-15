import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Generate wire batch report (HTML for PDF generation)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batchId = params.id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'html'

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
        maximumFractionDigits: 2,
      }).format(amount)
    }

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    // Generate HTML report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wire Transfer Request - ${builder?.company_name || 'Builder'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .header h1 { 
      font-size: 24px; 
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .header p { color: #666; }
    .batch-id { 
      font-size: 12px; 
      color: #999;
      margin-top: 10px;
    }
    .section { margin-bottom: 30px; }
    .section-title { 
      font-size: 16px; 
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e5;
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item label { 
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 3px;
    }
    .info-item .value { 
      font-weight: 600;
    }
    .wire-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .wire-box .bank-name {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
    }
    .wire-detail {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .wire-detail:last-child { border-bottom: none; }
    .wire-detail label { color: #666; }
    .wire-detail .value { font-family: monospace; font-weight: 600; }
    .draws-table { 
      width: 100%; 
      border-collapse: collapse;
    }
    .draws-table th { 
      text-align: left;
      padding: 12px 8px;
      background: #f1f5f9;
      font-weight: 600;
      font-size: 12px;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    .draws-table td { 
      padding: 12px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .draws-table .amount { 
      text-align: right;
      font-weight: 600;
      font-family: monospace;
    }
    .draws-table tfoot td {
      font-weight: 700;
      background: #f8fafc;
      padding: 15px 8px;
    }
    .total-amount {
      font-size: 24px;
      color: #2563eb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      color: #666;
      font-size: 12px;
    }
    .signature-area {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      padding-top: 8px;
      margin-top: 40px;
    }
    @media print {
      body { padding: 20px; }
      .wire-box { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Wire Transfer Request</h1>
    <p>Tennant Developments Construction Draw Funding</p>
    <div class="batch-id">Batch ID: ${batchId.slice(0, 8).toUpperCase()}</div>
  </div>

  <div class="section">
    <div class="section-title">Transfer Details</div>
    <div class="info-grid">
      <div class="info-item">
        <label>Date Submitted</label>
        <div class="value">${formatDate(batch.submitted_at || batch.created_at)}</div>
      </div>
      <div class="info-item">
        <label>Total Amount</label>
        <div class="value total-amount">${formatCurrency(batch.total_amount)}</div>
      </div>
      <div class="info-item">
        <label>Number of Draws</label>
        <div class="value">${draws.length}</div>
      </div>
      <div class="info-item">
        <label>Status</label>
        <div class="value">${batch.status === 'funded' ? 'FUNDED' : 'PENDING'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Recipient Information</div>
    <div class="wire-box">
      <div class="bank-name">${builder?.bank_name || 'Bank Name Not Provided'}</div>
      <div class="wire-detail">
        <label>Account Name</label>
        <span class="value">${builder?.bank_account_name || builder?.company_name || 'N/A'}</span>
      </div>
      <div class="wire-detail">
        <label>Routing Number</label>
        <span class="value">${builder?.bank_routing_number || 'N/A'}</span>
      </div>
      <div class="wire-detail">
        <label>Account Number</label>
        <span class="value">${builder?.bank_account_number || 'N/A'}</span>
      </div>
      <div class="wire-detail">
        <label>Company</label>
        <span class="value">${builder?.company_name || 'N/A'}</span>
      </div>
      ${builder?.address_street ? `
      <div class="wire-detail">
        <label>Address</label>
        <span class="value">${builder.address_street}, ${builder.address_city}, ${builder.address_state} ${builder.address_zip}</span>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Draws Included</div>
    <table class="draws-table">
      <thead>
        <tr>
          <th>Project</th>
          <th>Draw #</th>
          <th>Date</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${draws.map((draw: any) => `
        <tr>
          <td>${draw.project?.project_code || draw.project?.name || 'Unknown Project'}</td>
          <td>#${draw.draw_number}</td>
          <td>${draw.request_date ? new Date(draw.request_date).toLocaleDateString() : 'N/A'}</td>
          <td class="amount">${formatCurrency(draw.total_amount)}</td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Total Wire Amount</td>
          <td class="amount total-amount">${formatCurrency(batch.total_amount)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="signature-area">
    <div>
      <div class="signature-line">Authorized By (Print Name)</div>
    </div>
    <div>
      <div class="signature-line">Signature / Date</div>
    </div>
  </div>

  <div class="footer">
    <p>Generated by TD3 Construction Draw Management System</p>
    <p>Report generated: ${new Date().toLocaleString()}</p>
    ${batch.notes ? `<p>Notes: ${batch.notes}</p>` : ''}
  </div>
</body>
</html>
`

    if (format === 'json') {
      return NextResponse.json({
        batch,
        builder,
        draws,
        generatedAt: new Date().toISOString()
      })
    }

    // Return HTML with proper content type for browser printing
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      }
    })

  } catch (error) {
    console.error('Error generating wire batch report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
