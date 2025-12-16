'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, Budget, DrawRequest } from '@/types/database'
import type { ReportType } from '@/app/components/ui/ReportToggle'
import type { Anomaly } from '@/lib/anomalyDetection'
import {
  calculateAmortizationSchedule,
  calculatePerDiem,
  getAmortizationSummary,
  calculatePayoffBreakdown,
} from '@/lib/calculations'
import {
  resolveEffectiveTerms,
  calculateFeeRateAtMonth,
  getMonthNumber,
  getDaysToMaturity,
  getDaysUntilNextFeeIncrease,
  getUrgencyLevel,
  getUrgencyColor,
} from '@/lib/loanTerms'

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
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatCurrencyPrecise = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatRate = (rate: number | null) => {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(2)}%`
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

/**
 * Polymorphic Loan Details Tile
 * Displays context-aware statistics based on the active report type
 * Budget: budget completion stats and anomalies
 * Amortization: interest tracking stats
 * Payoff: payoff summary with urgency indicators
 */
export function PolymorphicLoanDetails({
  project,
  budgets,
  draws,
  drawLines,
  activeReport,
  anomalies,
}: PolymorphicLoanDetailsProps) {
  // Resolve loan terms
  const terms = useMemo(() => resolveEffectiveTerms(project), [project])

  // Auto-derive loan start date from first funded draw
  // Fee clock starts when the first draw is funded
  const effectiveFeeStartDate = useMemo(() => {
    // Find the first funded draw (sorted by funded_at date)
    const fundedDraws = draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    if (fundedDraws.length > 0 && fundedDraws[0].funded_at) {
      return fundedDraws[0].funded_at
    }
    return null
  }, [draws])

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
    // Per diem calculated on total balance (compound interest)
    const perDiem = calculatePerDiem(summary.totalBalance, project.interest_rate_annual || 0)

    // Calculate current month and fee rate
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
    const payoff = calculatePayoffBreakdown(
      {
        loan_amount: project.loan_amount,
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: effectiveFeeStartDate,
      },
      drawLines,
      new Date(),
      terms
    )

    const daysToMaturity = getDaysToMaturity(project.maturity_date)
    const urgencyLevel = daysToMaturity !== null ? getUrgencyLevel(daysToMaturity) : 'normal'
    const urgencyColor = getUrgencyColor(urgencyLevel)

    const daysUntilFeeIncrease = effectiveFeeStartDate
      ? getDaysUntilNextFeeIncrease(new Date(effectiveFeeStartDate), new Date(), terms)
      : null

    return {
      ...payoff,
      daysToMaturity,
      urgencyLevel,
      urgencyColor,
      daysUntilFeeIncrease,
    }
  }, [project, drawLines, terms, effectiveFeeStartDate])

  return (
    <div className="card-ios">
      <AnimatePresence mode="wait">
        {activeReport === 'budget' && (
          <motion.div
            key="budget"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <BudgetView stats={budgetStats} />
          </motion.div>
        )}
        
        {activeReport === 'amortization' && (
          <motion.div
            key="amortization"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <AmortizationView stats={amortStats} project={project} />
          </motion.div>
        )}
        
        {activeReport === 'payoff' && (
          <motion.div
            key="payoff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <PayoffView stats={payoffStats} project={project} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Budget View Component
function BudgetView({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <StatCard
        label="Budget Total"
        value={formatCurrency(stats.totalBudget)}
        color="var(--text-primary)"
      />
      <StatCard
        label="Total Spent"
        value={formatCurrency(stats.totalSpent)}
        color="var(--accent)"
      />
      <StatCard
        label="Remaining"
        value={formatCurrency(stats.remaining)}
        color={stats.remaining < 0 ? 'var(--error)' : 'var(--success)'}
      />
      <StatCard
        label="% Complete"
        value={`${stats.percentComplete.toFixed(1)}%`}
        color={stats.percentComplete > 100 ? 'var(--error)' : 'var(--text-primary)'}
      />
      <StatCard
        label="Anomalies"
        value={stats.totalAnomalies.toString()}
        color={stats.criticalAnomalies > 0 ? 'var(--error)' : stats.warningAnomalies > 0 ? 'var(--warning)' : 'var(--success)'}
        badge={stats.overBudgetCount > 0 ? `${stats.overBudgetCount} over` : undefined}
        badgeColor={stats.overBudgetCount > 0 ? 'var(--error)' : undefined}
      />
    </div>
  )
}

// Amortization View Component
function AmortizationView({ stats, project }: { stats: any; project: Project }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <StatCard
        label="Principal"
        value={formatCurrency(stats.principal)}
        color="var(--text-primary)"
      />
      <StatCard
        label="Total Interest"
        value={formatCurrencyPrecise(stats.totalInterest)}
        color="var(--warning)"
      />
      <StatCard
        label="Total Balance"
        value={formatCurrency(stats.totalBalance)}
        color="var(--accent)"
      />
      <StatCard
        label="Per Diem"
        value={formatCurrencyPrecise(stats.perDiem)}
        color="var(--info)"
        subtitle="/day"
      />
      <StatCard
        label="Days Outstanding"
        value={stats.totalDays.toString()}
        color="var(--text-primary)"
        subtitle={`${stats.totalDraws} draws`}
      />
      <StatCard
        label="Loan Month"
        value={`#${stats.monthNumber}`}
        color="var(--text-primary)"
        badge={`Fee: ${formatRate(stats.currentFeeRate)}`}
        badgeColor={stats.currentFeeRate > (project.origination_fee_pct || 0.02) ? 'var(--warning)' : 'var(--text-muted)'}
      />
    </div>
  )
}

// Payoff View Component - Urgency-focused summary
function PayoffView({ stats, project }: { stats: any; project: Project }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <StatCard
        label="Estimated Payoff"
        value={formatCurrency(stats.totalPayoff)}
        color="var(--accent)"
      />
      <StatCard
        label="Per Diem"
        value={formatCurrencyPrecise(stats.perDiem)}
        color="var(--info)"
        subtitle="/day"
      />
      <StatCard
        label="Current Fee Rate"
        value={stats.feeRatePct}
        color={stats.isExtension ? 'var(--error)' : 'var(--text-primary)'}
        badge={stats.isExtension ? 'Extension' : undefined}
        badgeColor="var(--error)"
      />
      <StatCard
        label="Days to Maturity"
        value={stats.daysToMaturity !== null ? stats.daysToMaturity.toString() : '—'}
        color={stats.urgencyColor}
        badge={stats.urgencyLevel !== 'normal' ? stats.urgencyLevel : undefined}
        badgeColor={stats.urgencyColor}
      />
      <StatCard
        label="Next Fee Increase"
        value={stats.daysUntilFeeIncrease !== null ? `${stats.daysUntilFeeIncrease} days` : '—'}
        color="var(--warning)"
      />
    </div>
  )
}

// Stat Card Component
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
    <div>
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
            color: badgeColor || 'var(--text-muted)' 
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

