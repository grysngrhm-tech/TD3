'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { ResponsivePie } from '@nivo/pie'
import type { Project, DrawRequest } from '@/types/custom'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { ChartHeader } from '@/app/components/ui/ChartInfoTooltip'
import { CHART_TOOLTIPS } from '@/lib/constants'
import { 
  calculateAmortizationSchedule,
  calculatePerDiem,
  calculateTotalPayoff,
  calculateOriginationFee,
  getAmortizationSummary,
  type AmortizationRow,
} from '@/lib/calculations'

type DrawLineWithDate = {
  amount: number
  date: string
  drawNumber?: number
}

type AmortizationTableProps = {
  project: Project
  draws: DrawRequest[]
  drawLines: DrawLineWithDate[]
  viewMode: ViewMode
  payoffDate?: Date | null
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatCurrencyCompact = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date: Date | string | null) => {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDateShort = (date: Date | string | null) => {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const formatRate = (rate: number | null) => {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

/**
 * Amortization Table Report with two view modes:
 * - Table: Draw-by-draw interest calculation table with summary header
 * - Chart: Dashboard with 3 visualizations (Balance Growth, Draw Timeline, Interest Analysis)
 */
export function AmortizationTable({
  project,
  draws,
  drawLines,
  viewMode,
  payoffDate,
}: AmortizationTableProps) {
  // Auto-derive loan start date from first funded draw
  const effectiveFeeStartDate = useMemo(() => {
    const fundedDraws = draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    if (fundedDraws.length > 0 && fundedDraws[0].funded_at) {
      return fundedDraws[0].funded_at
    }
    return null
  }, [draws])
  
  // Calculate amortization schedule
  const schedule = useMemo(() => {
    return calculateAmortizationSchedule(
      drawLines,
      {
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: effectiveFeeStartDate,
        loan_amount: project.loan_amount,
      },
      payoffDate || undefined
    )
  }, [drawLines, project, payoffDate, effectiveFeeStartDate])

  // Get summary statistics
  const summary = useMemo(() => getAmortizationSummary(schedule), [schedule])

  // Calculate payoff totals
  const payoffTotals = useMemo(() => {
    const principal = summary.principal
    const interest = summary.totalInterest
    const totalBalance = summary.totalBalance
    const originationFee = calculateOriginationFee(
      project.loan_amount || 0, 
      project.origination_fee_pct || 0.02
    )
    const docFee = 1000 // Standard doc fee
    const total = calculateTotalPayoff(principal, interest, docFee, originationFee)
    const perDiem = calculatePerDiem(totalBalance, project.interest_rate_annual || 0)

    return {
      principal,
      interest,
      totalBalance,
      originationFee,
      docFee,
      total,
      perDiem,
    }
  }, [summary, project])

  // Render based on view mode
  if (viewMode === 'chart') {
    return (
      <ChartDashboard 
        schedule={schedule} 
        summary={summary}
        payoffTotals={payoffTotals}
        project={project}
        drawLines={drawLines}
      />
    )
  }

  // Table View (default)
  // Empty state check
  if (schedule.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 300 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No draw data available</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {!effectiveFeeStartDate 
              ? 'Fee clock starts when the first draw is funded'
              : 'Draw funds to see amortization schedule'
            }
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* NOTE: Summary header removed - now consolidated in PolymorphicLoanDetails */}
      
      {/* Amortization Table */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Interest Accrual Schedule</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Description</th>
                <th className="table-header text-right">Draw Amount</th>
                <th className="table-header text-right">Days</th>
                <th className="table-header text-right">Accrued Interest</th>
                <th className="table-header text-right">Total Interest</th>
                <th className="table-header text-right">Principal</th>
                <th className="table-header text-right">Total Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={`table-row ${row.type === 'payoff' ? 'font-semibold' : ''}`}
                  style={{ 
                    background: row.type === 'payoff' 
                      ? 'var(--success-muted)' 
                      : row.type === 'month_end' 
                        ? 'var(--bg-tertiary)' 
                        : undefined 
                  }}
                >
                  <td className="table-cell">{formatDate(row.date)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {row.type === 'draw' && (
                        <span 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                        >
                          {row.drawNumber || '#'}
                        </span>
                      )}
                      {row.type === 'month_end' && (
                        <span 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                        >
                          📅
                        </span>
                      )}
                      {row.type === 'payoff' && (
                        <svg className="w-5 h-5" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {row.type === 'current' && (
                        <span 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'var(--info-muted)', color: 'var(--info)' }}
                        >
                          ⏱
                        </span>
                      )}
                      <span>{row.description}</span>
                    </div>
                  </td>
                  <td className="table-cell text-right" style={{ color: row.type === 'draw' ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {row.drawAmount > 0 ? formatCurrency(row.drawAmount) : '—'}
                  </td>
                  <td className="table-cell text-right" style={{ color: 'var(--text-muted)' }}>
                    {row.days > 0 ? row.days : '—'}
                  </td>
                  <td className="table-cell text-right" style={{ color: row.accruedInterest > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {row.accruedInterest > 0 ? formatCurrency(row.accruedInterest) : '—'}
                  </td>
                  <td className="table-cell text-right" style={{ color: 'var(--warning)' }}>
                    {formatCurrency(row.totalInterest)}
                  </td>
                  <td className="table-cell text-right" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(row.principal)}
                  </td>
                  <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(row.totalBalance)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot style={{ background: 'var(--bg-hover)' }}>
              <tr>
                <td className="table-cell font-semibold" colSpan={2}>Total</td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatCurrency(summary.principal)}
                </td>
                <td className="table-cell text-right font-semibold">{summary.totalDays}</td>
                <td className="table-cell"></td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--warning)' }}>
                  {formatCurrency(summary.totalInterest)}
                </td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(summary.principal)}
                </td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatCurrency(summary.totalBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payoff Summary */}
      <div className="card-ios" style={{ borderLeft: '4px solid var(--success)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payoff Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Principal (Draws)</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(payoffTotals.principal)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Interest Accrued (Compound)</span>
            <span className="font-medium" style={{ color: 'var(--warning)' }}>{formatCurrency(payoffTotals.interest)}</span>
          </div>
          <div className="flex justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Balance</span>
            <span className="font-medium" style={{ color: 'var(--accent)' }}>{formatCurrency(payoffTotals.totalBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Origination Fee</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(payoffTotals.originationFee)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Doc Fee</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(payoffTotals.docFee)}</span>
          </div>
          <div className="pt-2 border-t flex justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total Payoff</span>
            <span className="font-bold text-lg" style={{ color: 'var(--success)' }}>{formatCurrency(payoffTotals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// CHART DASHBOARD - 3 Visualizations
// =============================================================================

function ChartDashboard({
  schedule,
  summary,
  payoffTotals,
  project,
  drawLines,
}: {
  schedule: AmortizationRow[]
  summary: ReturnType<typeof getAmortizationSummary>
  payoffTotals: {
    principal: number
    interest: number
    totalBalance: number
    originationFee: number
    docFee: number
    total: number
    perDiem: number
  }
  project: Project
  drawLines: DrawLineWithDate[]
}) {
  if (schedule.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 400 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No draw data available</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Draw funds to see charts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Balance Growth Over Time (Full Width) */}
      <BalanceGrowthChart schedule={schedule} payoffTotals={payoffTotals} />
      
      {/* Row 2: Draw Timeline + Interest Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DrawTimelineChart drawLines={drawLines} />
        <InterestAnalysisChart summary={summary} project={project} payoffTotals={payoffTotals} />
      </div>
    </div>
  )
}

// Chart 1: Balance Growth Over Time (Stacked Area with Fees)
function BalanceGrowthChart({ 
  schedule,
  payoffTotals,
}: { 
  schedule: AmortizationRow[]
  payoffTotals: {
    originationFee: number
    docFee: number
    total: number
  }
}) {
  const chartData = useMemo(() => {
    // Get all rows sorted by date
    const rows = schedule.filter(r => r.type === 'draw' || r.type === 'current' || r.type === 'month_end')
    
    if (rows.length === 0) return []
    
    // Calculate fees to add to each point
    const totalFees = payoffTotals.originationFee + payoffTotals.docFee
    
    const principalData = rows.map(row => ({
      x: formatDateShort(row.date),
      y: row.principal,
    }))
    
    const balanceData = rows.map(row => ({
      x: formatDateShort(row.date),
      y: row.totalBalance,
    }))
    
    // Total Payoff = Balance + Fees
    const payoffData = rows.map(row => ({
      x: formatDateShort(row.date),
      y: row.totalBalance + totalFees,
    }))
    
    return [
      { id: 'Principal', data: principalData },
      { id: 'Balance + Interest', data: balanceData },
      { id: 'Total Payoff', data: payoffData },
    ]
  }, [schedule, payoffTotals])

  if (chartData.length === 0 || chartData[0].data.length === 0) {
    return null
  }

  return (
    <div className="card-ios p-0" style={{ height: 350 }}>
      <ChartHeader
        title="Balance Growth Over Time"
        subtitle="Principal + Interest + Fees"
        tooltipTitle={CHART_TOOLTIPS.balanceGrowth.title}
        tooltipDescription={CHART_TOOLTIPS.balanceGrowth.description}
        tooltipFormula={CHART_TOOLTIPS.balanceGrowth.formula}
      />
      <div style={{ height: 290 }}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: -45,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value) => `$${(Number(value) / 1000).toFixed(0)}k`,
          }}
          enableGridX={false}
          enableGridY={true}
          colors={['var(--text-muted)', 'var(--accent)', 'var(--success)']}
          lineWidth={3}
          pointSize={6}
          pointColor={{ from: 'color' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          enableArea={true}
          areaOpacity={0.1}
          useMesh={true}
          legends={[
            {
              anchor: 'top-right',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: -15,
              itemsSpacing: 10,
              itemDirection: 'left-to-right',
              itemWidth: 90,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 10,
              symbolShape: 'circle',
            }
          ]}
          tooltip={({ point }) => (
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {point.data.xFormatted}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ background: point.serieColor }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{point.serieId}:</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrencyCompact(Number(point.data.y))}
                </span>
              </div>
            </div>
          )}
          theme={{
            background: 'transparent',
            axis: {
              ticks: {
                text: { fill: 'var(--text-muted)', fontSize: 10 }
              },
            },
            grid: {
              line: { stroke: 'var(--border-subtle)', strokeDasharray: '4 4' }
            },
            legends: {
              text: { fill: 'var(--text-muted)', fontSize: 10 }
            }
          }}
        />
      </div>
    </div>
  )
}

// Chart 2: Draw Funding Timeline (Lollipop/Bar Chart)
function DrawTimelineChart({ drawLines }: { drawLines: DrawLineWithDate[] }) {
  const chartData = useMemo(() => {
    return drawLines
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((draw, idx) => ({
        draw: `Draw ${draw.drawNumber || idx + 1}`,
        amount: draw.amount,
        date: formatDateShort(draw.date),
      }))
  }, [drawLines])

  if (chartData.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 320 }}>
        <div className="text-center">
          <p style={{ color: 'var(--text-muted)' }}>No draw data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-ios p-0" style={{ height: 320 }}>
      <ChartHeader
        title="Draw Funding Timeline"
        subtitle="Individual draw amounts and dates"
        tooltipTitle={CHART_TOOLTIPS.drawTimeline.title}
        tooltipDescription={CHART_TOOLTIPS.drawTimeline.description}
      />
      <div style={{ height: 260 }}>
        <ResponsiveBar
          data={chartData}
          keys={['amount']}
          indexBy="draw"
          margin={{ top: 20, right: 20, bottom: 60, left: 70 }}
          padding={0.4}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={['var(--accent)']}
          borderRadius={4}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 5,
            tickRotation: -45,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value) => `$${(Number(value) / 1000).toFixed(0)}k`,
          }}
          enableLabel={false}
          tooltip={({ data, value }) => (
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {data.draw}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {data.date}
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: 'var(--accent)' }}>
                {formatCurrencyCompact(value)}
              </div>
            </div>
          )}
          theme={{
            background: 'transparent',
            axis: {
              ticks: {
                text: { fill: 'var(--text-muted)', fontSize: 10 }
              },
            },
            grid: {
              line: { stroke: 'var(--border-subtle)', strokeDasharray: '4 4' }
            }
          }}
        />
      </div>
    </div>
  )
}

// Chart 3: Interest Analysis (Donut + Stats) - Now includes fees
function InterestAnalysisChart({
  summary,
  project,
  payoffTotals,
}: {
  summary: ReturnType<typeof getAmortizationSummary>
  project: Project
  payoffTotals: {
    principal: number
    interest: number
    perDiem: number
    originationFee: number
    docFee: number
    total: number
  }
}) {
  // Expanded pie data with fees
  const pieData = useMemo(() => [
    { id: 'Principal', value: summary.principal, color: 'var(--accent)' },
    { id: 'Interest', value: summary.totalInterest, color: 'var(--warning)' },
    { id: 'Finance Fee', value: payoffTotals.originationFee, color: 'var(--info)' },
    { id: 'Doc Fee', value: payoffTotals.docFee, color: 'var(--success)' },
  ].filter(d => d.value > 0), [summary, payoffTotals])

  const interestPct = payoffTotals.total > 0 
    ? (summary.totalInterest / payoffTotals.total) * 100 
    : 0
    
  const feePct = payoffTotals.total > 0
    ? ((payoffTotals.originationFee + payoffTotals.docFee) / payoffTotals.total) * 100
    : 0

  return (
    <div className="card-ios p-0" style={{ height: 320 }}>
      <ChartHeader
        title="Interest Analysis"
        subtitle="Principal, Interest & Fees breakdown"
        tooltipTitle={CHART_TOOLTIPS.interestAnalysis.title}
        tooltipDescription={CHART_TOOLTIPS.interestAnalysis.description}
      />
      <div className="grid grid-cols-2 h-[260px]">
        {/* Donut Chart */}
        <div className="h-full">
          <ResponsivePie
            data={pieData}
            margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
            innerRadius={0.55}
            padAngle={1.5}
            cornerRadius={3}
            activeOuterRadiusOffset={4}
            colors={{ datum: 'data.color' }}
            borderWidth={0}
            enableArcLinkLabels={false}
            arcLabelsSkipAngle={25}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            tooltip={({ datum }) => (
              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--elevation-2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: datum.color }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {datum.id}: {formatCurrencyCompact(datum.value)}
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {((datum.value / payoffTotals.total) * 100).toFixed(1)}% of total
                </div>
              </div>
            )}
            theme={{
              labels: {
                text: { fill: 'var(--text-primary)', fontSize: 10 }
              }
            }}
          />
        </div>
        
        {/* Stats Panel */}
        <div className="flex flex-col justify-center pr-4 space-y-2">
          <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Interest Rate</div>
            <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatRate(project.interest_rate_annual || 0)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Per Diem</div>
            <div className="text-base font-bold" style={{ color: 'var(--info)' }}>
              {formatCurrency(payoffTotals.perDiem)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Finance Fee ({formatRate(project.origination_fee_pct || 0.02)})</div>
            <div className="text-base font-bold" style={{ color: 'var(--info)' }}>
              {formatCurrency(payoffTotals.originationFee)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Doc Fee</div>
            <div className="text-base font-bold" style={{ color: 'var(--success)' }}>
              {formatCurrency(payoffTotals.docFee)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Days Outstanding</div>
            <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {summary.totalDays}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
