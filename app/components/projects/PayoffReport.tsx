'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveLine } from '@nivo/line'
import type { Project, DrawRequest } from '@/types/database'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import {
  calculatePayoffBreakdown,
  projectPayoffAtDate,
  generateProjectionData,
  formatProjectionForNivo,
  calculatePerDiem,
  type PayoffBreakdown,
  type ProjectionDataPoint,
} from '@/lib/calculations'
import {
  resolveEffectiveTerms,
  calculateFeeRateAtMonth,
  getMonthNumber,
  getNextFeeIncreaseDate,
  getDaysUntilNextFeeIncrease,
  getDaysToMaturity,
  getUrgencyLevel,
  getUrgencyColor,
  generateFeeSchedule,
  type LoanTerms,
  DEFAULT_LOAN_TERMS,
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
}: PayoffReportProps) {
  // Auto-derive loan start date from first funded draw
  // Fee clock starts when the first draw is funded
  const autoLoanStartDate = useMemo(() => {
    // Find the first funded draw (sorted by funded_at date)
    const fundedDraws = draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    if (fundedDraws.length > 0 && fundedDraws[0].funded_at) {
      return new Date(fundedDraws[0].funded_at).toISOString().split('T')[0]
    }
    return null
  }, [draws])
  
  // State for payoff calculations
  const [payoffDate, setPayoffDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [payoffAmount, setPayoffAmount] = useState<string>('')
  const [payoffApproved, setPayoffApproved] = useState(false)
  const [completing, setCompleting] = useState(false)
  
  // State for interactive calculator
  const [projectionDays, setProjectionDays] = useState(30)
  const [whatIfDate, setWhatIfDate] = useState<string>('')
  
  // State for user-adjustable fee clock start date (defaults to auto-derived)
  const [customFeeStartDate, setCustomFeeStartDate] = useState<string | null>(null)
  
  // Effective fee start date: user override > auto-derived from first funded draw
  const effectiveFeeStartDate = useMemo(() => {
    if (customFeeStartDate) return customFeeStartDate
    return autoLoanStartDate
  }, [customFeeStartDate, autoLoanStartDate])
  
  // Flag to indicate if using auto-derived date
  const isAutoFeeStartDate = !customFeeStartDate && autoLoanStartDate !== null
  
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
  
  // Days until next fee increase
  const daysUntilFeeIncrease = useMemo(() => {
    if (!effectiveFeeStartDate) return null
    return getDaysUntilNextFeeIncrease(
      new Date(effectiveFeeStartDate),
      new Date(),
      terms
    )
  }, [effectiveFeeStartDate, terms])
  
  // What-If calculation
  const whatIfPayoff = useMemo(() => {
    if (!whatIfDate || !effectiveFeeStartDate) return null
    return projectPayoffAtDate(
      currentPayoff,
      new Date(whatIfDate),
      new Date(effectiveFeeStartDate),
      terms
    )
  }, [whatIfDate, currentPayoff, effectiveFeeStartDate, terms])
  
  // Projection slider calculation
  const projectedPayoff = useMemo(() => {
    if (!effectiveFeeStartDate) return null
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + projectionDays)
    return projectPayoffAtDate(
      currentPayoff,
      futureDate,
      new Date(effectiveFeeStartDate),
      terms
    )
  }, [projectionDays, currentPayoff, effectiveFeeStartDate, terms])
  
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
  
  // Render based on view mode
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
          terms={terms}
          effectiveFeeStartDate={effectiveFeeStartDate}
          customFeeStartDate={customFeeStartDate}
          setCustomFeeStartDate={setCustomFeeStartDate}
          isAutoFeeStartDate={isAutoFeeStartDate}
        />
      )}
      
      {viewMode === 'cards' && (
        <PayoffCalculatorView
          project={project}
          currentPayoff={currentPayoff}
          projectedPayoff={projectedPayoff}
          whatIfPayoff={whatIfPayoff}
          projectionDays={projectionDays}
          setProjectionDays={setProjectionDays}
          whatIfDate={whatIfDate}
          setWhatIfDate={setWhatIfDate}
          daysToMaturity={daysToMaturity}
          urgencyLevel={urgencyLevel}
          urgencyColor={urgencyColor}
          daysUntilFeeIncrease={daysUntilFeeIncrease}
          feeSchedule={feeSchedule}
          terms={terms}
        />
      )}
      
      {viewMode === 'chart' && (
        <PayoffChartView
          project={project}
          projectionData={projectionData}
          currentPayoff={currentPayoff}
          terms={terms}
          effectiveFeeStartDate={effectiveFeeStartDate}
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
  terms,
  effectiveFeeStartDate,
  customFeeStartDate,
  setCustomFeeStartDate,
  isAutoFeeStartDate,
}: {
  project: Project
  payoff: PayoffBreakdown
  payoffDate: string
  setPayoffDate: (date: string) => void
  terms: LoanTerms
  effectiveFeeStartDate: string | null
  customFeeStartDate: string | null
  setCustomFeeStartDate: (date: string | null) => void
  isAutoFeeStartDate: boolean
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
      
      {/* Fee Clock Start Date - Adjustable */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Fee Clock Start Date
              </span>
              {isAutoFeeStartDate && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                  Auto-detected
                </span>
              )}
              {customFeeStartDate && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
                  Custom
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              The fee clock starts when the first draw is funded. Adjust if needed for fee escalation calculations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={effectiveFeeStartDate || ''}
              onChange={(e) => setCustomFeeStartDate(e.target.value || null)}
              className="input text-sm"
              style={{ background: 'var(--bg-secondary)', width: '150px' }}
            />
            {customFeeStartDate && (
              <button
                onClick={() => setCustomFeeStartDate(null)}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                title="Reset to auto-detected date"
              >
                Reset
              </button>
            )}
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
// VIEW 2: INTERACTIVE CALCULATOR (Cards Mode)
// =============================================================================

function PayoffCalculatorView({
  project,
  currentPayoff,
  projectedPayoff,
  whatIfPayoff,
  projectionDays,
  setProjectionDays,
  whatIfDate,
  setWhatIfDate,
  daysToMaturity,
  urgencyLevel,
  urgencyColor,
  daysUntilFeeIncrease,
  feeSchedule,
  terms,
}: {
  project: Project
  currentPayoff: PayoffBreakdown
  projectedPayoff: PayoffBreakdown | null
  whatIfPayoff: PayoffBreakdown | null
  projectionDays: number
  setProjectionDays: (days: number) => void
  whatIfDate: string
  setWhatIfDate: (date: string) => void
  daysToMaturity: number | null
  urgencyLevel: string
  urgencyColor: string
  daysUntilFeeIncrease: number | null
  feeSchedule: ReturnType<typeof generateFeeSchedule>
  terms: LoanTerms
}) {
  // Calculate fee impact of waiting
  const feeImpact = useMemo(() => {
    if (!projectedPayoff) return 0
    return projectedPayoff.financeFee - currentPayoff.financeFee
  }, [projectedPayoff, currentPayoff])
  
  const interestImpact = useMemo(() => {
    if (!projectedPayoff) return 0
    return projectedPayoff.accruedInterest - currentPayoff.accruedInterest
  }, [projectedPayoff, currentPayoff])
  
  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Payoff"
          value={formatCurrencyWhole(currentPayoff.totalPayoff)}
          color="var(--accent)"
        />
        <StatCard
          label="Per Diem"
          value={formatCurrency(currentPayoff.perDiem)}
          subtitle="/day"
          color="var(--info)"
        />
        <StatCard
          label="Current Fee Rate"
          value={currentPayoff.feeRatePct}
          badge={currentPayoff.isExtension ? 'Extension' : undefined}
          badgeColor={currentPayoff.isExtension ? 'var(--error)' : undefined}
          color={currentPayoff.isExtension ? 'var(--error)' : 'var(--text-primary)'}
        />
        <StatCard
          label="Days to Maturity"
          value={daysToMaturity !== null ? daysToMaturity.toString() : '—'}
          color={urgencyColor}
          badge={urgencyLevel !== 'normal' ? urgencyLevel : undefined}
          badgeColor={urgencyColor}
        />
      </div>
      
      {/* Fee Tracker */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Fee Escalation Tracker
        </h3>
        
        {/* Fee Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: 'var(--text-muted)' }}>Month {currentPayoff.monthNumber} of loan</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {daysUntilFeeIncrease !== null ? `${daysUntilFeeIncrease} days until next increase` : 'N/A'}
            </span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ 
                background: currentPayoff.isExtension 
                  ? 'linear-gradient(90deg, var(--warning), var(--error))' 
                  : 'linear-gradient(90deg, var(--success), var(--warning))'
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((currentPayoff.monthNumber / 18) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Extension marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5"
              style={{ left: `${(12 / 18) * 100}%`, background: 'var(--error)' }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            <span>Month 1</span>
            <span style={{ color: 'var(--error)' }}>Month 13 (Extension)</span>
            <span>Month 18</span>
          </div>
        </div>
        
        {/* Fee Schedule Preview */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
          {feeSchedule.slice(0, 12).map((entry) => (
            <div
              key={entry.month}
              className="text-center p-2 rounded-lg transition-colors"
              style={{
                background: entry.month === currentPayoff.monthNumber 
                  ? 'var(--accent-muted)' 
                  : entry.isExtensionMonth 
                    ? 'var(--error-muted)'
                    : 'var(--bg-hover)',
                border: entry.month === currentPayoff.monthNumber 
                  ? '2px solid var(--accent)' 
                  : '1px solid transparent',
              }}
            >
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>M{entry.month}</div>
              <div 
                className="text-sm font-medium"
                style={{ 
                  color: entry.isExtensionMonth 
                    ? 'var(--error)' 
                    : entry.month === currentPayoff.monthNumber 
                      ? 'var(--accent)' 
                      : 'var(--text-primary)' 
                }}
              >
                {entry.feeRatePct}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Interest Projection Slider */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Interest Projection
        </h3>
        
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              Project payoff in <strong>{projectionDays}</strong> days
            </label>
            <input
              type="range"
              min={1}
              max={180}
              value={projectionDays}
              onChange={(e) => setProjectionDays(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>1 day</span>
              <span>90 days</span>
              <span>180 days</span>
            </div>
          </div>
          
          {projectedPayoff && (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Additional Interest</div>
                <div className="font-semibold" style={{ color: 'var(--warning)' }}>
                  +{formatCurrency(interestImpact)}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Projected Payoff</div>
                <div className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatCurrencyWhole(projectedPayoff.totalPayoff)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* What-If Calculator */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          What-If Scenario
        </h3>
        
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              If payoff date is...
            </label>
            <input
              type="date"
              value={whatIfDate}
              onChange={(e) => setWhatIfDate(e.target.value)}
              className="input w-full"
              style={{ background: 'var(--bg-secondary)' }}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          {whatIfPayoff && (
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Fee Rate</div>
                <div className="font-semibold" style={{ color: whatIfPayoff.isExtension ? 'var(--error)' : 'var(--text-primary)' }}>
                  {whatIfPayoff.feeRatePct}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Interest</div>
                <div className="font-semibold" style={{ color: 'var(--warning)' }}>
                  {formatCurrency(whatIfPayoff.accruedInterest)}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--success-muted)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Payoff</div>
                <div className="font-semibold" style={{ color: 'var(--success)' }}>
                  {formatCurrencyWhole(whatIfPayoff.totalPayoff)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Comparison with today */}
        {whatIfPayoff && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Compared to today: 
              <span className="ml-2 font-medium" style={{ color: whatIfPayoff.totalPayoff > currentPayoff.totalPayoff ? 'var(--error)' : 'var(--success)' }}>
                {whatIfPayoff.totalPayoff > currentPayoff.totalPayoff ? '+' : ''}
                {formatCurrency(whatIfPayoff.totalPayoff - currentPayoff.totalPayoff)}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Smart Insights */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Smart Insights
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Best payoff window */}
          {currentPayoff.monthNumber <= 6 && (
            <InsightRow
              type="success"
              title="Optimal Payoff Window"
              message={`You're in the base fee period (${formatRate(terms.baseFee)}). Fee escalation begins month 7.`}
            />
          )}
          
          {/* Extension warning */}
          {currentPayoff.monthNumber >= 11 && currentPayoff.monthNumber < 13 && (
            <InsightRow
              type="warning"
              title="Extension Fee Approaching"
              message={`Month 13 triggers a ${formatRate(terms.extensionFeeRate)} extension fee. Consider payoff before then.`}
            />
          )}
          
          {/* In extension */}
          {currentPayoff.isExtension && (
            <InsightRow
              type="error"
              title="Extension Fee Active"
              message={`Fee rate increases ${formatRate(terms.postExtensionEscalation)} each month. Current rate: ${currentPayoff.feeRatePct}`}
            />
          )}
          
          {/* Maturity warning */}
          {daysToMaturity !== null && daysToMaturity <= 30 && daysToMaturity > 0 && (
            <InsightRow
              type="warning"
              title="Maturity Approaching"
              message={`Loan matures in ${daysToMaturity} days on ${formatDate(project.maturity_date)}.`}
            />
          )}
          
          {/* Past maturity */}
          {daysToMaturity !== null && daysToMaturity < 0 && (
            <InsightRow
              type="error"
              title="Past Maturity"
              message={`Loan matured ${Math.abs(daysToMaturity)} days ago. Additional fees may apply.`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// VIEW 3: FEE + INTEREST CHART (Chart Mode)
// =============================================================================

function PayoffChartView({
  project,
  projectionData,
  currentPayoff,
  terms,
  effectiveFeeStartDate,
}: {
  project: Project
  projectionData: ProjectionDataPoint[]
  currentPayoff: PayoffBreakdown
  terms: LoanTerms
  effectiveFeeStartDate: string | null
}) {
  // Format data for Nivo
  const chartData = useMemo(() => {
    const feeRateData = projectionData.map(d => ({
      x: d.date,
      y: d.feeRatePct,
    }))
    
    const interestData = projectionData.map(d => ({
      x: d.date,
      y: d.cumulativeInterest,
    }))
    
    const payoffData = projectionData.map(d => ({
      x: d.date,
      y: d.totalPayoff,
    }))
    
    return [
      { id: 'Fee Rate (%)', data: feeRateData },
    ]
  }, [projectionData])
  
  // Separate chart for dollar amounts
  const dollarChartData = useMemo(() => {
    const interestData = projectionData.map(d => ({
      x: d.date,
      y: d.cumulativeInterest,
    }))
    
    const payoffData = projectionData.map(d => ({
      x: d.date,
      y: d.totalPayoff,
    }))
    
    return [
      { id: 'Interest', data: interestData },
      { id: 'Total Payoff', data: payoffData },
    ]
  }, [projectionData])
  
  // Find current month index for marker
  const currentMonthIndex = projectionData.findIndex(d => d.isCurrentMonth)
  
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
      {/* Fee Rate Chart */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Fee Rate Escalation
        </h3>
        <div style={{ height: 200 }}>
          <ResponsiveLine
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
            curve="stepAfter"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'Month',
              legendOffset: 40,
              legendPosition: 'middle',
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Fee Rate (%)',
              legendOffset: -40,
              legendPosition: 'middle',
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
            enableSlices="x"
            sliceTooltip={({ slice }) => (
              <div
                className="p-2 rounded-lg shadow-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {slice.points.map(point => (
                  <div key={point.id} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: point.serieColor }} />
                    <span style={{ color: 'var(--text-primary)' }}>
                      {point.data.xFormatted}: {point.data.yFormatted}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            theme={{
              axis: {
                ticks: {
                  text: { fill: 'var(--text-muted)', fontSize: 11 },
                },
                legend: {
                  text: { fill: 'var(--text-secondary)', fontSize: 12 },
                },
              },
              grid: {
                line: { stroke: 'var(--border-subtle)', strokeWidth: 1 },
              },
              crosshair: {
                line: { stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '6 6' },
              },
            }}
            markers={[
              // Extension fee marker
              {
                axis: 'x',
                value: projectionData.find(d => d.isExtensionMonth)?.date || '',
                lineStyle: { stroke: 'var(--error)', strokeWidth: 2, strokeDasharray: '4 4' },
                legend: 'Extension',
                legendPosition: 'top',
                textStyle: { fill: 'var(--error)', fontSize: 10 },
              },
              // Current month marker
              ...(currentMonthIndex >= 0 ? [{
                axis: 'x' as const,
                value: projectionData[currentMonthIndex]?.date || '',
                lineStyle: { stroke: 'var(--accent)', strokeWidth: 2 },
                legend: 'Today',
                legendPosition: 'top' as const,
                textStyle: { fill: 'var(--accent)', fontSize: 10 },
              }] : []),
            ]}
          />
        </div>
      </div>
      
      {/* Interest & Payoff Chart */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Interest & Total Payoff Projection
        </h3>
        <div style={{ height: 280 }}>
          <ResponsiveLine
            data={dollarChartData}
            margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
            curve="monotoneX"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'Month',
              legendOffset: 40,
              legendPosition: 'middle',
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Amount ($)',
              legendOffset: -60,
              legendPosition: 'middle',
              format: v => `$${(v / 1000).toFixed(0)}k`,
            }}
            enableGridX={false}
            enableGridY={true}
            colors={['var(--warning)', 'var(--accent)']}
            lineWidth={2}
            pointSize={0}
            enableArea={true}
            areaOpacity={0.1}
            useMesh={true}
            enableSlices="x"
            legends={[
              {
                anchor: 'top-right',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: -20,
                itemsSpacing: 20,
                itemDirection: 'left-to-right',
                itemWidth: 80,
                itemHeight: 20,
                itemOpacity: 0.75,
                symbolSize: 12,
                symbolShape: 'circle',
                symbolBorderColor: 'rgba(0, 0, 0, .5)',
                effects: [
                  {
                    on: 'hover',
                    style: { itemBackground: 'rgba(0, 0, 0, .03)', itemOpacity: 1 },
                  },
                ],
              },
            ]}
            sliceTooltip={({ slice }) => (
              <div
                className="p-3 rounded-lg shadow-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {slice.points[0]?.data.xFormatted}
                </div>
                {slice.points.map(point => (
                  <div key={point.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: point.serieColor }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {point.serieId}:
                      </span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      ${Number(point.data.y).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            theme={{
              axis: {
                ticks: {
                  text: { fill: 'var(--text-muted)', fontSize: 11 },
                },
                legend: {
                  text: { fill: 'var(--text-secondary)', fontSize: 12 },
                },
              },
              grid: {
                line: { stroke: 'var(--border-subtle)', strokeWidth: 1 },
              },
              legends: {
                text: { fill: 'var(--text-secondary)', fontSize: 11 },
              },
            }}
            markers={[
              // Current month marker
              ...(currentMonthIndex >= 0 ? [{
                axis: 'x' as const,
                value: projectionData[currentMonthIndex]?.date || '',
                lineStyle: { stroke: 'var(--accent)', strokeWidth: 2 },
                legend: 'Today',
                legendPosition: 'top' as const,
                textStyle: { fill: 'var(--accent)', fontSize: 10 },
              }] : []),
              // Maturity marker
              ...(project.loan_term_months ? [{
                axis: 'x' as const,
                value: projectionData[project.loan_term_months - 1]?.date || '',
                lineStyle: { stroke: 'var(--warning)', strokeWidth: 2, strokeDasharray: '4 4' },
                legend: 'Maturity',
                legendPosition: 'top' as const,
                textStyle: { fill: 'var(--warning)', fontSize: 10 },
              }] : []),
            ]}
          />
        </div>
      </div>
      
      {/* Legend / Key Dates */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-ios text-center">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Current Month
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
            Month {currentPayoff.monthNumber}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fee: {currentPayoff.feeRatePct}
          </div>
        </div>
        <div className="card-ios text-center">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Extension Month
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--error)' }}>
            Month 13
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fee: {formatRate(terms.extensionFeeRate)}
          </div>
        </div>
        <div className="card-ios text-center">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Maturity
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--warning)' }}>
            Month {project.loan_term_months || 12}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formatDate(project.maturity_date)}
          </div>
        </div>
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
  const displayAmount = payoffAmount || payoff.totalPayoff.toFixed(2)
  
  return (
    <div 
      className="card-ios"
      style={{ borderLeft: '4px solid var(--success)' }}
    >
      <div className="mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Complete Loan</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Record payoff to mark loan as paid and move to historic
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

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCard({
  label,
  value,
  color,
  subtitle,
  badge,
  badgeColor,
}: {
  label: string
  value: string
  color: string
  subtitle?: string
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="card-ios">
      <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold"
          style={{ color }}
        >
          {value}
        </motion.span>
        {subtitle && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</span>
        )}
      </div>
      {badge && (
        <span
          className="inline-block text-xs px-1.5 py-0.5 rounded-full mt-1"
          style={{
            background: `${badgeColor}20` || 'var(--bg-hover)',
            color: badgeColor || 'var(--text-muted)',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

function InsightRow({
  type,
  title,
  message,
}: {
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
}) {
  const colors = {
    success: { bg: 'var(--success-muted)', icon: 'var(--success)' },
    warning: { bg: 'var(--warning-muted)', icon: 'var(--warning)' },
    error: { bg: 'var(--error-muted)', icon: 'var(--error)' },
    info: { bg: 'var(--info-muted)', icon: 'var(--info)' },
  }
  
  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }
  
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div
        className="p-1 rounded-full flex-shrink-0"
        style={{ background: colors[type].bg }}
      >
        <div style={{ color: colors[type].icon }}>{icons[type]}</div>
      </div>
      <div>
        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{title}</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</div>
      </div>
    </div>
  )
}

