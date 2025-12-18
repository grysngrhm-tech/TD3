'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveBar } from '@nivo/bar'
import type { Project, DrawRequest } from '@/types/database'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import {
  calculatePayoffBreakdown,
  projectPayoffAtDate,
  generateProjectionData,
  type PayoffBreakdown,
  type ProjectionDataPoint,
} from '@/lib/calculations'
import {
  resolveEffectiveTerms,
  getDaysToMaturity,
  getUrgencyLevel,
  getUrgencyColor,
  generateFeeSchedule,
  type LoanTerms,
} from '@/lib/loanTerms'

type DrawLineWithDate = {
  amount: number
  date: string
  drawNumber?: number
}

type PayoffReportProps = {
  project: Project
  draws: DrawRequest[]
  drawLines: DrawLineWithDate[]
  viewMode: ViewMode
  onLoanCompleted?: () => void
  // Lifted state from parent (interactive controls moved to polymorphic header)
  payoffDate?: string
  onPayoffDateChange?: (date: string) => void
  projectionDays?: number
  onProjectionDaysChange?: (days: number) => void
  whatIfDate?: string
  onWhatIfDateChange?: (date: string) => void
  customFeeStartDate?: string | null
  onCustomFeeStartDateChange?: (date: string | null) => void
}

// =============================================================================
// FORMATTERS
// =============================================================================

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatCurrencyWhole = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatRate = (rate: number) => `${(rate * 100).toFixed(2)}%`

