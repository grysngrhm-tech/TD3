'use client'

import { useState } from 'react'
import type { Project, Budget, LifecycleStage } from '@/types/database'
import { ImportPreview } from '@/app/components/import/ImportPreview'
import { toast } from '@/app/components/ui/Toast'

type OriginationTabProps = {
  project: Project & { lifecycle_stage: LifecycleStage }
  budgets: Budget[]
  onBudgetImported?: () => void
}

export function OriginationTab({ project, budgets, onBudgetImported }: OriginationTabProps) {
  const [showBudgetImport, setShowBudgetImport] = useState(false)

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate metrics
  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  const ltvRatio = project.appraised_value && project.loan_amount 
    ? (project.loan_amount / project.appraised_value) * 100 
    : null
  const costPerSqft = project.square_footage && project.loan_amount
    ? project.loan_amount / project.square_footage
    : null

  const isPending = project.lifecycle_stage === 'pending'

  // LTV gauge color
  const getLtvColor = (ltv: number) => {
    if (ltv <= 70) return 'var(--success)'
    if (ltv <= 80) return 'var(--warning)'
    return 'var(--error)'
  }

  return (
    <div className="space-y-6">
      {/* Qualification Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {/* LTV Ratio */}
        <div className="card-ios">
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>LTV Ratio</div>
          {ltvRatio !== null ? (
            <>
              <div className="text-3xl font-bold mb-3" style={{ color: getLtvColor(ltvRatio) }}>
                {ltvRatio.toFixed(1)}%
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(ltvRatio, 100)}%`,
                    background: getLtvColor(ltvRatio)
                  }}
                />
                {/* 80% marker */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: '80%', background: 'var(--text-muted)', opacity: 0.5 }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span>80%</span>
                <span>100%</span>
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>—</div>
          )}
        </div>

        {/* Cost per Sqft */}
        <div className="card-ios">
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Cost / Sq Ft</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {costPerSqft ? `$${costPerSqft.toFixed(0)}` : '—'}
          </div>
          {project.square_footage && (
            <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              {project.square_footage.toLocaleString()} sq ft
            </div>
          )}
        </div>

        {/* Total Budget */}
        <div className="card-ios">
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Total Budget</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalBudget > 0 ? formatCurrency(totalBudget) : '—'}
          </div>
          <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {budgets.length} line items
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="card-ios">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Project Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Builder</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.builder_name || '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Borrower</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.borrower_name || '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Address</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.address || '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Subdivision</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.subdivision_name || '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Loan Amount</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(project.loan_amount)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Appraised Value</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(project.appraised_value)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Sales Price</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(project.sales_price)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Interest Rate</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {project.interest_rate_annual 
                ? `${(project.interest_rate_annual * 100).toFixed(2)}%` 
                : '—'}
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

      {/* Budget Section */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Budget</h3>
          {isPending && (
            <button 
              onClick={() => setShowBudgetImport(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Budget
            </button>
          )}
        </div>

        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <div 
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'var(--bg-hover)' }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="mb-3" style={{ color: 'var(--text-muted)' }}>No budget uploaded yet</p>
            {isPending && (
              <button 
                onClick={() => setShowBudgetImport(true)}
                className="btn-primary"
              >
                Upload Budget
              </button>
            )}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="table-header">Category</th>
                  <th className="table-header text-right">Budget</th>
                  <th className="table-header">NAHB Code</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {budget.category}
                      </div>
                      {budget.builder_category_raw && budget.builder_category_raw !== budget.category && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {budget.builder_category_raw}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(budget.current_amount)}
                    </td>
                    <td className="table-cell" style={{ color: 'var(--text-muted)' }}>
                      {budget.cost_code || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-hover)' }}>
                  <td className="table-cell font-semibold">Total</td>
                  <td className="table-cell text-right font-semibold">
                    {formatCurrency(totalBudget)}
                  </td>
                  <td className="table-cell"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Budget Import Modal */}
      <ImportPreview
        isOpen={showBudgetImport}
        onClose={() => setShowBudgetImport(false)}
        onSuccess={() => {
          setShowBudgetImport(false)
          toast({
            type: 'success',
            title: 'Budget Submitted',
            message: 'Budget sent for processing. Refresh in a moment to see updates.'
          })
          onBudgetImported?.()
        }}
        importType="budget"
        preselectedProjectId={project.id}
      />
    </div>
  )
}
