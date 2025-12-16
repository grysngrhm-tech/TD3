'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, Budget, DrawRequest } from '@/types/database'
import type { ReportType } from '@/app/components/ui/ReportToggle'
import type { Anomaly } from '@/lib/anomalyDetection'
import {
  calculateAmortizationSchedule,
  calculateCurrentFeeRate,
  calculatePerDiem,
  projectInterestAtDate,
  simulateNextDraw,
  getAmortizationSummary,
} from '@/lib/calculations'

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
 * Includes interactive What-If calculator and Interest Projection slider
 */
export function PolymorphicLoanDetails({
  project,
  budgets,
  draws,
  drawLines,
  activeReport,
  anomalies,
}: PolymorphicLoanDetailsProps) {
  // What-If Calculator state
  const [whatIfAmount, setWhatIfAmount] = useState('')
  const [showWhatIf, setShowWhatIf] = useState(false)

  // Interest Projection slider state
  const [projectionDays, setProjectionDays] = useState(30)
  const [showProjection, setShowProjection] = useState(false)

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
        loan_start_date: project.loan_start_date,
        loan_amount: project.loan_amount,
      }
    )

    const summary = getAmortizationSummary(schedule)
    const perDiem = calculatePerDiem(summary.currentPrincipal, project.interest_rate_annual || 0)

    // Calculate current fee rate with escalation
    let currentFeeRate = project.origination_fee_pct || 0.02
    let nextFeeIncrease: Date | undefined

    if (project.loan_start_date) {
      const feeInfo = calculateCurrentFeeRate(
        project.origination_fee_pct || 0.02,
        new Date(project.loan_start_date),
        new Date()
      )
      currentFeeRate = feeInfo.rate
      nextFeeIncrease = feeInfo.nextIncrease
    }

    return {
      ...summary,
      perDiem,
      currentFeeRate,
      nextFeeIncrease,
      schedule,
    }
  }, [drawLines, project])

  // Calculate What-If simulation
  const whatIfResult = useMemo(() => {
    if (!whatIfAmount || !showWhatIf) return null

    const amount = parseFloat(whatIfAmount)
    if (isNaN(amount) || amount <= 0) return null

    const simulatedSchedule = simulateNextDraw(
      amortStats.schedule,
      amount,
      new Date(),
      {
        interest_rate_annual: project.interest_rate_annual,
        origination_fee_pct: project.origination_fee_pct,
        loan_start_date: project.loan_start_date,
        loan_amount: project.loan_amount,
      }
    )

    const simulatedSummary = getAmortizationSummary(simulatedSchedule)
    const newPerDiem = calculatePerDiem(simulatedSummary.currentPrincipal, project.interest_rate_annual || 0)
    const remainingLoan = (project.loan_amount || 0) - simulatedSummary.currentPrincipal
    const remainingBudget = budgetStats.totalBudget - budgetStats.totalSpent - amount

    return {
      newPrincipal: simulatedSummary.currentPrincipal,
      newPerDiem,
      remainingLoan,
      remainingBudget,
      interestChange: newPerDiem - amortStats.perDiem,
    }
  }, [whatIfAmount, showWhatIf, amortStats, project, budgetStats])

  // Calculate Interest Projection
  const projectionResult = useMemo(() => {
    if (!showProjection || amortStats.schedule.length === 0) return null

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + projectionDays)

    return projectInterestAtDate(
      amortStats.schedule,
      targetDate,
      project.interest_rate_annual || 0
    )
  }, [showProjection, projectionDays, amortStats.schedule, project.interest_rate_annual])

  return (
    <div className="card-ios">
      <AnimatePresence mode="wait">
        {activeReport === 'budget' ? (
          <motion.div
            key="budget"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <BudgetView 
              stats={budgetStats} 
              whatIfAmount={whatIfAmount}
              setWhatIfAmount={setWhatIfAmount}
              showWhatIf={showWhatIf}
              setShowWhatIf={setShowWhatIf}
              whatIfResult={whatIfResult}
            />
          </motion.div>
        ) : (
          <motion.div
            key="amortization"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <AmortizationView 
              stats={amortStats}
              project={project}
              projectionDays={projectionDays}
              setProjectionDays={setProjectionDays}
              showProjection={showProjection}
              setShowProjection={setShowProjection}
              projectionResult={projectionResult}
              whatIfAmount={whatIfAmount}
              setWhatIfAmount={setWhatIfAmount}
              showWhatIf={showWhatIf}
              setShowWhatIf={setShowWhatIf}
              whatIfResult={whatIfResult}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Budget View Component
function BudgetView({
  stats,
  whatIfAmount,
  setWhatIfAmount,
  showWhatIf,
  setShowWhatIf,
  whatIfResult,
}: {
  stats: ReturnType<typeof useMemo<any>>
  whatIfAmount: string
  setWhatIfAmount: (value: string) => void
  showWhatIf: boolean
  setShowWhatIf: (value: boolean) => void
  whatIfResult: any
}) {
  return (
    <>
      {/* Budget Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
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

      {/* What-If Calculator Toggle */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => setShowWhatIf(!showWhatIf)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: showWhatIf ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          <svg 
            className="w-4 h-4 transition-transform" 
            style={{ transform: showWhatIf ? 'rotate(90deg)' : 'rotate(0deg)' }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          What-If Calculator
        </button>

        <AnimatePresence>
          {showWhatIf && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    If next draw is...
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>$</span>
                    <input
                      type="number"
                      value={whatIfAmount}
                      onChange={(e) => setWhatIfAmount(e.target.value)}
                      placeholder="0"
                      className="input w-full pl-7"
                      style={{ background: 'var(--bg-secondary)' }}
                    />
                  </div>
                </div>
                {whatIfResult && (
                  <motion.div 
                    className="flex-1 grid grid-cols-2 gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining Budget</div>
                      <div className="font-semibold" style={{ 
                        color: whatIfResult.remainingBudget < 0 ? 'var(--error)' : 'var(--success)' 
                      }}>
                        {formatCurrency(whatIfResult.remainingBudget)}
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining Loan</div>
                      <div className="font-semibold" style={{ 
                        color: whatIfResult.remainingLoan < 0 ? 'var(--error)' : 'var(--text-primary)' 
                      }}>
                        {formatCurrency(whatIfResult.remainingLoan)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// Amortization View Component
function AmortizationView({
  stats,
  project,
  projectionDays,
  setProjectionDays,
  showProjection,
  setShowProjection,
  projectionResult,
  whatIfAmount,
  setWhatIfAmount,
  showWhatIf,
  setShowWhatIf,
  whatIfResult,
}: {
  stats: any
  project: Project
  projectionDays: number
  setProjectionDays: (days: number) => void
  showProjection: boolean
  setShowProjection: (value: boolean) => void
  projectionResult: any
  whatIfAmount: string
  setWhatIfAmount: (value: string) => void
  showWhatIf: boolean
  setShowWhatIf: (value: boolean) => void
  whatIfResult: any
}) {
  return (
    <>
      {/* Amortization Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Principal Balance"
          value={formatCurrency(stats.currentPrincipal)}
          color="var(--text-primary)"
        />
        <StatCard
          label="Total Interest"
          value={formatCurrencyPrecise(stats.totalInterest)}
          color="var(--warning)"
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
          label="Current Fee Rate"
          value={formatRate(stats.currentFeeRate)}
          color={stats.currentFeeRate > (project.origination_fee_pct || 0.02) ? 'var(--warning)' : 'var(--text-primary)'}
          badge={stats.nextFeeIncrease ? `Next: ${formatDate(stats.nextFeeIncrease)}` : undefined}
          badgeColor="var(--warning)"
        />
      </div>

      {/* Interactive Controls */}
      <div className="border-t pt-4 space-y-4" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Interest Projection Slider */}
        <div>
          <button
            onClick={() => setShowProjection(!showProjection)}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: showProjection ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <svg 
              className="w-4 h-4 transition-transform" 
              style={{ transform: showProjection ? 'rotate(90deg)' : 'rotate(0deg)' }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Interest Projection
          </button>

          <AnimatePresence>
            {showProjection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      Project payoff in {projectionDays} days
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
                      <span>180 days</span>
                    </div>
                  </div>
                  {projectionResult && (
                    <motion.div 
                      className="grid grid-cols-2 gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Interest</div>
                        <div className="font-semibold" style={{ color: 'var(--warning)' }}>
                          {formatCurrencyPrecise(projectionResult.interest)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--success-muted)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Payoff</div>
                        <div className="font-semibold" style={{ color: 'var(--success)' }}>
                          {formatCurrency(projectionResult.total)}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* What-If Calculator */}
        <div>
          <button
            onClick={() => setShowWhatIf(!showWhatIf)}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: showWhatIf ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <svg 
              className="w-4 h-4 transition-transform" 
              style={{ transform: showWhatIf ? 'rotate(90deg)' : 'rotate(0deg)' }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            What-If Calculator
          </button>

          <AnimatePresence>
            {showWhatIf && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      If next draw is...
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        value={whatIfAmount}
                        onChange={(e) => setWhatIfAmount(e.target.value)}
                        placeholder="0"
                        className="input w-full pl-7"
                        style={{ background: 'var(--bg-secondary)' }}
                      />
                    </div>
                  </div>
                  {whatIfResult && (
                    <motion.div 
                      className="flex-1 grid grid-cols-2 gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>New Principal</div>
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(whatIfResult.newPrincipal)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>New Per Diem</div>
                        <div className="font-semibold" style={{ color: 'var(--warning)' }}>
                          {formatCurrencyPrecise(whatIfResult.newPerDiem)}
                          <span className="text-xs ml-1" style={{ color: whatIfResult.interestChange > 0 ? 'var(--error)' : 'var(--success)' }}>
                            ({whatIfResult.interestChange > 0 ? '+' : ''}{formatCurrencyPrecise(whatIfResult.interestChange)})
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
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

