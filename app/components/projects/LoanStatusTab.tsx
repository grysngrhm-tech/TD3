'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, Budget, DrawRequest, DrawRequestLine, LifecycleStage } from '@/types/database'
import { ReportToggle, type ReportType } from '@/app/components/ui/ReportToggle'
import { ViewModeSelector, type ViewMode } from '@/app/components/ui/ViewModeSelector'
import { ReportDetailPanel, type DetailPanelContent } from '@/app/components/ui/ReportDetailPanel'
import { ProgressBudgetReport } from '@/app/components/projects/ProgressBudgetReport'
import { AmortizationTable } from '@/app/components/projects/AmortizationTable'
import { PayoffReport } from '@/app/components/projects/PayoffReport'
import { PolymorphicLoanDetails } from '@/app/components/projects/PolymorphicLoanDetails'
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection'

type DrawLineWithBudget = DrawRequestLine & {
  budget?: Budget | null
  draw_request?: DrawRequest | null
}

type LoanStatusTabProps = {
  project: Project & { lifecycle_stage: LifecycleStage }
  budgets: Budget[]
  draws: DrawRequest[]
  drawLines?: DrawLineWithBudget[]
  onDrawImported?: () => void
}

export function LoanStatusTab({ 
  project, 
  budgets, 
  draws, 
  drawLines = [],
  onDrawImported 
}: LoanStatusTabProps) {
  const router = useRouter()
  
  // Report state
  const [activeReport, setActiveReport] = useState<ReportType>('budget')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [detailPanelContent, setDetailPanelContent] = useState<DetailPanelContent>(null)
  
  // Payoff interactive state (lifted for shared access between header and report)
  const [payoffDate, setPayoffDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [projectionDays, setProjectionDays] = useState(30)
  const [whatIfDate, setWhatIfDate] = useState<string>('')
  const [customFeeStartDate, setCustomFeeStartDate] = useState<string | null>(null)

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Calculate loan metrics
  const loanAmount = project.loan_amount || 0
  const totalDrawn = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
  const remaining = loanAmount - totalDrawn
  const percentDrawn = loanAmount > 0 ? (totalDrawn / loanAmount) * 100 : 0

  // Detect anomalies
  const anomalies = useMemo(() => {
    return detectAnomalies(budgets, draws, drawLines, project)
  }, [budgets, draws, drawLines, project])

  // Prepare draws for amortization - aggregate by draw (not individual lines)
  const drawLinesForAmort = useMemo(() => {
    // Use the draws array directly, not individual draw lines
    return draws
      .filter(draw => draw.status === 'funded' && draw.funded_at)
      .map(draw => ({
        amount: draw.total_amount || 0,
        date: draw.funded_at || draw.request_date || '',
        drawNumber: draw.draw_number,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [draws])

  // Calculate alerts
  const alerts: { type: 'warning' | 'error' | 'info'; message: string }[] = []
  
  // Check for maturity date
  if (project.maturity_date) {
    const maturityDate = new Date(project.maturity_date)
    const today = new Date()
    const daysToMaturity = Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysToMaturity < 0) {
      alerts.push({ type: 'error', message: `Loan matured ${Math.abs(daysToMaturity)} days ago` })
    } else if (daysToMaturity <= 30) {
      alerts.push({ type: 'warning', message: `Maturity in ${daysToMaturity} days` })
    } else if (daysToMaturity <= 60) {
      alerts.push({ type: 'info', message: `Maturity in ${daysToMaturity} days` })
    }
  }

  // Check for budget overages
  const overBudgetCount = budgets.filter(b => (b.spent_amount || 0) > (b.current_amount || 0)).length
  if (overBudgetCount > 0) {
    alerts.push({ type: 'warning', message: `${overBudgetCount} line item${overBudgetCount > 1 ? 's' : ''} over budget` })
  }

  // Check for high draw percentage
  if (percentDrawn > 90) {
    alerts.push({ type: 'info', message: `${percentDrawn.toFixed(0)}% of loan drawn` })
  }

  // Add anomaly alerts
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
  if (criticalAnomalies.length > 0) {
    alerts.push({ type: 'error', message: `${criticalAnomalies.length} critical anomal${criticalAnomalies.length > 1 ? 'ies' : 'y'} detected` })
  }

  const isActive = project.lifecycle_stage === 'active'

  const getStatusBadgeClass = (status: string | null) => {
    const statusMap: Record<string, string> = {
      pending: 'badge-draft',
      approved: 'badge-active',
      funded: 'badge-completed',
      rejected: 'badge-on_hold',
    }
    return statusMap[status || 'pending'] || 'badge-draft'
  }

  return (
    <div className="space-y-6">
      {/* Loan Summary Card */}
      <div className="card-ios">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Max Loan</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(loanAmount)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Drawn</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatCurrency(totalDrawn)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Remaining</div>
            <div className="text-3xl font-bold" style={{ color: remaining < 0 ? 'var(--error)' : 'var(--success)' }}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <motion.div 
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: 'var(--accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentDrawn, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>{percentDrawn.toFixed(1)}% drawn</span>
          <span>{draws.length} draw{draws.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Draws Section - Full Width */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Draws</h3>
          {isActive && (
            <button
              onClick={() => router.push(`/draws/new?project=${project.id}`)}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Draw
            </button>
          )}
        </div>

        {draws.length === 0 ? (
          <div className="text-center py-12">
            <div 
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'var(--bg-hover)' }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="mb-3" style={{ color: 'var(--text-muted)' }}>No draws yet</p>
            {isActive && (
              <button
                onClick={() => router.push(`/draws/new?project=${project.id}`)}
                className="btn-primary"
              >
                Submit First Draw
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y max-h-[300px] overflow-y-auto" style={{ borderColor: 'var(--border-subtle)' }}>
            {draws.map((draw) => (
              <div 
                key={draw.id} 
                className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                onClick={() => router.push(`/draws/${draw.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                    style={{ background: 'var(--bg-card)', color: 'var(--accent)' }}
                  >
                    #{draw.draw_number}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Draw #{draw.draw_number}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(draw.request_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(draw.total_amount)}
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(draw.status)}`}>
                    {draw.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="card-ios p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alerts ({alerts.length})
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {alerts.map((alert, index) => (
              <div key={index} className="px-4 py-3 flex items-center gap-3">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    background: alert.type === 'error' ? 'var(--error)' 
                      : alert.type === 'warning' ? 'var(--warning)' 
                      : 'var(--accent)' 
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ReportToggle value={activeReport} onChange={setActiveReport} />
        <ViewModeSelector 
          value={viewMode} 
          onChange={setViewMode}
          storageKey="loan-status-view-mode"
        />
      </div>

      {/* Polymorphic Loan Details Tile - Expandable Accordion */}
      <PolymorphicLoanDetails
        project={project}
        budgets={budgets}
        draws={draws}
        drawLines={drawLinesForAmort}
        activeReport={activeReport}
        anomalies={anomalies}
        // Payoff interactive controls (lifted state)
        payoffDate={payoffDate}
        onPayoffDateChange={setPayoffDate}
        projectionDays={projectionDays}
        onProjectionDaysChange={setProjectionDays}
        whatIfDate={whatIfDate}
        onWhatIfDateChange={setWhatIfDate}
        customFeeStartDate={customFeeStartDate}
        onCustomFeeStartDateChange={setCustomFeeStartDate}
      />

      {/* Dynamic Report Area */}
      <AnimatePresence mode="wait">
        {activeReport === 'budget' && (
          <motion.div
            key="budget-report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ProgressBudgetReport
              budgets={budgets}
              drawLines={drawLines}
              draws={draws}
              anomalies={anomalies}
              viewMode={viewMode}
              onSelectItem={setDetailPanelContent}
            />
          </motion.div>
        )}
        
        {activeReport === 'amortization' && (
          <motion.div
            key="amort-report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <AmortizationTable
              project={project}
              draws={draws}
              drawLines={drawLinesForAmort}
              viewMode={viewMode}
              payoffDate={null}
            />
          </motion.div>
        )}
        
        {activeReport === 'payoff' && (
          <motion.div
            key="payoff-report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <PayoffReport
              project={project}
              draws={draws}
              drawLines={drawLinesForAmort}
              viewMode={viewMode}
              onLoanCompleted={onDrawImported}
              // Lifted state from parent
              payoffDate={payoffDate}
              onPayoffDateChange={setPayoffDate}
              projectionDays={projectionDays}
              onProjectionDaysChange={setProjectionDays}
              whatIfDate={whatIfDate}
              onWhatIfDateChange={setWhatIfDate}
              customFeeStartDate={customFeeStartDate}
              onCustomFeeStartDateChange={setCustomFeeStartDate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Panel for Details */}
      <ReportDetailPanel
        content={detailPanelContent}
        onClose={() => setDetailPanelContent(null)}
      />
    </div>
  )
}
