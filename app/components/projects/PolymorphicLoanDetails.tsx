'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, Budget, DrawRequest } from '@/types/custom'
import type { ReportType } from '@/app/components/ui/ReportToggle'
import type { Anomaly } from '@/lib/anomalyDetection'
import {
  calculateAmortizationSchedule,
  calculatePerDiem,
  getAmortizationSummary,
  calculatePayoffBreakdown,
  projectPayoffAtDate,
} from '@/lib/calculations'
import {
  resolveEffectiveTerms,
  calculateFeeRateAtMonth,
  getMonthNumber,
  getDaysToMaturity,
  getDaysUntilNextFeeIncrease,
  getUrgencyLevel,
  getUrgencyColor,
  generateFeeSchedule,
} from '@/lib/loanTerms'
import { formatCurrencyWhole as formatCurrency, formatCurrency as formatCurrencyPrecise, formatRate, formatDate } from '@/lib/formatters'

type DrawLineWithDate = {
  amount: number
  date: string
  drawNumber?: number
}

type PolymorphicLoanDetailsProps = {
  project: Project
  budgets: Budget[]
  draws: DrawRequest[]
  drawLines: DrawLineWithDate[]
  activeReport: ReportType
  anomalies: Anomaly[]
  // Payoff interactive controls (lifted state)
  payoffDate?: string
  onPayoffDateChange?: (date: string) => void
  projectionDays?: number
  onProjectionDaysChange?: (days: number) => void
  whatIfDate?: string
  onWhatIfDateChange?: (date: string) => void
  customFeeStartDate?: string | null
  onCustomFeeStartDateChange?: (date: string | null) => void
}

/**
 * Polymorphic Loan Details Tile - Expandable Accordion
 * Displays context-aware statistics based on the active report type
 * Collapsed: Key metrics row
 * Expanded: Full dashboard with all Cards view content absorbed
 */
