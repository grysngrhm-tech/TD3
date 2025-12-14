'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Project, Budget, DrawRequest, LifecycleStage } from '@/types/database'
import { ImportPreview } from '@/app/components/import/ImportPreview'
import { toast } from '@/app/components/ui/Toast'

type LoanStatusTabProps = {
  project: Project & { lifecycle_stage: LifecycleStage }
  budgets: Budget[]
  draws: DrawRequest[]
  onDrawImported?: () => void
}

export function LoanStatusTab({ project, budgets, draws, onDrawImported }: LoanStatusTabProps) {
  const [showDrawImport, setShowDrawImport] = useState(false)

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
  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  const totalDrawn = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
  const remaining = loanAmount - totalDrawn
  const percentDrawn = loanAmount > 0 ? (totalDrawn / loanAmount) * 100 : 0

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

      {/* Draws Section */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Draws</h3>
          {isActive && (
            <button 
              onClick={() => setShowDrawImport(true)}
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
                onClick={() => setShowDrawImport(true)}
                className="btn-primary"
              >
                Submit First Draw
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {draws.map((draw) => (
              <div 
                key={draw.id} 
                className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
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

      {/* Loan Details */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Loan Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Interest Rate</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.interest_rate_annual 
                ? `${(project.interest_rate_annual * 100).toFixed(2)}%` 
                : '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Start Date</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatDate(project.loan_start_date)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Maturity Date</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatDate(project.maturity_date)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Term</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.loan_term_months ? `${project.loan_term_months} months` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="card-ios p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alerts
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {alerts.map((alert, index) => (
              <div 
                key={index}
                className="px-4 py-3 flex items-center gap-3"
              >
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

      {/* Draw Import Modal */}
      <ImportPreview
        isOpen={showDrawImport}
        onClose={() => setShowDrawImport(false)}
        onSuccess={() => {
          setShowDrawImport(false)
          toast({
            type: 'success',
            title: 'Draw Submitted',
            message: 'Draw request sent for processing.'
          })
          onDrawImported?.()
        }}
        importType="draw"
        preselectedProjectId={project.id}
      />
    </div>
  )
}