const formatDate = (date: Date | string | null) => {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PayoffReport({
  project,
  draws,
  drawLines,
  viewMode,
  onLoanCompleted,
  payoffDate: externalPayoffDate,
  onPayoffDateChange,
  projectionDays: externalProjectionDays,
  onProjectionDaysChange,
  whatIfDate: externalWhatIfDate,
  onWhatIfDateChange,
  customFeeStartDate: externalCustomFeeStartDate,
  onCustomFeeStartDateChange,
}: PayoffReportProps) {
  // Use external state if provided, otherwise use internal state
  const [internalPayoffDate, setInternalPayoffDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const payoffDate = externalPayoffDate ?? internalPayoffDate
  const setPayoffDate = onPayoffDateChange ?? setInternalPayoffDate
  
  // Auto-derive loan start date from first funded draw
  const autoLoanStartDate = useMemo(() => {
    const fundedDraws = draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    if (fundedDraws.length > 0 && fundedDraws[0].funded_at) {
      return new Date(fundedDraws[0].funded_at).toISOString().split('T')[0]
    }
    return null
  }, [draws])
  
  // State for payoff completion
  const [payoffAmount, setPayoffAmount] = useState<string>('')
  const [payoffApproved, setPayoffApproved] = useState(false)
  const [completing, setCompleting] = useState(false)
  
  // Effective fee start date: user override > auto-derived from first funded draw
  const effectiveFeeStartDate = externalCustomFeeStartDate ?? autoLoanStartDate
  
  // Resolve loan terms
  const terms = useMemo(() => {
    return resolveEffectiveTerms(project)
  }, [project])
  
  // Calculate current payoff breakdown
  const currentPayoff = useMemo(() => {
    const date = payoffDate ? new Date(payoffDate) : new Date()
    return calculatePayoffBreakdown(
      {
        loan_amount: project.loan_amount,
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: effectiveFeeStartDate,
      },
      drawLines,
      date,
      terms
    )
  }, [project, drawLines, payoffDate, terms, effectiveFeeStartDate])
  
  // Calculate projection data for chart
  const projectionData = useMemo(() => {
    return generateProjectionData(
      {
        loan_amount: project.loan_amount,
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: effectiveFeeStartDate,
      },
      drawLines,
      terms,
      18 // Show 18 months
    )
  }, [project, drawLines, terms, effectiveFeeStartDate])
  
  // Calculate urgency
  const daysToMaturity = getDaysToMaturity(project.maturity_date)
  const urgencyLevel = daysToMaturity !== null ? getUrgencyLevel(daysToMaturity) : 'normal'
  const urgencyColor = getUrgencyColor(urgencyLevel)
  
  // Fee schedule
  const feeSchedule = useMemo(() => {
    if (!effectiveFeeStartDate) return []
    return generateFeeSchedule(new Date(effectiveFeeStartDate), 18, terms)
  }, [effectiveFeeStartDate, terms])
  
  // Handle loan completion
  const handleCompleteLoan = async () => {
    if (!payoffApproved) return
    
    const finalAmount = payoffAmount ? parseFloat(payoffAmount) : currentPayoff.totalPayoff
    
    setCompleting(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          lifecycle_stage: 'historic',
          payoff_approved: true,
          payoff_approved_at: new Date().toISOString(),
          payoff_date: payoffDate,
          payoff_amount: finalAmount,
          stage_changed_at: new Date().toISOString(),
        })
        .eq('id', project.id)
      
      if (error) throw error
      
      toast({
        type: 'success',
        title: 'Loan Completed',
        message: 'The loan has been marked as paid off and moved to historic.',
      })
      onLoanCompleted?.()
    } catch (err: any) {
      console.error('Completion error:', err)
      toast({ type: 'error', title: 'Error', message: err.message || 'Failed to complete loan' })
    } finally {
      setCompleting(false)
    }
  }
  
  // Check if we have an effective fee start date
  const noFeeStartDate = !effectiveFeeStartDate
  
  return (
    <div className="space-y-6">
      {/* Info banner for fee clock start date */}
      {noFeeStartDate && (
        <div className="card-ios flex items-start gap-3" style={{ borderLeft: '4px solid var(--warning)' }}>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>No Funded Draws Yet</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              The fee clock starts when the first draw is funded. Fee escalation and interest projections will become available after the first draw is funded.
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'table' && (
        <PayoffStatementView
          project={project}
          payoff={currentPayoff}
          payoffDate={payoffDate}
          setPayoffDate={setPayoffDate}
          daysToMaturity={daysToMaturity}
          urgencyLevel={urgencyLevel}
          urgencyColor={urgencyColor}
        />
      )}
      
      {viewMode === 'chart' && (
        <ChartDashboard
          project={project}
          projectionData={projectionData}
          currentPayoff={currentPayoff}
          terms={terms}
          effectiveFeeStartDate={effectiveFeeStartDate}
          feeSchedule={feeSchedule}
          drawLines={drawLines}
        />
      )}
      
      {/* Complete Loan Section - Always visible for active projects */}
      {project.lifecycle_stage === 'active' && (
        <CompleteLoanSection
          payoff={currentPayoff}
          payoffAmount={payoffAmount}
          setPayoffAmount={setPayoffAmount}
          payoffDate={payoffDate}
          setPayoffDate={setPayoffDate}
          payoffApproved={payoffApproved}
          setPayoffApproved={setPayoffApproved}
          completing={completing}
          onComplete={handleCompleteLoan}
        />
      )}
    </div>
  )
}

// =============================================================================
// VIEW 1: PAYOFF STATEMENT (Table Mode)
// =============================================================================

function PayoffStatementView({
  project,
  payoff,
  payoffDate,
  setPayoffDate,
  daysToMaturity,
  urgencyLevel,
  urgencyColor,
}: {
  project: Project
  payoff: PayoffBreakdown
  payoffDate: string
  setPayoffDate: (date: string) => void
  daysToMaturity: number | null
  urgencyLevel: string
  urgencyColor: string
}) {
  return (
    <div className="card-ios">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Payoff Statement
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {project.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Good Through</div>
          <input
            type="date"
            value={payoffDate}
            onChange={(e) => setPayoffDate(e.target.value)}
            className="input text-sm mt-1"
            style={{ background: 'var(--bg-secondary)' }}
          />
        </div>
      </div>
      
      {/* Urgency Banner */}
      {daysToMaturity !== null && daysToMaturity <= 30 && (
        <div 
          className="mb-6 p-3 rounded-lg flex items-center gap-3"
          style={{ 
            background: urgencyLevel === 'critical' ? 'var(--error-muted)' : 'var(--warning-muted)',
            border: `1px solid ${urgencyColor}`
          }}
        >
          <svg className="w-5 h-5" style={{ color: urgencyColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ color: 'var(--text-primary)' }}>
            {daysToMaturity < 0 
              ? `Loan matured ${Math.abs(daysToMaturity)} days ago`
              : `Maturity in ${daysToMaturity} days`
            }
          </span>
        </div>
      )}
      
      {/* Loan Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Borrower
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {project.borrower_name || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Property
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {project.address || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Loan Number
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {project.project_code || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Maturity Date
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatDate(project.maturity_date)}
          </div>
        </div>
      </div>
      
      {/* Payoff Breakdown Table */}
      <table className="w-full mb-6">
        <tbody>
          <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <td className="py-3" style={{ color: 'var(--text-secondary)' }}>Principal Balance</td>
            <td className="py-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(payoff.principalBalance)}
            </td>
          </tr>
          <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <td className="py-3" style={{ color: 'var(--text-secondary)' }}>
              Accrued Interest ({payoff.daysOfInterest} days @ {formatCurrency(payoff.perDiem)}/day)
            </td>
            <td className="py-3 text-right font-medium" style={{ color: 'var(--warning)' }}>
              {formatCurrency(payoff.accruedInterest)}
            </td>
          </tr>
          <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <td className="py-3" style={{ color: 'var(--text-secondary)' }}>
              Finance Fee ({payoff.feeRatePct} of loan)
              {payoff.isExtension && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--error-muted)', color: 'var(--error)' }}>
                  Extension
                </span>
              )}
            </td>
            <td className="py-3 text-right font-medium" style={{ color: payoff.isExtension ? 'var(--error)' : 'var(--text-primary)' }}>
              {formatCurrency(payoff.financeFee)}
            </td>
          </tr>
          <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <td className="py-3" style={{ color: 'var(--text-secondary)' }}>Document Fee</td>
            <td className="py-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(payoff.documentFee)}
            </td>
          </tr>
          {payoff.credits > 0 && (
            <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <td className="py-3" style={{ color: 'var(--text-secondary)' }}>Less: Credits/Adjustments</td>
              <td className="py-3 text-right font-medium" style={{ color: 'var(--success)' }}>
                ({formatCurrency(payoff.credits)})
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Total Payoff Amount
            </td>
            <td className="py-4 text-right text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatCurrency(payoff.totalPayoff)}
            </td>
          </tr>
        </tfoot>
      </table>
      
      {/* Per Diem Notice */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--info-muted)', border: '1px solid var(--info)' }}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Per Diem Interest</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              For dates beyond {formatDate(payoff.goodThroughDate)}, add <strong>{formatCurrency(payoff.perDiem)}</strong> per day.
            </div>
          </div>
        </div>
      </div>
      
      {/* Print Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Statement
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// VIEW 2: CHART DASHBOARD (Chart Mode) - 3 Visualizations
// =============================================================================

function ChartDashboard({
  project,
  projectionData,
  currentPayoff,
  terms,
  effectiveFeeStartDate,
  feeSchedule,
  drawLines,
}: {
  project: Project
  projectionData: ProjectionDataPoint[]
  currentPayoff: PayoffBreakdown
  terms: LoanTerms
  effectiveFeeStartDate: string | null
  feeSchedule: ReturnType<typeof generateFeeSchedule>
  drawLines: DrawLineWithDate[]
}) {
  // Empty state check
  if (projectionData.length === 0 || !effectiveFeeStartDate) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 400 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No projection data available</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Fee clock starts when first draw is funded</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Fee Escalation Timeline (Full Width) */}
      <FeeEscalationChart 
        feeSchedule={feeSchedule} 
        currentMonthNumber={currentPayoff.monthNumber}
        terms={terms}
      />
      
      {/* Row 2: Payoff Projection + What-If Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PayoffProjectionChart 
          projectionData={projectionData}
          project={project}
        />
        <WhatIfComparisonChart 
          currentPayoff={currentPayoff}
          effectiveFeeStartDate={effectiveFeeStartDate}
          terms={terms}
        />
      </div>
    </div>
  )
}

// Chart 1: Fee Escalation Timeline
function FeeEscalationChart({
  feeSchedule,
  currentMonthNumber,
  terms,
}: {
  feeSchedule: ReturnType<typeof generateFeeSchedule>
  currentMonthNumber: number
  terms: LoanTerms
}) {
  const chartData = useMemo(() => {
    return [{
      id: 'Fee Rate',
      data: feeSchedule.map(entry => ({
        x: `M${entry.month}`,
        y: entry.feeRate * 100,
        isExtension: entry.isExtensionMonth,
        isCurrent: entry.month === currentMonthNumber,
      }))
    }]
  }, [feeSchedule, currentMonthNumber])

  if (feeSchedule.length === 0) return null

  return (
    <div className="card-ios p-0" style={{ height: 280 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fee Escalation Timeline</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Finance fee rate progression over 18 months
        </p>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 30, bottom: 40, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          curve="stepAfter"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: v => `${v}%`,
          }}
          enableGridX={false}
          enableGridY={true}
          colors={['var(--warning)']}
          lineWidth={3}
          pointSize={0}
          enableArea={true}
          areaOpacity={0.15}
          useMesh={true}
          tooltip={({ point }) => {
            const data = point.data as any
            return (
              <div
                className="p-2 rounded-lg shadow-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Month {String(point.data.x).replace('M', '')}
                </div>
                <div className="text-sm" style={{ color: data.isExtension ? 'var(--error)' : 'var(--warning)' }}>
                  Fee Rate: {point.data.yFormatted}%
                  {data.isExtension && ' (Extension)'}
                </div>
              </div>
            )
          }}
          markers={[
            // Extension marker at month 13
            {
              axis: 'x',
              value: 'M13',
              lineStyle: { stroke: 'var(--error)', strokeWidth: 2, strokeDasharray: '4 4' },
              legend: 'Extension',
              legendPosition: 'top',
              textStyle: { fill: 'var(--error)', fontSize: 10 },
            },
            // Current month marker
            {
              axis: 'x',
              value: `M${currentMonthNumber}`,
              lineStyle: { stroke: 'var(--accent)', strokeWidth: 2 },
              legend: 'Now',
              legendPosition: 'top',
              textStyle: { fill: 'var(--accent)', fontSize: 10 },
            },
          ]}
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
          }}
        />
      </div>
    </div>
  )
}

// Chart 2: Payoff Projection Over Time
function PayoffProjectionChart({
  projectionData,
  project,
}: {
  projectionData: ProjectionDataPoint[]
  project: Project
}) {
  const chartData = useMemo(() => {
    const interestLine = projectionData.map(d => ({
      x: d.date,
      y: d.cumulativeInterest,
    }))
    
    const payoffLine = projectionData.map(d => ({
      x: d.date,
      y: d.totalPayoff,
    }))
    
    return [
      { id: 'Interest', data: interestLine },
      { id: 'Total Payoff', data: payoffLine },
    ]
  }, [projectionData])

  const currentIdx = projectionData.findIndex(d => d.isCurrentMonth)

  return (
    <div className="card-ios p-0" style={{ height: 320 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Payoff Projection</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Interest and total payoff growth over time
        </p>
      </div>
      <div style={{ height: 260 }}>
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
            format: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
          }}
          enableGridX={false}
          enableGridY={true}
          colors={['var(--warning)', 'var(--accent)']}
          lineWidth={2}
          pointSize={0}
          enableArea={true}
          areaOpacity={0.1}
          useMesh={true}
          legends={[
            {
              anchor: 'top-right',
              direction: 'row',
              translateX: 0,
              translateY: -15,
              itemsSpacing: 20,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 10,
              symbolShape: 'circle',
            }
          ]}
          tooltip={({ point }) => (
            <div
              className="p-3 rounded-lg shadow-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                {point.data.xFormatted}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: point.serieColor }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{point.serieId}:</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrencyWhole(Number(point.data.y))}
                </span>
              </div>
            </div>
          )}
          markers={[
            ...(currentIdx >= 0 ? [{
              axis: 'x' as const,
              value: projectionData[currentIdx]?.date || '',
              lineStyle: { stroke: 'var(--accent)', strokeWidth: 2 },
              legend: 'Today',
              legendPosition: 'top' as const,
              textStyle: { fill: 'var(--accent)', fontSize: 10 },
            }] : []),
          ]}
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

// Chart 3: What-If Date Comparison
function WhatIfComparisonChart({
  currentPayoff,
  effectiveFeeStartDate,
  terms,
}: {
  currentPayoff: PayoffBreakdown
  effectiveFeeStartDate: string
  terms: LoanTerms
}) {
  // Calculate payoff at different future dates
  const comparisonData = useMemo(() => {
    const intervals = [0, 7, 14, 30, 60, 90]
    const baseDate = new Date()
    
    return intervals.map(days => {
      const futureDate = new Date(baseDate)
      futureDate.setDate(futureDate.getDate() + days)
      
      const projected = projectPayoffAtDate(
        currentPayoff,
        futureDate,
        new Date(effectiveFeeStartDate),
        terms
      )
      
      return {
        label: days === 0 ? 'Today' : `+${days}d`,
        days,
        principal: projected.principalBalance,
        interest: projected.accruedInterest,
        fees: projected.financeFee + projected.documentFee,
        total: projected.totalPayoff,
        delta: projected.totalPayoff - currentPayoff.totalPayoff,
      }
    })
  }, [currentPayoff, effectiveFeeStartDate, terms])

  return (
    <div className="card-ios p-0" style={{ height: 320 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>What-If Comparison</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Payoff amount at different dates
        </p>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveBar
          data={comparisonData}
          keys={['principal', 'interest', 'fees']}
          indexBy="label"
          margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
          padding={0.3}
          groupMode="stacked"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={['var(--text-muted)', 'var(--warning)', 'var(--accent)']}
          borderRadius={2}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
          }}
          enableLabel={false}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'top-right',
              direction: 'row',
              translateX: 0,
              translateY: -15,
              itemsSpacing: 10,
              itemWidth: 60,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.75,
              symbolSize: 10,
              symbolShape: 'circle',
            }
          ]}
          tooltip={({ id, value, indexValue, data }) => (
            <div
              className="p-3 rounded-lg shadow-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                {indexValue}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {id}: {formatCurrencyWhole(value)}
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: 'var(--accent)' }}>
                Total: {formatCurrencyWhole(data.total)}
              </div>
              {data.delta > 0 && (
                <div className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                  +{formatCurrencyWhole(data.delta)} vs today
                </div>
              )}
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

// =============================================================================
// COMPLETE LOAN SECTION
// =============================================================================

function CompleteLoanSection({
  payoff,
  payoffAmount,
  setPayoffAmount,
  payoffDate,
  setPayoffDate,
  payoffApproved,
  setPayoffApproved,
  completing,
  onComplete,
}: {
  payoff: PayoffBreakdown
  payoffAmount: string
  setPayoffAmount: (amount: string) => void
  payoffDate: string
  setPayoffDate: (date: string) => void
  payoffApproved: boolean
  setPayoffApproved: (approved: boolean) => void
  completing: boolean
  onComplete: () => void
}) {
  return (
    <div 
      className="card-ios"
      style={{ borderLeft: '4px solid var(--success)' }}
    >
      <div className="mb-4">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Complete Loan
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Record payoff to mark loan as paid and transition to historic status
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Payoff Amount */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Payoff Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>$</span>
            <input
              type="number"
              value={payoffAmount}
              onChange={(e) => setPayoffAmount(e.target.value)}
              placeholder={payoff.totalPayoff.toFixed(2)}
              className="input w-full pl-7"
              style={{ background: 'var(--bg-secondary)' }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Calculated: {formatCurrency(payoff.totalPayoff)}
          </div>
        </div>
        
        {/* Payoff Date */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Payoff Date
          </label>
          <input
            type="date"
            value={payoffDate}
            onChange={(e) => setPayoffDate(e.target.value)}
            className="input w-full"
            style={{ background: 'var(--bg-secondary)' }}
          />
        </div>
        
        {/* Approval Checkbox */}
        <div className="flex items-center">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={payoffApproved}
              onChange={(e) => setPayoffApproved(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
              style={{ accentColor: 'var(--success)' }}
            />
            <div>
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                Payoff Confirmed
              </span>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                I confirm the payoff has been received
              </p>
            </div>
          </label>
        </div>
      </div>
      
      {/* Complete Button */}
      <button
        onClick={onComplete}
        disabled={!payoffApproved || completing}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-ios font-medium transition-all"
        style={{
          background: (payoffApproved && !completing) ? 'var(--success)' : 'var(--bg-hover)',
          color: (payoffApproved && !completing) ? 'white' : 'var(--text-muted)',
          opacity: (!payoffApproved || completing) ? 0.6 : 1,
          cursor: (!payoffApproved || completing) ? 'not-allowed' : 'pointer',
        }}
      >
        {completing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
            Completing...
          </>
        ) : (
          <>
            Complete Loan
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </>
        )}
      </button>
    </div>
  )
}
