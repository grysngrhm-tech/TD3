'use client'

import type { Project, Budget, DrawRequest, LifecycleStage } from '@/types/custom'
import { formatCurrencyWhole as formatCurrency, formatDate } from '@/lib/formatters'

type PerformanceTabProps = {
  project: Project & { lifecycle_stage: LifecycleStage }
  budgets: Budget[]
  draws: DrawRequest[]
}

export function PerformanceTab({ project, budgets, draws }: PerformanceTabProps) {
  // Calculate loan metrics
  const loanAmount = project.loan_amount || 0
  const totalDrawn = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
  const payoffAmount = project.payoff_amount || 0
  
  // Calculate loan duration
  let loanDuration: number | null = null
  if (project.loan_start_date && project.payoff_date) {
    const start = new Date(project.loan_start_date)
    const end = new Date(project.payoff_date)
    loanDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Calculate simple interest earned (for display purposes)
  // This is a simplified calculation - real IRR would need cash flow analysis
  let interestEarned: number | null = null
  if (payoffAmount > 0 && totalDrawn > 0) {
    interestEarned = payoffAmount - totalDrawn
  }

  // Calculate simple IRR approximation
  let irrApprox: number | null = null
  if (interestEarned && loanDuration && totalDrawn > 0) {
    // Annualized simple return
    const daysInYear = 365
    irrApprox = (interestEarned / totalDrawn) * (daysInYear / loanDuration) * 100
  }

  // Determine outcome
  const isRejected = project.rejection_reason !== null
  const isPaidOff = project.payoff_date !== null && !isRejected

  return (
    <div className="space-y-6">
      {/* Outcome Banner */}
      <div 
        className="card-ios text-center py-8"
        style={{ 
          background: isRejected 
            ? 'rgba(239, 68, 68, 0.1)' 
            : 'rgba(34, 197, 94, 0.1)' 
        }}
      >
        <div 
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ 
            background: isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)' 
          }}
        >
          {isRejected ? (
            <svg className="w-8 h-8 text-error"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-success"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: isRejected ? 'var(--error)' : 'var(--success)' }}
        >
          {isRejected ? 'Loan Rejected' : 'Loan Paid Off'}
        </h2>
        {isRejected && project.rejection_reason && (
          <p className="text-text-secondary">{project.rejection_reason}</p>
        )}
        {isPaidOff && (
          <p className="text-text-muted">
            Closed on {formatDate(project.payoff_date)}
          </p>
        )}
      </div>

      {/* Performance Metrics */}
      {isPaidOff && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Payoff Amount */}
          <div className="card-ios text-center">
            <div className="text-sm mb-2 text-text-muted">Payoff Amount</div>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(payoffAmount)}
            </div>
          </div>

          {/* Interest Earned */}
          <div className="card-ios text-center">
            <div className="text-sm mb-2 text-text-muted">Interest Earned</div>
            <div className="text-2xl font-bold text-accent">
              {interestEarned !== null ? formatCurrency(interestEarned) : '—'}
            </div>
          </div>

          {/* Loan Duration */}
          <div className="card-ios text-center">
            <div className="text-sm mb-2 text-text-muted">Duration</div>
            <div className="text-2xl font-bold text-text-primary">
              {loanDuration !== null ? `${loanDuration} days` : '—'}
            </div>
            {loanDuration && (
              <div className="text-sm text-text-muted">
                {(loanDuration / 30).toFixed(1)} months
              </div>
            )}
          </div>

          {/* IRR */}
          <div className="card-ios text-center">
            <div className="text-sm mb-2 text-text-muted">Annual Return</div>
            <div className="text-2xl font-bold text-accent">
              {irrApprox !== null ? `${irrApprox.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Loan Summary */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4 text-text-primary">Loan Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-text-muted">Original Loan Amount</div>
            <div className="font-medium text-lg text-text-primary">
              {formatCurrency(loanAmount)}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Total Funded</div>
            <div className="font-medium text-lg text-accent">
              {formatCurrency(totalDrawn)}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Total Draws</div>
            <div className="font-medium text-lg text-text-primary">
              {draws.length}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Start Date</div>
            <div className="font-medium text-text-primary">
              {formatDate(project.loan_start_date)}
            </div>
          </div>
          <div>
            <div className="text-text-muted">End Date</div>
            <div className="font-medium text-text-primary">
              {formatDate(project.payoff_date)}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Interest Rate</div>
            <div className="font-medium text-text-primary">
              {project.interest_rate_annual 
                ? `${(project.interest_rate_annual * 100).toFixed(2)}%` 
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Draw History Summary */}
      {draws.length > 0 && (
        <div className="card-ios p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="font-semibold text-text-primary">Draw History</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background-secondary">
                <tr>
                  <th className="table-header">Draw #</th>
                  <th className="table-header">Date</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {draws.map((draw) => (
                  <tr key={draw.id} className="table-row">
                    <td className="table-cell font-medium">#{draw.draw_number}</td>
                    <td className="table-cell text-text-muted">
                      {formatDate(draw.request_date)}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(draw.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          background: 'rgba(34, 197, 94, 0.1)', 
                          color: 'var(--success)' 
                        }}
                      >
                        {draw.status || 'funded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Info */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4 text-text-primary">Project Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-text-muted">Builder</div>
            <div className="font-medium text-text-primary">
              {project.builder_name || '—'}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Borrower</div>
            <div className="font-medium text-text-primary">
              {project.borrower_name || '—'}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Address</div>
            <div className="font-medium text-text-primary">
              {project.address || '—'}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Subdivision</div>
            <div className="font-medium text-text-primary">
              {project.subdivision_name || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
