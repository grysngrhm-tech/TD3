'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project, Budget } from '@/types/database'

type BudgetWithProject = Budget & { project_name?: string }

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('all')

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
    if (percent > 50) return 'bg-emerald-500'
    if (percent > 25) return 'bg-amber-500'
    return 'bg-red-500'
  }

  // Calculate totals for filtered budgets
  const totals = filteredBudgets.reduce(
    (acc, b) => ({
      original: acc.original + b.original_amount,
      current: acc.current + b.current_amount,
      spent: acc.spent + b.spent_amount,
      remaining: acc.remaining + b.remaining_amount,
    }),
    { original: 0, current: 0, spent: 0, remaining: 0 }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budgets</h1>
          <p className="text-slate-600 mt-1">Manage project budget line items</p>
        </div>
        <a href="/budgets/new" className="btn-primary">
          + New Budget
        </a>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Filter by Project:</label>
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
        <div className="card bg-slate-50">
          <div className="text-sm text-slate-600">Original Budget</div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totals.original)}</div>
        </div>
        <div className="card bg-primary-50">
          <div className="text-sm text-primary-600">Current Budget</div>
          <div className="text-xl font-bold text-primary-900">{formatCurrency(totals.current)}</div>
        </div>
        <div className="card bg-emerald-50">
          <div className="text-sm text-emerald-600">Spent</div>
          <div className="text-xl font-bold text-emerald-900">{formatCurrency(totals.spent)}</div>
        </div>
        <div className="card bg-amber-50">
          <div className="text-sm text-amber-600">Remaining</div>
          <div className="text-xl font-bold text-amber-900">{formatCurrency(totals.remaining)}</div>
        </div>
      </div>

      {/* Budget Table */}
      <div className="card p-0 overflow-hidden">
        {filteredBudgets.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No budget items found</p>
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
                  <tr key={budget.id} className="hover:bg-slate-50">
                    <td className="table-cell text-sm text-slate-600">{budget.project_name}</td>
                    <td className="table-cell font-medium">{budget.category}</td>
                    <td className="table-cell text-right">{formatCurrency(budget.original_amount)}</td>
                    <td className="table-cell text-right">{formatCurrency(budget.current_amount)}</td>
                    <td className="table-cell text-right text-emerald-600">{formatCurrency(budget.spent_amount)}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(budget.remaining_amount)}</td>
                    <td className="table-cell">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(budget.remaining_amount, budget.current_amount)}`}
                          style={{
                            width: `${budget.current_amount > 0 ? Math.min(100, ((budget.current_amount - budget.remaining_amount) / budget.current_amount) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="table-cell" colSpan={2}>Total</td>
                  <td className="table-cell text-right">{formatCurrency(totals.original)}</td>
                  <td className="table-cell text-right">{formatCurrency(totals.current)}</td>
                  <td className="table-cell text-right text-emerald-600">{formatCurrency(totals.spent)}</td>
                  <td className="table-cell text-right">{formatCurrency(totals.remaining)}</td>
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

