'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveBar } from '@nivo/bar'
import type { Project, DrawRequest } from '@/types/custom'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import { ChartHeader } from '@/app/components/ui/ChartInfoTooltip'
import { CHART_TOOLTIPS } from '@/lib/constants'
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
import { formatCurrency, formatCurrencyWhole, formatRate, formatDate } from '@/lib/formatters'

// Credit type for payoff adjustments
type PayoffCredit = {
  id: string
  description: string
  amount: number
}

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
  // Credits for payoff adjustments
  credits?: PayoffCredit[]
  onCreditsChange?: (credits: PayoffCredit[]) => void
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
  credits: externalCredits,
  onCreditsChange,
}: PayoffReportProps) {
  // Use external state if provided, otherwise use internal state
  const [internalPayoffDate, setInternalPayoffDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const payoffDate = externalPayoffDate ?? internalPayoffDate
  const setPayoffDate = onPayoffDateChange ?? setInternalPayoffDate
  
  // What-If date state
  const [internalWhatIfDate, setInternalWhatIfDate] = useState<string>('')
  const whatIfDate = externalWhatIfDate ?? internalWhatIfDate
  const setWhatIfDate = onWhatIfDateChange ?? setInternalWhatIfDate
  
  // Credits state
  const [internalCredits, setInternalCredits] = useState<PayoffCredit[]>([])
  const credits = externalCredits ?? internalCredits
  const setCredits = onCreditsChange ?? setInternalCredits
  
  // Calculate total credits
  const totalCredits = useMemo(() => 
    credits.reduce((sum, c) => sum + c.amount, 0), 
    [credits]
  )
  
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
  
  // Calculate current payoff breakdown (with credits applied)
  const currentPayoff = useMemo(() => {
    const date = payoffDate ? new Date(payoffDate) : new Date()
    const breakdown = calculatePayoffBreakdown(
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
    
    // Apply credits
    return {
      ...breakdown,
      credits: totalCredits,
      totalPayoff: breakdown.totalPayoff - totalCredits,
    }
  }, [project, drawLines, payoffDate, terms, effectiveFeeStartDate, totalCredits])
  
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
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium text-text-primary">No Funded Draws Yet</div>
            <div className="text-sm text-text-muted">
              The fee clock starts when the first draw is funded. Fee escalation and interest projections will become available after the first draw is funded.
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'table' && (
        <>
          {/* Credits Manager */}
          <CreditsManager
            credits={credits}
            onCreditsChange={setCredits}
            totalCredits={totalCredits}
          />
          
          <PayoffStatementView
            project={project}
            payoff={currentPayoff}
            payoffDate={payoffDate}
            setPayoffDate={setPayoffDate}
            daysToMaturity={daysToMaturity}
            urgencyLevel={urgencyLevel}
            urgencyColor={urgencyColor}
            credits={credits}
          />
          
          {/* Title Company Report Generator */}
          <PayoffLetterGenerator
            project={project}
            payoff={currentPayoff}
            payoffDate={payoffDate}
            credits={credits}
          />
        </>
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
          whatIfDate={whatIfDate}
          onWhatIfDateChange={setWhatIfDate}
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
  credits,
}: {
  project: Project
  payoff: PayoffBreakdown
  payoffDate: string
  setPayoffDate: (date: string) => void
  daysToMaturity: number | null
  urgencyLevel: string
  urgencyColor: string
  credits: PayoffCredit[]
}) {
  return (
    <div className="card-ios">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-border-subtle">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Payoff Statement
          </h2>
          <p className="text-sm mt-1 text-text-muted">
            {project.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-muted">Good Through</div>
          <input
            type="date"
            value={payoffDate}
            onChange={(e) => setPayoffDate(e.target.value)}
            className="input text-sm mt-1 bg-background-secondary"
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
          <span className="text-text-primary">
            {daysToMaturity < 0 
              ? `Loan matured ${Math.abs(daysToMaturity)} days ago`
              : `Maturity in ${daysToMaturity} days`
            }
          </span>
        </div>
      )}
      
      {/* Loan Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-background-secondary">
        <div>
          <div className="text-xs uppercase tracking-wider mb-1 text-text-muted">
            Borrower
          </div>
          <div className="font-medium text-text-primary">
            {project.borrower_name || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1 text-text-muted">
            Property
          </div>
          <div className="font-medium text-text-primary">
            {project.address || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1 text-text-muted">
            Loan Number
          </div>
          <div className="font-medium text-text-primary">
            {project.project_code || '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-1 text-text-muted">
            Maturity Date
          </div>
          <div className="font-medium text-text-primary">
            {formatDate(project.maturity_date)}
          </div>
        </div>
      </div>
      
      {/* Payoff Breakdown Table */}
      <table className="w-full mb-6">
        <tbody>
          <tr className="border-b border-border-subtle">
            <td className="py-3 text-text-secondary">Principal Balance</td>
            <td className="py-3 text-right font-medium text-text-primary">
              {formatCurrency(payoff.principalBalance)}
            </td>
          </tr>
          <tr className="border-b border-border-subtle">
            <td className="py-3 text-text-secondary">
              Accrued Interest ({payoff.daysOfInterest} days @ {formatCurrency(payoff.perDiem)}/day)
            </td>
            <td className="py-3 text-right font-medium text-warning">
              {formatCurrency(payoff.accruedInterest)}
            </td>
          </tr>
          <tr className="border-b border-border-subtle">
            <td className="py-3 text-text-secondary">
              Finance Fee ({payoff.feeRatePct} of loan)
              {payoff.isExtension && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-error-muted text-error">
                  Extension
                </span>
              )}
            </td>
            <td className="py-3 text-right font-medium" style={{ color: payoff.isExtension ? 'var(--error)' : 'var(--text-primary)' }}>
              {formatCurrency(payoff.financeFee)}
            </td>
          </tr>
          <tr className="border-b border-border-subtle">
            <td className="py-3 text-text-secondary">Document Fee</td>
            <td className="py-3 text-right font-medium text-text-primary">
              {formatCurrency(payoff.documentFee)}
            </td>
          </tr>
          {credits.length > 0 && (
            <>
              {credits.map((credit) => (
                <tr key={credit.id} className="border-b border-border-subtle">
                  <td className="py-3 text-text-secondary">
                    Less: {credit.description || 'Credit'}
                  </td>
                  <td className="py-3 text-right font-medium text-success">
                    ({formatCurrency(credit.amount)})
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-4 text-lg font-bold text-text-primary">
              Total Payoff Amount
            </td>
            <td className="py-4 text-right text-2xl font-bold text-accent">
              {formatCurrency(payoff.totalPayoff)}
            </td>
          </tr>
        </tfoot>
      </table>
      
      {/* Per Diem Notice */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--info-muted)', border: '1px solid var(--info)' }}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-info"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium text-text-primary">Per Diem Interest</div>
            <div className="text-sm mt-1 text-text-secondary">
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
  whatIfDate,
  onWhatIfDateChange,
}: {
  project: Project
  projectionData: ProjectionDataPoint[]
  currentPayoff: PayoffBreakdown
  terms: LoanTerms
  effectiveFeeStartDate: string | null
  feeSchedule: ReturnType<typeof generateFeeSchedule>
  drawLines: DrawLineWithDate[]
  whatIfDate: string
  onWhatIfDateChange: (date: string) => void
}) {
  // Empty state check
  if (projectionData.length === 0 || !effectiveFeeStartDate) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 400 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-text-muted"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-text-muted">No projection data available</p>
          <p className="text-sm mt-1 text-text-muted">Fee clock starts when first draw is funded</p>
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
          customDate={whatIfDate}
          onCustomDateChange={onWhatIfDateChange}
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
      <ChartHeader
        title="Fee Escalation Timeline"
        subtitle="Finance fee rate progression over 18 months"
        tooltipTitle={CHART_TOOLTIPS.feeEscalation.title}
        tooltipDescription={CHART_TOOLTIPS.feeEscalation.description}
        tooltipFormula={CHART_TOOLTIPS.feeEscalation.formula}
      />
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
                <div className="font-medium text-text-primary">
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
      <ChartHeader
        title="Payoff Projection"
        subtitle="Interest and total payoff growth over time"
        tooltipTitle={CHART_TOOLTIPS.payoffProjection.title}
        tooltipDescription={CHART_TOOLTIPS.payoffProjection.description}
      />
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
              <div className="text-xs mb-1 text-text-muted">
                {point.data.xFormatted}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: point.serieColor }} />
                <span className="text-sm text-text-secondary">{point.serieId}:</span>
                <span className="font-medium text-text-primary">
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

// Chart 3: What-If Date Comparison (with custom date picker)
function WhatIfComparisonChart({
  currentPayoff,
  effectiveFeeStartDate,
  terms,
  customDate,
  onCustomDateChange,
}: {
  currentPayoff: PayoffBreakdown
  effectiveFeeStartDate: string
  terms: LoanTerms
  customDate: string
  onCustomDateChange: (date: string) => void
}) {
  // Calculate payoff at different future dates including custom date
  const comparisonData = useMemo(() => {
    const intervals = [0, 7, 14, 30, 60, 90]
    const baseDate = new Date()
    
    const data = intervals.map(days => {
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
        isCustom: false,
      }
    })
    
    // Add custom date if provided
    if (customDate) {
      const customDateObj = new Date(customDate)
      const daysDiff = Math.round((customDateObj.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 0 && !intervals.includes(daysDiff)) {
        const projected = projectPayoffAtDate(
          currentPayoff,
          customDateObj,
          new Date(effectiveFeeStartDate),
          terms
        )
        
        // Insert in sorted order
        const customEntry = {
          label: formatDate(customDateObj),
          days: daysDiff,
          principal: projected.principalBalance,
          interest: projected.accruedInterest,
          fees: projected.financeFee + projected.documentFee,
          total: projected.totalPayoff,
          delta: projected.totalPayoff - currentPayoff.totalPayoff,
          isCustom: true,
        }
        
        // Find insert position
        const insertIdx = data.findIndex(d => d.days > daysDiff)
        if (insertIdx === -1) {
          data.push(customEntry)
        } else {
          data.splice(insertIdx, 0, customEntry)
        }
      }
    }
    
    return data
  }, [currentPayoff, effectiveFeeStartDate, terms, customDate])

  // Calculate delta from today for header
  const maxDelta = comparisonData.length > 0 
    ? comparisonData[comparisonData.length - 1].delta 
    : 0

  return (
    <div className="card-ios p-0" style={{ height: 380 }}>
      <ChartHeader
        title="What-If Comparison"
        subtitle={maxDelta > 0 ? `Cost of waiting: ${formatCurrency(maxDelta)} at 90 days` : 'Compare payoff at different dates'}
        tooltipTitle={CHART_TOOLTIPS.whatIfComparison.title}
        tooltipDescription={CHART_TOOLTIPS.whatIfComparison.description}
      />
      
      {/* Custom Date Picker */}
      <div className="px-4 py-2 border-b border-border-subtle flex items-center gap-3">
        <label className="text-xs text-text-muted">
          Compare custom date:
        </label>
        <input
          type="date"
          value={customDate}
          onChange={(e) => onCustomDateChange(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="input text-sm py-1 px-2"
          style={{ background: 'var(--bg-secondary)', minWidth: '140px' }}
        />
        {customDate && (
          <button
            onClick={() => onCustomDateChange('')}
            className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-hover)] transition-colors text-text-muted"
            
          >
            Clear
          </button>
        )}
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
          colors={({ id, data }: { id: string; data: Record<string, unknown> }) => {
            // Use different color for custom date
            const isCustom = data?.isCustom as boolean
            if (isCustom) {
              if (id === 'principal') return 'var(--info)'
              if (id === 'interest') return '#f97316' // orange
              return 'var(--success)'
            }
            if (id === 'principal') return 'var(--text-muted)'
            if (id === 'interest') return 'var(--warning)'
            return 'var(--accent)'
          }}
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
              <div className="font-medium mb-1 text-text-primary">
                {indexValue}
              </div>
              <div className="text-sm text-text-secondary">
                {id}: {formatCurrencyWhole(value)}
              </div>
              <div className="text-sm font-semibold mt-1 text-accent">
                Total: {formatCurrencyWhole(data.total)}
              </div>
              {data.delta > 0 && (
                <div className="text-xs mt-1 text-error">
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
        <h3 className="font-semibold flex items-center gap-2 text-text-primary">
          <svg className="w-5 h-5 text-success"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Complete Loan
        </h3>
        <p className="text-sm mt-1 text-text-muted">
          Record payoff to mark loan as paid and transition to historic status
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Payoff Amount */}
        <div>
          <label className="block text-xs mb-1 text-text-muted">
            Payoff Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
            <input
              type="number"
              value={payoffAmount}
              onChange={(e) => setPayoffAmount(e.target.value)}
              placeholder={payoff.totalPayoff.toFixed(2)}
              className="input w-full pl-7 bg-background-secondary"
            />
          </div>
          <div className="text-xs mt-1 text-text-muted">
            Calculated: {formatCurrency(payoff.totalPayoff)}
          </div>
        </div>
        
        {/* Payoff Date */}
        <div>
          <label className="block text-xs mb-1 text-text-muted">
            Payoff Date
          </label>
          <input
            type="date"
            value={payoffDate}
            onChange={(e) => setPayoffDate(e.target.value)}
            className="input w-full bg-background-secondary"
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
              <span className="font-medium text-sm text-text-primary">
                Payoff Confirmed
              </span>
              <p className="text-xs text-text-muted">
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
            <LoadingSpinner size="sm" variant="white" />
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

// =============================================================================
// CREDITS MANAGER - Apply credits/adjustments to payoff
// =============================================================================

function CreditsManager({
  credits,
  onCreditsChange,
  totalCredits,
}: {
  credits: PayoffCredit[]
  onCreditsChange: (credits: PayoffCredit[]) => void
  totalCredits: number
}) {
  const [newDescription, setNewDescription] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddCredit = () => {
    if (!newAmount || parseFloat(newAmount) <= 0) return
    
    const credit: PayoffCredit = {
      id: crypto.randomUUID(),
      description: newDescription || 'Credit',
      amount: parseFloat(newAmount),
    }
    
    onCreditsChange([...credits, credit])
    setNewDescription('')
    setNewAmount('')
    setIsAdding(false)
  }

  const handleRemoveCredit = (id: string) => {
    onCreditsChange(credits.filter(c => c.id !== id))
  }

  return (
    <div className="card-ios">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-text-primary">
            <svg className="w-5 h-5 text-info"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Credits & Adjustments
          </h3>
          <p className="text-sm mt-0.5 text-text-muted">
            Apply credits to reduce payoff amount
          </p>
        </div>
        {totalCredits > 0 && (
          <div className="text-right">
            <div className="text-xs text-text-muted">Total Credits</div>
            <div className="text-lg font-bold text-success">
              -{formatCurrency(totalCredits)}
            </div>
          </div>
        )}
      </div>
      
      {/* Existing Credits List */}
      {credits.length > 0 && (
        <div className="space-y-2 mb-4">
          {credits.map((credit) => (
            <div
              key={credit.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background-secondary"
            >
              <div>
                <div className="font-medium text-sm text-text-primary">
                  {credit.description}
                </div>
                <div className="text-xs text-text-muted">
                  Credit applied to payoff
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-success">
                  -{formatCurrency(credit.amount)}
                </span>
                <button
                  onClick={() => handleRemoveCredit(credit.id)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors text-text-muted"
                  
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Credit Form */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg border bg-background-secondary border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1 text-text-muted">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Builder rebate, Closing credit"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-text-muted">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="input w-full pl-7"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCredit}
                  disabled={!newAmount || parseFloat(newAmount) <= 0}
                  className="btn-primary text-sm"
                >
                  Add Credit
                </button>
                <button
                  onClick={() => { setIsAdding(false); setNewDescription(''); setNewAmount('') }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-dashed transition-colors hover:bg-[var(--bg-hover)] border-border text-text-muted"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Credit
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// PAYOFF LETTER GENERATOR - Title company ready document
// =============================================================================

function PayoffLetterGenerator({
  project,
  payoff,
  payoffDate,
  credits,
}: {
  project: Project
  payoff: PayoffBreakdown
  payoffDate: string
  credits: PayoffCredit[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const letterRef = useRef<HTMLDivElement>(null)

  const handleCopyToClipboard = async () => {
    if (!letterRef.current) return
    
    try {
      await navigator.clipboard.writeText(letterRef.current.innerText)
      toast({ type: 'success', title: 'Copied', message: 'Payoff letter copied to clipboard' })
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: 'Failed to copy to clipboard' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="card-ios">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-text-primary">
            <svg className="w-5 h-5 text-accent"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Title Company Payoff Letter
          </h3>
          <p className="text-sm mt-0.5 text-text-muted">
            Generate a formal payoff statement for title companies
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn-secondary flex items-center gap-2"
        >
          {isOpen ? 'Close' : 'Generate Letter'}
          <svg 
            className="w-4 h-4 transition-transform" 
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Letter Preview */}
            <div 
              ref={letterRef}
              className="mt-6 p-8 bg-white rounded-lg border print:border-0"
              style={{ borderColor: 'var(--border)', color: '#000' }}
            >
              {/* Letterhead */}
              <div className="text-center mb-8 pb-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900">PAYOFF STATEMENT</h1>
                <p className="text-sm text-gray-600 mt-1">CONFIDENTIAL - FOR TITLE COMPANY USE ONLY</p>
              </div>
              
              {/* Date and Reference */}
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-600">Statement Date</p>
                  <p className="font-medium">{formatDate(new Date())}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Loan Number</p>
                  <p className="font-medium">{project.project_code || project.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              
              {/* Loan Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Borrower:</span>
                    <span className="ml-2 font-medium">{project.borrower_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Property:</span>
                    <span className="ml-2 font-medium">{project.address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Original Loan Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(project.loan_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="ml-2 font-medium">{formatRate(project.interest_rate_annual || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Payoff Breakdown */}
              <table className="w-full mb-6 text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Principal Balance</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(payoff.principalBalance)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">
                      Accrued Interest ({payoff.daysOfInterest} days @ {formatCurrency(payoff.perDiem)}/day)
                    </td>
                    <td className="py-2 text-right font-medium">{formatCurrency(payoff.accruedInterest)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Finance Fee ({payoff.feeRatePct})</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(payoff.financeFee)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Document Fee</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(payoff.documentFee)}</td>
                  </tr>
                  {credits.map((credit) => (
                    <tr key={credit.id} className="border-b border-gray-200">
                      <td className="py-2 text-gray-600">Less: {credit.description}</td>
                      <td className="py-2 text-right font-medium text-green-600">({formatCurrency(credit.amount)})</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-lg">
                    <td className="pt-4">TOTAL PAYOFF</td>
                    <td className="pt-4 text-right">{formatCurrency(payoff.totalPayoff)}</td>
                  </tr>
                </tfoot>
              </table>
              
              {/* Good Through Notice */}
              <div className="mb-6 p-4 border-2 border-gray-300 rounded bg-yellow-50">
                <p className="font-semibold text-center">
                  Good Through: {formatDate(payoffDate)}
                </p>
                <p className="text-sm text-center text-gray-600 mt-1">
                  For payoff after this date, add {formatCurrency(payoff.perDiem)} per diem interest for each additional day.
                </p>
              </div>
              
              {/* Wire Instructions Placeholder */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <p className="font-semibold mb-2">Wire Instructions:</p>
                <p className="text-sm text-gray-600 italic">
                  [Contact lender for wire instructions]
                </p>
              </div>
              
              {/* Authorization */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  This payoff statement is valid only for the date specified above. The actual payoff amount 
                  may differ if funds are received on a different date. This statement does not constitute 
                  a payoff commitment.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-8">
                  <div>
                    <div className="border-b border-gray-400 mb-1"></div>
                    <p className="text-sm text-gray-600">Authorized Signature</p>
                  </div>
                  <div>
                    <div className="border-b border-gray-400 mb-1"></div>
                    <p className="text-sm text-gray-600">Date</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-4 flex gap-3">
              <button onClick={handleCopyToClipboard} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy to Clipboard
              </button>
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Letter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
