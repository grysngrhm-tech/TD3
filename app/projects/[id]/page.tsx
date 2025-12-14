'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Project, Budget, DrawRequest } from '@/types/database'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [draws, setDraws] = useState<DrawRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      setBudgets(budgetsData || [])

      // Fetch draws
      const { data: drawsData } = await supabase
        .from('draw_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('draw_number', { ascending: false })

      setDraws(drawsData || [])
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-primary-100 text-primary-700',
      on_hold: 'bg-amber-100 text-amber-700',
      draft: 'status-draft',
      submitted: 'status-submitted',
      approved: 'status-approved',
      rejected: 'status-rejected',
      paid: 'status-paid',
    }
    return classes[status] || 'bg-slate-100 text-slate-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Project Not Found</h2>
        <a href="/projects" className="btn-primary inline-block mt-4">
          Back to Projects
        </a>
      </div>
    )
  }

  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
  const totalRemaining = totalBudget - totalSpent
  const percentComplete = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <a href="/projects" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Projects
          </a>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            {project.name}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
          </h1>
          <p className="text-slate-600 mt-1">
            {project.address || 'No address'}
            {project.project_code && ` • ${project.project_code}`}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/reports/progress/${projectId}`}
            className="btn-secondary"
          >
            View Report
          </a>
          <a
            href={`/projects/${projectId}/edit`}
            className="btn-primary"
          >
            Edit Project
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Loan Amount</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(project.loan_amount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Budget</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Drawn</p>
          <p className="text-xl font-bold text-primary-600">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Remaining</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalRemaining)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Progress</p>
          <p className="text-xl font-bold text-slate-900">{percentComplete}%</p>
          <div className="mt-2 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary-600 h-full rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Project Details */}
      {(project.builder_name || project.borrower_name || project.interest_rate_annual) && (
        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Project Details</h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.builder_name && (
              <div>
                <dt className="text-slate-500">Builder</dt>
                <dd className="font-medium text-slate-900">{project.builder_name}</dd>
              </div>
            )}
            {project.borrower_name && (
              <div>
                <dt className="text-slate-500">Borrower</dt>
                <dd className="font-medium text-slate-900">{project.borrower_name}</dd>
              </div>
            )}
            {project.interest_rate_annual && (
              <div>
                <dt className="text-slate-500">Interest Rate</dt>
                <dd className="font-medium text-slate-900">{(project.interest_rate_annual * 100).toFixed(2)}%</dd>
              </div>
            )}
            {project.loan_term_months && (
              <div>
                <dt className="text-slate-500">Loan Term</dt>
                <dd className="font-medium text-slate-900">{project.loan_term_months} months</dd>
              </div>
            )}
            {project.loan_start_date && (
              <div>
                <dt className="text-slate-500">Start Date</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(project.loan_start_date).toLocaleDateString()}
                </dd>
              </div>
            )}
            {project.maturity_date && (
              <div>
                <dt className="text-slate-500">Maturity Date</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(project.maturity_date).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Summary */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Budget Summary</h3>
            <a href="/budgets/new" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              + Add Line
            </a>
          </div>
          {budgets.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No budget lines yet</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="table-header">Category</th>
                    <th className="table-header text-right">Budget</th>
                    <th className="table-header text-right">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.slice(0, 10).map((budget) => (
                    <tr key={budget.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <p className="font-medium">{budget.category}</p>
                        {budget.nahb_category && (
                          <p className="text-xs text-slate-500">{budget.cost_code}</p>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        {formatCurrency(budget.current_amount)}
                      </td>
                      <td className="table-cell text-right text-primary-600">
                        {formatCurrency(budget.spent_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {budgets.length > 10 && (
                <div className="text-center py-2 border-t border-slate-100">
                  <a href="/budgets" className="text-primary-600 hover:text-primary-700 text-sm">
                    View all {budgets.length} line items →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Draw History */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Draw History</h3>
            <a href="/draws/new" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              + New Draw
            </a>
          </div>
          {draws.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No draws yet</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="table-header">Draw #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header text-right">Amount</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.map((draw) => (
                    <tr key={draw.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <a
                          href={`/draws/${draw.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          #{draw.draw_number}
                        </a>
                      </td>
                      <td className="table-cell text-slate-600">
                        {new Date(draw.request_date).toLocaleDateString()}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(draw.total_amount)}
                      </td>
                      <td className="table-cell">
                        <span className={getStatusClass(draw.status)}>{draw.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

