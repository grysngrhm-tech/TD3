'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DrawRequest } from '@/types/database'

type DrawWithProject = DrawRequest & { project_name?: string }

export default function DrawsPage() {
  const [draws, setDraws] = useState<DrawWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadDraws()
  }, [])

  async function loadDraws() {
    try {
      const { data } = await supabase
        .from('draw_requests')
        .select(`
          *,
          projects (name)
        `)
        .order('created_at', { ascending: false })

      setDraws(
        data?.map((d: any) => ({
          ...d,
          project_name: d.projects?.name,
        })) || []
      )
    } catch (error) {
      console.error('Error loading draws:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDraws = statusFilter === 'all'
    ? draws
    : draws.filter(d => d.status === statusFilter)

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

  const statusCounts = draws.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
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
          <h1 className="text-2xl font-bold text-slate-900">Draw Requests</h1>
          <p className="text-slate-600 mt-1">Manage construction draw requests</p>
        </div>
        <a href="/draws/new" className="btn-primary">
          + New Draw Request
        </a>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({draws.length})
        </button>
        {['draft', 'submitted', 'approved', 'rejected', 'paid'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {/* Draws Table */}
      <div className="card p-0 overflow-hidden">
        {filteredDraws.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No draw requests found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Project</th>
                  <th className="table-header">Draw #</th>
                  <th className="table-header">Date</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Notes</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {filteredDraws.map((draw) => (
                  <tr key={draw.id} className="hover:bg-slate-50">
                    <td className="table-cell font-medium">{draw.project_name || 'Unknown'}</td>
                    <td className="table-cell">#{draw.draw_number}</td>
                    <td className="table-cell text-slate-600">
                      {new Date(draw.request_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(draw.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span className={getStatusClass(draw.status)}>{draw.status}</span>
                    </td>
                    <td className="table-cell text-slate-500 text-sm max-w-xs truncate">
                      {draw.notes || '-'}
                    </td>
                    <td className="table-cell">
                      <a
                        href={`/draws/${draw.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View →
                      </a>
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

