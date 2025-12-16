'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveBar } from '@nivo/bar'
import type { Project, DrawRequest } from '@/types/database'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { 
  calculateAmortizationSchedule,
  calculateFeeEscalationSchedule,
  calculatePerDiem,
  calculateTotalPayoff,
  calculateOriginationFee,
  getAmortizationSummary,
  type AmortizationRow,
  type FeeEscalationEntry,
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

const formatRate = (rate: number | null) => {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

/**
 * Amortization Table Report with three view modes:
 * - Table: Draw-by-draw interest calculation table
 * - Cards: Summary cards with key metrics
 * - Chart: Timeline visualization of draws and interest zones
 */
export function AmortizationTable({
  project,
  draws,
  drawLines,
  viewMode,
  payoffDate,
}: AmortizationTableProps) {
  // Calculate amortization schedule
  const schedule = useMemo(() => {
    return calculateAmortizationSchedule(
      drawLines,
      {
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: project.loan_start_date,
        loan_amount: project.loan_amount,
      },
      payoffDate || undefined
    )
  }, [drawLines, project, payoffDate])

  // Calculate fee escalation schedule
  const feeEscalation = useMemo(() => {
    if (!project.loan_start_date) return []
    const startDate = new Date(project.loan_start_date)
    const endDate = payoffDate || new Date()
    return calculateFeeEscalationSchedule(
      project.origination_fee_pct || 0.02,
      startDate,
      endDate
    )
  }, [project.loan_start_date, project.origination_fee_pct, payoffDate])

  // Get summary statistics
  const summary = useMemo(() => getAmortizationSummary(schedule), [schedule])

  // Calculate payoff totals
  const payoffTotals = useMemo(() => {
    const principal = summary.currentPrincipal
    const interest = summary.totalInterest
    const originationFee = calculateOriginationFee(
      project.loan_amount || 0, 
      project.origination_fee_pct || 0.02
    )
    const docFee = 1000 // Standard doc fee
    const total = calculateTotalPayoff(principal, interest, docFee, originationFee)
    const perDiem = calculatePerDiem(principal, project.interest_rate_annual || 0)

    return {
      principal,
      interest,
      originationFee,
      docFee,
      total,
      perDiem,
    }
  }, [summary, project])

  // Render based on view mode
  if (viewMode === 'chart') {
    return (
      <TimelineView 
        schedule={schedule} 
        feeEscalation={feeEscalation}
        project={project}
      />
    )
  }

  if (viewMode === 'cards') {
    return (
      <CardsView 
        summary={summary} 
        payoffTotals={payoffTotals}
        project={project}
        feeEscalation={feeEscalation}
      />
    )
  }

  // Table View (default)
  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="card-ios">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Principal Balance
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {formatCurrencyCompact(summary.currentPrincipal)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Interest
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {formatCurrency(summary.totalInterest)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Per Diem
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: 'var(--warning)' }}>
              {formatCurrency(payoffTotals.perDiem)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Payoff
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: 'var(--success)' }}>
              {formatCurrencyCompact(payoffTotals.total)}
            </div>
          </div>
        </div>
      </div>

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
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-right">Days</th>
                <th className="table-header text-right">Interest</th>
                <th className="table-header text-right">Fee Rate</th>
                <th className="table-header text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`table-row ${row.type === 'payoff' ? 'font-semibold' : ''}`}
                  style={{ 
                    background: row.type === 'payoff' ? 'var(--success-muted)' : undefined 
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
                      {row.type === 'payoff' && (
                        <svg className="w-5 h-5" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span>{row.description}</span>
                    </div>
                  </td>
                  <td className="table-cell text-right" style={{ color: row.type === 'draw' ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {row.amount > 0 ? formatCurrency(row.amount) : '—'}
                  </td>
                  <td className="table-cell text-right" style={{ color: 'var(--text-muted)' }}>
                    {row.days > 0 ? row.days : '—'}
                  </td>
                  <td className="table-cell text-right" style={{ color: row.interest > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {row.interest > 0 ? formatCurrency(row.interest) : '—'}
                  </td>
                  <td className="table-cell text-right">
                    <FeeRateBadge rate={row.feeRate} baseRate={project.origination_fee_pct || 0.02} />
                  </td>
                  <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(row.balance)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot style={{ background: 'var(--bg-hover)' }}>
              <tr>
                <td className="table-cell font-semibold" colSpan={2}>Total</td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatCurrency(summary.currentPrincipal)}
                </td>
                <td className="table-cell text-right font-semibold">{summary.totalDays}</td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--warning)' }}>
                  {formatCurrency(summary.totalInterest)}
                </td>
                <td className="table-cell"></td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(summary.currentPrincipal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Fee Escalation Schedule */}
      {feeEscalation.length > 0 && (
        <div className="card-ios p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fee Escalation Schedule</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              +0.25% per month after month 6
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {feeEscalation.map((entry, index) => (
              <div key={index} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Month {entry.monthNumber}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(entry.date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--text-muted)' }}>{formatRate(entry.previousRate)}</span>
                  <svg className="w-4 h-4" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="font-semibold" style={{ color: 'var(--warning)' }}>{formatRate(entry.newRate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payoff Summary */}
      <div className="card-ios" style={{ borderLeft: '4px solid var(--success)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payoff Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Principal</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(payoffTotals.principal)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Interest Accrued</span>
            <span className="font-medium" style={{ color: 'var(--warning)' }}>{formatCurrency(payoffTotals.interest)}</span>
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

// Fee Rate Badge Component
function FeeRateBadge({ rate, baseRate }: { rate: number; baseRate: number }) {
  const isEscalated = rate > baseRate
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ 
        background: isEscalated ? 'var(--warning-muted)' : 'var(--bg-hover)',
        color: isEscalated ? 'var(--warning)' : 'var(--text-muted)',
      }}
    >
      {formatRate(rate)}
      {isEscalated && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )}
    </span>
  )
}

// Cards View component
function CardsView({
  summary,
  payoffTotals,
  project,
  feeEscalation,
}: {
  summary: ReturnType<typeof getAmortizationSummary>
  payoffTotals: {
    principal: number
    interest: number
    originationFee: number
    docFee: number
    total: number
    perDiem: number
  }
  project: Project
  feeEscalation: FeeEscalationEntry[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Principal Card */}
      <motion.div 
        className="card-ios"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Current Principal
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {formatCurrencyCompact(summary.currentPrincipal)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Max: {formatCurrencyCompact(summary.maxPrincipal)}
            </div>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent-muted)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Interest Card */}
      <motion.div 
        className="card-ios"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Interest
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--warning)' }}>
              {formatCurrency(summary.totalInterest)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Avg: {formatCurrency(summary.avgDailyInterest)}/day
            </div>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--warning-muted)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Per Diem Card */}
      <motion.div 
        className="card-ios"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Per Diem
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--info)' }}>
              {formatCurrency(payoffTotals.perDiem)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Daily interest at current balance
            </div>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--info-muted)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Days Outstanding Card */}
      <motion.div 
        className="card-ios"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Days Outstanding
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {summary.totalDays}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {summary.totalDraws} draw{summary.totalDraws !== 1 ? 's' : ''}
            </div>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-hover)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Fee Rate Card */}
      <motion.div 
        className="card-ios"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Current Fee Rate
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: feeEscalation.length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {formatRate(feeEscalation.length > 0 ? feeEscalation[feeEscalation.length - 1].newRate : (project.origination_fee_pct || 0.02))}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {feeEscalation.length > 0 ? `+${feeEscalation.length} escalation${feeEscalation.length !== 1 ? 's' : ''}` : 'Base rate'}
            </div>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: feeEscalation.length > 0 ? 'var(--warning-muted)' : 'var(--bg-hover)' }}
          >
            <svg className="w-5 h-5" style={{ color: feeEscalation.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Total Payoff Card */}
      <motion.div 
        className="card-ios"
        style={{ borderLeft: '4px solid var(--success)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Payoff
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>
              {formatCurrencyCompact(payoffTotals.total)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Principal + Interest + Fees
            </div>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--success-muted)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Timeline View component
function TimelineView({
  schedule,
  feeEscalation,
  project,
}: {
  schedule: AmortizationRow[]
  feeEscalation: FeeEscalationEntry[]
  project: Project
}) {
  // Prepare data for bar chart
  const chartData = useMemo(() => {
    return schedule
      .filter(row => row.type === 'draw')
      .map(row => ({
        date: formatDate(row.date),
        draw: row.amount,
        interest: row.interest,
        balance: row.balance,
      }))
  }, [schedule])

  if (chartData.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 400 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No draw data available</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Draw funds to see the timeline</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeline Bar Chart */}
      <div className="card-ios p-0" style={{ height: 400 }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Draw Timeline</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Draw amounts with interest accrual
          </p>
        </div>
        <div style={{ height: 340 }}>
          <ResponsiveBar
            data={chartData}
            keys={['draw', 'interest']}
            indexBy="date"
            margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
            padding={0.3}
            groupMode="stacked"
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={['var(--accent)', 'var(--warning)']}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: '',
              legendPosition: 'middle',
              legendOffset: 32,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Amount ($)',
              legendPosition: 'middle',
              legendOffset: -60,
              format: (value) => `$${(value / 1000).toFixed(0)}k`,
            }}
            enableLabel={false}
            legends={[
              {
                dataFrom: 'keys',
                anchor: 'top-right',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: -20,
                itemsSpacing: 20,
                itemWidth: 80,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 12,
                symbolShape: 'circle',
              }
            ]}
            tooltip={({ id, value, color, indexValue }) => (
              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--elevation-2)',
                }}
              >
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {indexValue}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{id}:</span>
                  <span className="text-xs font-semibold" style={{ color }}>{formatCurrency(value)}</span>
                </div>
              </div>
            )}
            theme={{
              background: 'transparent',
              axis: {
                ticks: {
                  text: { fill: 'var(--text-muted)', fontSize: 11 }
                },
                legend: {
                  text: { fill: 'var(--text-muted)', fontSize: 12 }
                }
              },
              legends: {
                text: { fill: 'var(--text-muted)', fontSize: 11 }
              },
              grid: {
                line: { stroke: 'var(--border-subtle)', strokeDasharray: '4 4' }
              }
            }}
          />
        </div>
      </div>

      {/* Fee Escalation Timeline */}
      {feeEscalation.length > 0 && (
        <div className="card-ios">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Fee Escalation Points</h3>
          <div className="relative">
            {/* Timeline Line */}
            <div 
              className="absolute left-3 top-3 bottom-3 w-0.5"
              style={{ background: 'var(--border)' }}
            />
            
            {/* Timeline Points */}
            <div className="space-y-4">
              {feeEscalation.map((entry, index) => (
                <div key={index} className="flex items-center gap-4 relative">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center z-10"
                    style={{ background: 'var(--warning)', color: 'white' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        Month {entry.monthNumber}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(entry.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold" style={{ color: 'var(--warning)' }}>
                        {formatRate(entry.newRate)}
                      </span>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        +0.25%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

