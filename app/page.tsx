'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project, Budget, DrawRequest } from '@/types/database'

type DashboardStats = {
  totalProjects: number
  totalBudget: number
  totalDrawn: number
  pendingDraws: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalBudget: 0,
    totalDrawn: 0,
    pendingDraws: 0,
  })
  const [recentDraws, setRecentDraws] = useState<(DrawRequest & { project_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // Get projects count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get budget totals
      const { data: budgets } = await supabase
        .from('budgets')
        .select('current_amount, spent_amount')

      const totalBudget = budgets?.reduce((sum, b) => sum + (b.current_amount || 0), 0) || 0
      const totalDrawn = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

      // Get pending draws count
      const { count: pendingCount } = await supabase
        .from('draw_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')

      // Get recent draws with project names
      const { data: draws } = await supabase
        .from('draw_requests')
        .select(`
          *,
          projects (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalProjects: projectCount || 0,
        totalBudget,
        totalDrawn,
        pendingDraws: pendingCount || 0,
      })

      setRecentDraws(
        draws?.map((d: any) => ({
          ...d,
          project_name: d.projects?.name,
        })) || []
      )
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      approved: 'status-approved',
      rejected: 'status-rejected',
      paid: 'status-paid',
    }
    return classes[status] || 'status-draft'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your construction draw management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="text-sm font-medium text-slate-500">Active Projects</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{stats.totalProjects}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-slate-500">Total Budget</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(stats.totalBudget)}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-slate-500">Total Drawn</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.totalDrawn)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.totalBudget > 0 ? ((stats.totalDrawn / stats.totalBudget) * 100).toFixed(1) : 0}% of budget
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-slate-500">Pending Draws</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{stats.pendingDraws}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <a href="/budgets/new" className="btn-primary">
          + New Budget
        </a>
        <a href="/draws/new" className="btn-secondary">
          + New Draw Request
        </a>
      </div>

      {/* Recent Draw Requests */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Draw Requests</h2>
        {recentDraws.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No draw requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Project</th>
                  <th className="table-header">Draw #</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDraws.map((draw) => (
                  <tr key={draw.id} className="hover:bg-slate-50">
                    <td className="table-cell font-medium">{draw.project_name || 'Unknown'}</td>
                    <td className="table-cell">#{draw.draw_number}</td>
                    <td className="table-cell">{formatCurrency(draw.total_amount)}</td>
                    <td className="table-cell">{new Date(draw.request_date).toLocaleDateString()}</td>
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
  )
}

