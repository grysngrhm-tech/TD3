import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for reports
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      )
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch budgets with NAHB category grouping
    const { data: budgets, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (budgetError) {
      return NextResponse.json(
        { error: 'Failed to fetch budgets' },
        { status: 500 }
      )
    }

    // Fetch approved/paid draws
    const { data: draws, error: drawsError } = await supabaseAdmin
      .from('draw_requests')
      .select('*, draw_request_lines(*)')
      .eq('project_id', projectId)
      .in('status', ['approved', 'paid'])
      .order('draw_number', { ascending: true })

    // Calculate totals
    const totalOriginal = budgets?.reduce((sum, b) => sum + (b.original_amount || 0), 0) || 0
    const totalCurrent = budgets?.reduce((sum, b) => sum + (b.current_amount || 0), 0) || 0
    const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0
    const totalRemaining = totalCurrent - totalSpent

    // Group by NAHB category
    const categoryTotals: Record<string, {
      nahbCode: string
      nahbCategory: string
      original: number
      current: number
      spent: number
      remaining: number
      lineItems: any[]
    }> = {}

    for (const budget of budgets || []) {
      const key = budget.nahb_category || budget.category || 'Uncategorized'
      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          nahbCode: budget.cost_code || '',
          nahbCategory: key,
          original: 0,
          current: 0,
          spent: 0,
          remaining: 0,
          lineItems: [],
        }
      }
      categoryTotals[key].original += budget.original_amount || 0
      categoryTotals[key].current += budget.current_amount || 0
      categoryTotals[key].spent += budget.spent_amount || 0
      categoryTotals[key].remaining += budget.remaining_amount || 0
      categoryTotals[key].lineItems.push(budget)
    }

    const categories = Object.values(categoryTotals).map(cat => ({
      ...cat,
      percentComplete: cat.current > 0 ? Math.round((cat.spent / cat.current) * 100) : 0,
    }))

    const report = {
      generatedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        address: project.address,
        projectCode: project.project_code,
        builderName: project.builder_name,
        borrowerName: project.borrower_name,
        loanAmount: project.loan_amount,
        status: project.status,
      },
      summary: {
        totalOriginal,
        totalCurrent,
        totalSpent,
        totalRemaining,
        percentComplete: totalCurrent > 0 ? Math.round((totalSpent / totalCurrent) * 100) : 0,
        drawCount: draws?.length || 0,
      },
      categories,
      draws: draws?.map(d => ({
        drawNumber: d.draw_number,
        date: d.request_date,
        amount: d.total_amount,
        status: d.status,
        lineCount: (d as any).draw_request_lines?.length || 0,
      })) || [],
    }

    // Return HTML format if requested
    if (format === 'html') {
      const html = generateHtmlReport(report)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    return NextResponse.json(report)

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateHtmlReport(report: any): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)

  const categoryRows = report.categories.map((cat: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
        <strong>${cat.nahbCategory}</strong>
        ${cat.nahbCode ? `<br><small style="color: #64748b;">${cat.nahbCode}</small>` : ''}
      </td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(cat.original)}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(cat.current)}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(cat.spent)}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(cat.remaining)}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">
        <div style="background: #e2e8f0; border-radius: 4px; overflow: hidden; width: 60px; height: 8px; display: inline-block;">
          <div style="background: #0284c7; width: ${cat.percentComplete}%; height: 100%;"></div>
        </div>
        <span style="margin-left: 8px;">${cat.percentComplete}%</span>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Progress Budget Report - ${report.project.name}</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px 20px; color: #0f172a; }
    h1 { color: #0b406d; margin-bottom: 8px; }
    .meta { color: #64748b; margin-bottom: 32px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card { background: #f8fafc; border-radius: 8px; padding: 16px; }
    .summary-card h3 { font-size: 14px; color: #64748b; margin: 0 0 8px 0; font-weight: normal; }
    .summary-card p { font-size: 24px; font-weight: bold; margin: 0; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th { background: #f1f5f9; text-align: left; padding: 12px 8px; font-weight: 600; color: #0b406d; }
    tfoot td { background: #f1f5f9; font-weight: 600; }
    .print-button { position: fixed; top: 20px; right: 20px; background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    @media print { .print-button { display: none; } }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Print Report</button>
  
  <h1>${report.project.name}</h1>
  <p class="meta">
    ${report.project.address || ''}<br>
    ${report.project.builderName ? `Builder: ${report.project.builderName} • ` : ''}
    Generated: ${new Date(report.generatedAt).toLocaleDateString()}
  </p>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>Total Budget</h3>
      <p>${formatCurrency(report.summary.totalCurrent)}</p>
    </div>
    <div class="summary-card">
      <h3>Total Drawn</h3>
      <p>${formatCurrency(report.summary.totalSpent)}</p>
    </div>
    <div class="summary-card">
      <h3>Remaining</h3>
      <p>${formatCurrency(report.summary.totalRemaining)}</p>
    </div>
    <div class="summary-card">
      <h3>Progress</h3>
      <p>${report.summary.percentComplete}%</p>
    </div>
  </div>

  <h2>Budget Breakdown by Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th style="text-align: right;">Original</th>
        <th style="text-align: right;">Current</th>
        <th style="text-align: right;">Spent</th>
        <th style="text-align: right;">Remaining</th>
        <th style="text-align: right;">Progress</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
    <tfoot>
      <tr>
        <td style="padding: 12px 8px;"><strong>Total</strong></td>
        <td style="padding: 12px 8px; text-align: right;">${formatCurrency(report.summary.totalOriginal)}</td>
        <td style="padding: 12px 8px; text-align: right;">${formatCurrency(report.summary.totalCurrent)}</td>
        <td style="padding: 12px 8px; text-align: right;">${formatCurrency(report.summary.totalSpent)}</td>
        <td style="padding: 12px 8px; text-align: right;">${formatCurrency(report.summary.totalRemaining)}</td>
        <td style="padding: 12px 8px; text-align: right;">${report.summary.percentComplete}%</td>
      </tr>
    </tfoot>
  </table>

  <h2 style="margin-top: 32px;">Draw History (${report.draws.length} draws)</h2>
  <table>
    <thead>
      <tr>
        <th>Draw #</th>
        <th>Date</th>
        <th style="text-align: right;">Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${report.draws.map((d: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">#${d.drawNumber}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date(d.date).toLocaleDateString()}</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(d.amount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${d.status}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `
}