export function PolymorphicLoanDetails({
  project,
  budgets,
  draws,
  drawLines,
  activeReport,
  anomalies,
  payoffDate,
  onPayoffDateChange,
  projectionDays = 30,
  onProjectionDaysChange,
  whatIfDate,
  onWhatIfDateChange,
  customFeeStartDate,
  onCustomFeeStartDateChange,
}: PolymorphicLoanDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Resolve loan terms
  const terms = useMemo(() => resolveEffectiveTerms(project), [project])

  // Auto-derive loan start date from first funded draw
  const autoFeeStartDate = useMemo(() => {
    const fundedDraws = draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    if (fundedDraws.length > 0 && fundedDraws[0].funded_at) {
      return fundedDraws[0].funded_at
    }
    return null
  }, [draws])
  
  // Effective fee start date: user override > auto-derived
  const effectiveFeeStartDate = customFeeStartDate || autoFeeStartDate
  const isAutoFeeStartDate = !customFeeStartDate && autoFeeStartDate !== null

  // Calculate budget statistics
  const budgetStats = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
    const remaining = totalBudget - totalSpent
    const percentComplete = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const overBudgetCount = budgets.filter(b => (b.spent_amount || 0) > (b.current_amount || 0)).length
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length
    const warningAnomalies = anomalies.filter(a => a.severity === 'warning').length

    return {
      totalBudget,
      totalSpent,
      remaining,
      percentComplete,
      overBudgetCount,
      criticalAnomalies,
      warningAnomalies,
      totalAnomalies: anomalies.length,
    }
  }, [budgets, anomalies])

  // Calculate amortization statistics
  const amortStats = useMemo(() => {
    const schedule = calculateAmortizationSchedule(
      drawLines,
      {
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: effectiveFeeStartDate,
        loan_amount: project.loan_amount,
      }
    )

    const summary = getAmortizationSummary(schedule)
    const perDiem = calculatePerDiem(summary.totalBalance, project.interest_rate_annual || 0)

    let currentFeeRate = terms.baseFee
    let monthNumber = 1

    if (effectiveFeeStartDate) {
      monthNumber = getMonthNumber(new Date(effectiveFeeStartDate), new Date())
      currentFeeRate = calculateFeeRateAtMonth(monthNumber, terms)
    }

    return {
      ...summary,
      perDiem,
      currentFeeRate,
      monthNumber,
      schedule,
    }
  }, [drawLines, project, terms, effectiveFeeStartDate])

  // Calculate payoff statistics
  const payoffStats = useMemo(() => {
    const date = payoffDate ? new Date(payoffDate) : new Date()
    const payoff = calculatePayoffBreakdown(
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

    const daysToMaturity = getDaysToMaturity(project.maturity_date)
    const urgencyLevel = daysToMaturity !== null ? getUrgencyLevel(daysToMaturity) : 'normal'
    const urgencyColor = getUrgencyColor(urgencyLevel)

    const daysUntilFeeIncrease = effectiveFeeStartDate
      ? getDaysUntilNextFeeIncrease(new Date(effectiveFeeStartDate), new Date(), terms)
      : null
    
    // Projected payoff
    let projectedPayoff = null
    if (effectiveFeeStartDate) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + projectionDays)
      projectedPayoff = projectPayoffAtDate(
        payoff,
        futureDate,
        new Date(effectiveFeeStartDate),
        terms
      )
    }
    
    // What-if payoff
    let whatIfPayoff = null
    if (whatIfDate && effectiveFeeStartDate) {
      whatIfPayoff = projectPayoffAtDate(
        payoff,
        new Date(whatIfDate),
        new Date(effectiveFeeStartDate),
        terms
      )
    }

    return {
      ...payoff,
      daysToMaturity,
      urgencyLevel,
      urgencyColor,
      daysUntilFeeIncrease,
      projectedPayoff,
      whatIfPayoff,
    }
  }, [project, drawLines, terms, effectiveFeeStartDate, payoffDate, projectionDays, whatIfDate])

  // Fee schedule for payoff expanded view
  const feeSchedule = useMemo(() => {
    if (!effectiveFeeStartDate) return []
    return generateFeeSchedule(new Date(effectiveFeeStartDate), 18, terms)
  }, [effectiveFeeStartDate, terms])

  // Check if there are any important alerts to show
  const hasAlerts = budgetStats.criticalAnomalies > 0 || 
    budgetStats.warningAnomalies > 0 || 
    (payoffStats.daysToMaturity !== null && payoffStats.daysToMaturity <= 30)

  return (
    <div className="card-ios overflow-hidden">
      {/* Header - Always Visible (Collapsed State) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-0 text-left"
      >
        <AnimatePresence mode="wait">
          {activeReport === 'budget' && (
            <motion.div
              key="budget-collapsed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <CollapsedBudgetView stats={budgetStats} />
            </motion.div>
          )}
          
          {activeReport === 'amortization' && (
            <motion.div
              key="amort-collapsed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <CollapsedAmortizationView stats={amortStats} project={project} />
            </motion.div>
          )}
          
          {activeReport === 'payoff' && (
            <motion.div
              key="payoff-collapsed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <CollapsedPayoffView stats={payoffStats} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Expand/Collapse Chevron */}
        <div className="flex items-center gap-2 pl-4">
          {hasAlerts && !isExpanded && (
            <div className="w-2 h-2 rounded-full animate-pulse bg-warning" />
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="p-2 rounded-lg bg-background-hover"
          >
            <svg 
              className="w-5 h-5 text-text-muted" 
               
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-border-subtle">
              <AnimatePresence mode="wait">
                {activeReport === 'budget' && (
                  <motion.div
                    key="budget-expanded"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ExpandedBudgetView stats={budgetStats} anomalies={anomalies} />
                  </motion.div>
                )}
                
                {activeReport === 'amortization' && (
                  <motion.div
                    key="amort-expanded"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ExpandedAmortizationView stats={amortStats} project={project} />
                  </motion.div>
                )}
                
                {activeReport === 'payoff' && (
                  <motion.div
                    key="payoff-expanded"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ExpandedPayoffView 
                      stats={payoffStats}
                      project={project}
                      terms={terms}
                      feeSchedule={feeSchedule}
                      payoffDate={payoffDate || new Date().toISOString().split('T')[0]}
                      onPayoffDateChange={onPayoffDateChange}
                      projectionDays={projectionDays}
                      onProjectionDaysChange={onProjectionDaysChange}
                      whatIfDate={whatIfDate || ''}
                      onWhatIfDateChange={onWhatIfDateChange}
                      effectiveFeeStartDate={effectiveFeeStartDate}
                      customFeeStartDate={customFeeStartDate}
                      onCustomFeeStartDateChange={onCustomFeeStartDateChange}
                      isAutoFeeStartDate={isAutoFeeStartDate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// COLLAPSED VIEWS (Key Metrics Row)
// =============================================================================

function CollapsedBudgetView({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCell label="Budget Total" value={formatCurrency(stats.totalBudget)} color="var(--text-primary)" />
      <StatCell label="Total Spent" value={formatCurrency(stats.totalSpent)} color="var(--accent)" />
      <StatCell label="Remaining" value={formatCurrency(stats.remaining)} color={stats.remaining < 0 ? 'var(--error)' : 'var(--success)'} />
      <StatCell label="% Complete" value={`${stats.percentComplete.toFixed(1)}%`} color="var(--text-primary)" />
      <StatCell 
        label="Anomalies" 
        value={stats.totalAnomalies.toString()} 
        color={stats.criticalAnomalies > 0 ? 'var(--error)' : stats.warningAnomalies > 0 ? 'var(--warning)' : 'var(--success)'}
      />
    </div>
  )
}

function CollapsedAmortizationView({ stats, project }: { stats: any; project: Project }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCell label="Principal" value={formatCurrency(stats.principal)} color="var(--text-primary)" />
      <StatCell label="Total Interest" value={formatCurrencyPrecise(stats.totalInterest)} color="var(--warning)" />
      <StatCell label="Total Balance" value={formatCurrency(stats.totalBalance)} color="var(--accent)" />
      <StatCell label="Per Diem" value={formatCurrencyPrecise(stats.perDiem)} subtitle="/day" color="var(--info)" />
      <StatCell label="Days Outstanding" value={stats.totalDays.toString()} subtitle={`${stats.totalDraws} draws`} color="var(--text-primary)" />
    </div>
  )
}

function CollapsedPayoffView({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCell label="Estimated Payoff" value={formatCurrency(stats.totalPayoff)} color="var(--accent)" />
      <StatCell label="Per Diem" value={formatCurrencyPrecise(stats.perDiem)} subtitle="/day" color="var(--info)" />
      <StatCell 
        label="Fee Rate" 
        value={stats.feeRatePct} 
        color={stats.isExtension ? 'var(--error)' : 'var(--text-primary)'}
        badge={stats.isExtension ? 'Extension' : undefined}
      />
      <StatCell 
        label="Days to Maturity" 
        value={stats.daysToMaturity !== null ? stats.daysToMaturity.toString() : '—'} 
        color={stats.urgencyColor}
        badge={stats.urgencyLevel !== 'normal' ? stats.urgencyLevel : undefined}
      />
      <StatCell 
        label="Next Fee Increase" 
        value={stats.daysUntilFeeIncrease !== null ? `${stats.daysUntilFeeIncrease} days` : '—'} 
        color="var(--warning)" 
      />
    </div>
  )
}

// =============================================================================
// EXPANDED VIEWS (Full Dashboard - Absorbed Cards Content)
// =============================================================================

function ExpandedBudgetView({ stats, anomalies }: { stats: any; anomalies: Anomaly[] }) {
  // Group anomalies by severity
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
  const warningAnomalies = anomalies.filter(a => a.severity === 'warning')
  
  return (
    <div className="space-y-4">
      {/* Anomaly Alerts */}
      {(criticalAnomalies.length > 0 || warningAnomalies.length > 0) && (
        <div className="space-y-2">
          {criticalAnomalies.map((anomaly, i) => (
            <div key={`critical-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-error-muted">
              <div className="w-2 h-2 rounded-full bg-error" />
              <span className="text-sm text-text-primary">{anomaly.message}</span>
            </div>
          ))}
          {warningAnomalies.slice(0, 3).map((anomaly, i) => (
            <div key={`warning-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-warning-muted">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-sm text-text-primary">{anomaly.message}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Budget Velocity Indicator */}
      <div className="p-4 rounded-lg bg-background-secondary">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Budget Utilization</span>
          <span className="text-sm" style={{ color: stats.percentComplete > 100 ? 'var(--error)' : 'var(--text-muted)' }}>
            {stats.percentComplete.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-background-hover">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: stats.percentComplete > 100
                ? 'var(--error)'
                : stats.percentComplete > 80
                  ? 'var(--warning)' 
                  : 'var(--accent)'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(stats.percentComplete, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>{formatCurrency(stats.totalSpent)} spent</span>
          <span>{formatCurrency(stats.remaining)} remaining</span>
        </div>
      </div>
      
      {/* Over Budget Items */}
      {stats.overBudgetCount > 0 && (
        <div className="p-3 rounded-lg flex items-center gap-3 bg-error-muted">
          <svg className="w-5 h-5 text-error"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-text-primary">
            {stats.overBudgetCount} line item{stats.overBudgetCount !== 1 ? 's' : ''} over budget
          </span>
        </div>
      )}
    </div>
  )
}

function ExpandedAmortizationView({ stats, project }: { stats: any; project: Project }) {
  return (
    <div className="space-y-4">
      {/* Detailed Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Principal (Draws)"
          value={formatCurrency(stats.principal)}
          subtitle={`${stats.totalDraws} draw${stats.totalDraws !== 1 ? 's' : ''}`}
          color="var(--text-primary)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Total Interest"
          value={formatCurrencyPrecise(stats.totalInterest)}
          subtitle={`Avg: ${formatCurrencyPrecise(stats.avgDailyInterest)}/day`}
          color="var(--warning)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <MetricCard
          label="Total Balance"
          value={formatCurrency(stats.totalBalance)}
          subtitle={`Max: ${formatCurrency(stats.maxBalance)}`}
          color="var(--accent)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Interest Rate"
          value={formatRate(project.interest_rate_annual || 0)}
          subtitle="Annual rate"
          color="var(--text-primary)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          }
        />
      </div>
      
      {/* Days Outstanding Bar */}
      <div className="p-4 rounded-lg bg-background-secondary">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">Days Outstanding</div>
            <div className="text-2xl font-bold mt-1 text-text-primary">{stats.totalDays}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-text-muted">Loan Month</div>
            <div className="text-lg font-semibold text-accent">#{stats.monthNumber}</div>
            <div className="text-xs text-text-muted">Fee: {formatRate(stats.currentFeeRate)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExpandedPayoffView({
  stats,
  project,
  terms,
  feeSchedule,
  payoffDate,
  onPayoffDateChange,
  projectionDays,
  onProjectionDaysChange,
  whatIfDate,
  onWhatIfDateChange,
  effectiveFeeStartDate,
  customFeeStartDate,
  onCustomFeeStartDateChange,
  isAutoFeeStartDate,
}: {
  stats: any
  project: Project
  terms: any
  feeSchedule: any[]
  payoffDate: string
  onPayoffDateChange?: (date: string) => void
  projectionDays: number
  onProjectionDaysChange?: (days: number) => void
  whatIfDate: string
  onWhatIfDateChange?: (date: string) => void
  effectiveFeeStartDate: string | null
  customFeeStartDate?: string | null
  onCustomFeeStartDateChange?: (date: string | null) => void
  isAutoFeeStartDate: boolean
}) {
  // Calculate cost of waiting
  const interestImpact = stats.projectedPayoff 
    ? stats.projectedPayoff.accruedInterest - stats.accruedInterest 
    : 0
  
  return (
    <div className="space-y-4">
      {/* Fee Clock Start Date Control */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">Fee Clock Start</span>
              {isAutoFeeStartDate && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success-muted text-success">
                  Auto
                </span>
              )}
              {customFeeStartDate && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning-muted text-warning">
                  Custom
                </span>
              )}
            </div>
            <p className="text-xs mt-1 text-text-muted">
              Fee clock starts when first draw is funded
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={effectiveFeeStartDate || ''}
              onChange={(e) => onCustomFeeStartDateChange?.(e.target.value || null)}
              className="input text-sm"
              style={{ background: 'var(--bg-secondary)', width: '140px' }}
            />
            {customFeeStartDate && (
              <button
                onClick={() => onCustomFeeStartDateChange?.(null)}
                className="text-xs px-2 py-1 rounded bg-background-secondary text-text-muted"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Fee Escalation Tracker */}
      <div className="p-4 rounded-lg bg-background-secondary">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-muted">Month {stats.monthNumber} of loan</span>
          <span className="text-text-primary">
            {stats.daysUntilFeeIncrease !== null ? `${stats.daysUntilFeeIncrease} days until fee increase` : 'N/A'}
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-background-hover">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ 
              background: stats.isExtension 
                ? 'linear-gradient(90deg, var(--warning), var(--error))' 
                : 'linear-gradient(90deg, var(--success), var(--warning))'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((stats.monthNumber / 18) * 100, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${(12 / 18) * 100}%`, background: 'var(--error)' }} />
        </div>
        <div className="flex justify-between text-xs mt-1 text-text-muted">
          <span>Month 1</span>
          <span className="text-error">Month 13</span>
          <span>Month 18</span>
        </div>
        
        {/* Fee Schedule Mini Grid */}
        <div className="grid grid-cols-6 gap-1 mt-3">
          {feeSchedule.slice(0, 12).map((entry) => (
            <div
              key={entry.month}
              className="text-center p-1.5 rounded text-xs"
              style={{
                background: entry.month === stats.monthNumber 
                  ? 'var(--accent-muted)' 
                  : entry.isExtensionMonth 
                    ? 'var(--error-muted)'
                    : 'var(--bg-hover)',
                border: entry.month === stats.monthNumber ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <div className="text-text-muted">M{entry.month}</div>
              <div style={{ 
                color: entry.isExtensionMonth 
                  ? 'var(--error)' 
                  : entry.month === stats.monthNumber 
                    ? 'var(--accent)' 
                    : 'var(--text-primary)',
                fontWeight: entry.month === stats.monthNumber ? 600 : 400,
              }}>
                {entry.feeRatePct}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Projection Slider */}
      <div className="p-4 rounded-lg bg-background-secondary">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            Payoff in {projectionDays} days
          </span>
          {stats.projectedPayoff && (
            <span className="text-sm font-semibold text-accent">
              {formatCurrency(stats.projectedPayoff.totalPayoff)}
            </span>
          )}
        </div>
        <input
          type="range"
          min={1}
          max={180}
          value={projectionDays}
          onChange={(e) => onProjectionDaysChange?.(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent)' }}
        />
        <div className="flex justify-between text-xs mt-1 text-text-muted">
          <span>1 day</span>
          <span>90 days</span>
          <span>180 days</span>
        </div>
        {stats.projectedPayoff && interestImpact > 0 && (
          <div className="mt-2 text-xs text-warning">
            +{formatCurrencyPrecise(interestImpact)} additional interest
          </div>
        )}
      </div>
      
      {/* What-If Calculator */}
      <div className="p-4 rounded-lg bg-background-secondary">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm mb-1 text-text-muted">
              What-if payoff date
            </label>
            <input
              type="date"
              value={whatIfDate}
              onChange={(e) => onWhatIfDateChange?.(e.target.value)}
              className="input w-full text-sm bg-background-card"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          {stats.whatIfPayoff && (
            <div className="text-right">
              <div className="text-xs text-text-muted">Payoff Amount</div>
              <div className="text-lg font-semibold text-success">
                {formatCurrency(stats.whatIfPayoff.totalPayoff)}
              </div>
              <div className="text-xs" style={{ 
                color: stats.whatIfPayoff.totalPayoff > stats.totalPayoff ? 'var(--error)' : 'var(--success)' 
              }}>
                {stats.whatIfPayoff.totalPayoff > stats.totalPayoff ? '+' : ''}
                {formatCurrency(stats.whatIfPayoff.totalPayoff - stats.totalPayoff)} vs today
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Smart Insights */}
      {(stats.monthNumber <= 6 || stats.monthNumber >= 11 || stats.isExtension || (stats.daysToMaturity !== null && stats.daysToMaturity <= 30)) && (
        <div className="space-y-2">
          {stats.monthNumber <= 6 && (
            <InsightBadge type="success" message={`Optimal payoff window - base fee period (${formatRate(terms.baseFee)})`} />
          )}
          {stats.monthNumber >= 11 && stats.monthNumber < 13 && (
            <InsightBadge type="warning" message={`Extension fee (${formatRate(terms.extensionFeeRate)}) starts month 13`} />
          )}
          {stats.isExtension && (
            <InsightBadge type="error" message={`Extension fee active - rate increases monthly`} />
          )}
          {stats.daysToMaturity !== null && stats.daysToMaturity <= 30 && stats.daysToMaturity > 0 && (
            <InsightBadge type="warning" message={`Maturity in ${stats.daysToMaturity} days - ${formatDate(project.maturity_date)}`} />
          )}
          {stats.daysToMaturity !== null && stats.daysToMaturity < 0 && (
            <InsightBadge type="error" message={`Past maturity by ${Math.abs(stats.daysToMaturity)} days`} />
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCell({
  label,
  value,
  color,
  subtitle,
  badge,
}: {
  label: string
  value: string
  color: string
  subtitle?: string
  badge?: string
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider mb-1 text-text-muted">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color }}>{value}</span>
        {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
      </div>
      {badge && (
        <span className="inline-block text-xs px-1.5 py-0.5 rounded-full mt-1" style={{ background: `${color}20`, color }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtitle,
  color,
  icon,
}: {
  label: string
  value: string
  subtitle?: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-lg bg-background-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {label}
          </div>
          <div className="text-xl font-bold mt-1" style={{ color }}>{value}</div>
          {subtitle && (
            <div className="text-xs mt-0.5 text-text-muted">{subtitle}</div>
          )}
        </div>
        <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function InsightBadge({ type, message }: { type: 'success' | 'warning' | 'error'; message: string }) {
  const colors = {
    success: { bg: 'var(--success-muted)', text: 'var(--success)' },
    warning: { bg: 'var(--warning-muted)', text: 'var(--warning)' },
    error: { bg: 'var(--error-muted)', text: 'var(--error)' },
  }
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: colors[type].bg }}>
      <div className="w-2 h-2 rounded-full" style={{ background: colors[type].text }} />
      <span className="text-sm text-text-primary">{message}</span>
    </div>
  )
}
