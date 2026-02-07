'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useNavigation } from '@/app/context/NavigationContext'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import type { Project, Budget, DrawRequest } from '@/types/custom'
import { formatCurrencyWhole as formatCurrency } from '@/lib/formatters'

type CategorySummary = {
  nahbCode: string
  nahbCategory: string
  original: number
  current: number
  spent: number
  remaining: number
  percentComplete: number
  lineItems: Budget[]
}

export default function ProgressReportPage() {
  const params = useParams()
  const { setCurrentPageTitle } = useNavigation()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [draws, setDraws] = useState<DrawRequest[]>([])
  const [totals, setTotals] = useState({
    original: 0,
    current: 0,
    spent: 0,
    remaining: 0,
    percentComplete: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadReport = useCallback(async () => {
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData as Project)

      // Fetch budgets
      const { data: budgetsRaw } = await supabase
        .from('budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      const budgets = (budgetsRaw || []) as Budget[]

      // Fetch draws
      const { data: drawsData } = await supabase
        .from('draw_requests')
        .select('*')
        .eq('project_id', projectId)
        // Canonical status is 'funded'. Keep 'paid' for legacy rows.
        .in('status', ['funded', 'paid'])
        .order('draw_number', { ascending: true })

      setDraws((drawsData || []) as DrawRequest[])

      // Calculate totals
      const totalOriginal = budgets?.reduce((sum, b) => sum + (b.original_amount || 0), 0) || 0
      const totalCurrent = budgets?.reduce((sum, b) => sum + (b.current_amount || 0), 0) || 0
      const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

      setTotals({
        original: totalOriginal,
        current: totalCurrent,
        spent: totalSpent,
        remaining: totalCurrent - totalSpent,
        percentComplete: totalCurrent > 0 ? Math.round((totalSpent / totalCurrent) * 100) : 0,
      })

      // Group by NAHB category
      const categoryMap: Record<string, CategorySummary> = {}

      for (const budget of budgets || []) {
        const key = budget.nahb_category || budget.category || 'Uncategorized'
        if (!categoryMap[key]) {
          categoryMap[key] = {
            nahbCode: budget.cost_code || '',
            nahbCategory: key,
            original: 0,
            current: 0,
            spent: 0,
            remaining: 0,
            percentComplete: 0,
            lineItems: [],
          }
        }
        categoryMap[key].original += budget.original_amount || 0
        categoryMap[key].current += budget.current_amount || 0
        categoryMap[key].spent += budget.spent_amount || 0
        categoryMap[key].remaining += budget.remaining_amount || 0
        categoryMap[key].lineItems.push(budget)
      }

      // Calculate percentages
      const categoriesArray = Object.values(categoryMap).map((cat) => ({
        ...cat,
        percentComplete: cat.current > 0 ? Math.round((cat.spent / cat.current) * 100) : 0,
      }))

      setCategories(categoriesArray)
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Update page title when project loads
  useEffect(() => {
    if (project) {
      setCurrentPageTitle(`${project.name} Report`)
    }
  }, [project, setCurrentPageTitle])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Project Not Found</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-600 mt-1">
            Progress Budget Report • Generated {new Date().toLocaleDateString()}
          </p>
        </div>
        <a
          href={`/api/reports/progress/${projectId}?format=html`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </a>
      </div>

      {/* Project Info */}
      {(project.address || project.builder_name || project.borrower_name) && (
        <div className="card bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.address && (
              <div>
                <p className="text-slate-500">Address</p>
                <p className="font-medium text-slate-900">{project.address}</p>
              </div>
            )}
            {project.builder_name && (
              <div>
                <p className="text-slate-500">Builder</p>
                <p className="font-medium text-slate-900">{project.builder_name}</p>
              </div>
            )}
            {project.borrower_name && (
              <div>
                <p className="text-slate-500">Borrower</p>
                <p className="font-medium text-slate-900">{project.borrower_name}</p>
              </div>
            )}
            {project.loan_amount && (
              <div>
                <p className="text-slate-500">Loan Amount</p>
                <p className="font-medium text-slate-900">{formatCurrency(project.loan_amount)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Original Budget</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totals.original)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Current Budget</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totals.current)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Drawn</p>
          <p className="text-xl font-bold text-primary-600">{formatCurrency(totals.spent)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Remaining</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.remaining)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Progress</p>
          <p className="text-xl font-bold text-slate-900">{totals.percentComplete}%</p>
          <div className="mt-2 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${totals.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Budget by Category</h3>
          <span className="text-sm text-slate-500">{categories.length} categories</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Category</th>
                <th className="table-header text-right">Original</th>
                <th className="table-header text-right">Current</th>
                <th className="table-header text-right">Spent</th>
                <th className="table-header text-right">Remaining</th>
                <th className="table-header" style={{ width: '150px' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <p className="font-medium text-slate-900">{cat.nahbCategory}</p>
                    {cat.nahbCode && (
                      <p className="text-xs text-slate-500">{cat.nahbCode}</p>
                    )}
                  </td>
                  <td className="table-cell text-right text-slate-600">
                    {formatCurrency(cat.original)}
                  </td>
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(cat.current)}
                  </td>
                  <td className="table-cell text-right text-primary-600 font-medium">
                    {formatCurrency(cat.spent)}
                  </td>
                  <td className="table-cell text-right text-emerald-600">
                    {formatCurrency(cat.remaining)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-primary-500 h-full rounded-full"
                          style={{ width: `${cat.percentComplete}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600 w-10 text-right">
                        {cat.percentComplete}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td className="table-cell">Total</td>
                <td className="table-cell text-right">{formatCurrency(totals.original)}</td>
                <td className="table-cell text-right">{formatCurrency(totals.current)}</td>
                <td className="table-cell text-right text-primary-600">{formatCurrency(totals.spent)}</td>
                <td className="table-cell text-right text-emerald-600">{formatCurrency(totals.remaining)}</td>
                <td className="table-cell">
                  <span className="text-slate-700">{totals.percentComplete}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Draw History */}
      {draws.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Draw History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
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
                    <td className="table-cell font-medium">#{draw.draw_number}</td>
                    <td className="table-cell text-slate-600">
                      {new Date(draw.request_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(draw.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span className={`status-${draw.status}`}>{draw.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td className="table-cell" colSpan={2}>Total Drawn</td>
                  <td className="table-cell text-right">
                    {formatCurrency(draws.reduce((sum, d) => sum + d.total_amount, 0))}
                  </td>
                  <td className="table-cell"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

