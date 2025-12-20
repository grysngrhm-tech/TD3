'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigation } from '@/app/context/NavigationContext'
import { DrawRequest } from '@/types/database'

type DrawWithProject = DrawRequest & { project_name?: string }

export default function DrawsPage() {
  const { setCurrentPageTitle } = useNavigation()
  const [draws, setDraws] = useState<DrawWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('All Draws')
  }, [setCurrentPageTitle])

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
    : draws.filter(d => {
        // Backward compatibility: older DB rows may have 'paid' (legacy) instead of 'funded'
        const normalized = d.status === 'paid' ? 'funded' : d.status
        return normalized === statusFilter
      })

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
      review: 'status-review',
      staged: 'status-staged',
      pending_wire: 'status-pending_wire',
      funded: 'status-funded',
      rejected: 'status-rejected',
      // Legacy aliases (still styled if encountered)
      submitted: 'status-submitted',
      approved: 'status-approved',
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Draw Requests</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Manage construction draw requests</p>
        </div>
        <a href="/draws/new" className="btn-primary">
          + New Draw Request
        </a>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{ 
            background: statusFilter === 'all' ? 'var(--accent)' : 'var(--bg-hover)',
            color: statusFilter === 'all' ? 'white' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          All ({draws.length})
        </button>
        {['draft', 'review', 'staged', 'pending_wire', 'funded', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className="px-4 py-2 text-sm font-medium transition-colors capitalize"
            style={{ 
              background: statusFilter === status ? 'var(--accent)' : 'var(--bg-hover)',
              color: statusFilter === status ? 'white' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {status} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {/* Draws Table */}
      <div className="card p-0 overflow-hidden">
        {filteredDraws.length === 0 ? (
          <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No draw requests found</p>
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
                  <tr 
                    key={draw.id} 
                    className="table-row"
                  >
                    <td className="table-cell font-medium">{draw.project_name || 'Unknown'}</td>
                    <td className="table-cell">#{draw.draw_number}</td>
                    <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(draw.request_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-right font-medium financial-value">
                      {formatCurrency(draw.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span className={getStatusClass(draw.status === 'paid' ? 'funded' : draw.status)}>
                        {draw.status === 'paid' ? 'funded' : draw.status}
                      </span>
                    </td>
                    <td className="table-cell text-sm max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {draw.notes || '-'}
                    </td>
                    <td className="table-cell">
                      <a
                        href={`/draws/${draw.id}`}
                        className="text-sm font-medium transition-colors"
                        style={{ color: 'var(--accent)' }}
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

