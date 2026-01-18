'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigation } from '@/app/context/NavigationContext'
import { Project, Budget } from '@/types/database'

type BudgetWithProject = Budget & { project_name?: string }

export default function BudgetsPage() {
  const { setCurrentPageTitle } = useNavigation()
  const [budgets, setBudgets] = useState<BudgetWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('all')

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('Budgets')
  }, [setCurrentPageTitle])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      setProjects(projectsData || [])

      // Load budgets with project names
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select(`
          *,
          projects (name)
        `)
        .order('sort_order')

      setBudgets(
        budgetsData?.map((b: any) => ({
          ...b,
          project_name: b.projects?.name,
        })) || []
      )
    } catch (error) {
      console.error('Error loading budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBudgets = selectedProject === 'all'
    ? budgets
    : budgets.filter(b => b.project_id === selectedProject)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressColor = (remaining: number, current: number) => {
    const percent = current > 0 ? (remaining / current) * 100 : 100
    if (percent > 50) return 'var(--success)'
    if (percent > 25) return 'var(--warning)'
    return 'var(--error)'
  }

  // Calculate totals for filtered budgets
  const totals = filteredBudgets.reduce(
    (acc, b) => ({
      original: acc.original + b.original_amount,
      current: acc.current + b.current_amount,
      spent: acc.spent + b.spent_amount,
      remaining: acc.remaining + (b.remaining_amount ?? 0),
    }),
    { original: 0, current: 0, spent: 0, remaining: 0 }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div 
          className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Budgets</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Manage project budget line items</p>
        </div>
        <a href="/budgets/new" className="btn-primary">
          + New Budget
        </a>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Filter by Project:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input max-w-xs"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Original Budget</div>
          <div className="text-xl font-bold financial-value" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.original)}</div>
        </div>
        <div className="card" style={{ background: 'var(--accent-muted)' }}>
          <div className="text-sm" style={{ color: 'var(--accent)' }}>Current Budget</div>
          <div className="text-xl font-bold financial-value" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.current)}</div>
        </div>
        <div className="card" style={{ background: 'var(--success-muted)' }}>
          <div className="text-sm" style={{ color: 'var(--success)' }}>Spent</div>
          <div className="text-xl font-bold financial-value" style={{ color: 'var(--success)' }}>{formatCurrency(totals.spent)}</div>
        </div>
        <div className="card" style={{ background: 'var(--warning-muted)' }}>
          <div className="text-sm" style={{ color: 'var(--warning)' }}>Remaining</div>
          <div className="text-xl font-bold financial-value" style={{ color: 'var(--warning)' }}>{formatCurrency(totals.remaining)}</div>
        </div>
      </div>

      {/* Budget Table */}
      <div className="card p-0 overflow-hidden">
        {filteredBudgets.length === 0 ? (
          <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No budget items found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Project</th>
                  <th className="table-header">Category</th>
                  <th className="table-header text-right">Original</th>
                  <th className="table-header text-right">Current</th>
                  <th className="table-header text-right">Spent</th>
                  <th className="table-header text-right">Remaining</th>
                  <th className="table-header">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((budget) => (
                  <tr key={budget.id} className="table-row">
                    <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{budget.project_name}</td>
                    <td className="table-cell font-medium">{budget.category}</td>
                    <td className="table-cell text-right financial-value">{formatCurrency(budget.original_amount)}</td>
                    <td className="table-cell text-right financial-value">{formatCurrency(budget.current_amount)}</td>
                    <td className="table-cell text-right financial-value" style={{ color: 'var(--success)' }}>{formatCurrency(budget.spent_amount)}</td>
                    <td className="table-cell text-right font-medium financial-value">{formatCurrency(budget.remaining_amount ?? 0)}</td>
                    <td className="table-cell">
                      <div className="w-24 h-2 overflow-hidden" style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)' }}>
                        <div
                          className="h-2"
                          style={{
                            background: getProgressColor(budget.remaining_amount ?? 0, budget.current_amount),
                            borderRadius: 'var(--radius-full)',
                            width: `${budget.current_amount > 0 ? Math.min(100, ((budget.current_amount - (budget.remaining_amount ?? 0)) / budget.current_amount) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: 'var(--bg-hover)' }}>
                <tr className="font-semibold">
                  <td className="table-cell" colSpan={2}>Total</td>
                  <td className="table-cell text-right financial-value">{formatCurrency(totals.original)}</td>
                  <td className="table-cell text-right financial-value">{formatCurrency(totals.current)}</td>
                  <td className="table-cell text-right financial-value" style={{ color: 'var(--success)' }}>{formatCurrency(totals.spent)}</td>
                  <td className="table-cell text-right financial-value">{formatCurrency(totals.remaining)}</td>
                  <td className="table-cell"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

