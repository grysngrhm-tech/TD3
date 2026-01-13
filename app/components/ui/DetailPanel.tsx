'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { supabase } from '@/lib/supabase'

type Budget = {
  id: string
  category: string
  original_amount: number
  current_amount: number
  spent_amount: number
  remaining_amount: number | null
  sort_order: number | null
}

type DrawRequest = {
  id: string
  draw_number: number
  request_date: string | null
  total_amount: number
  status: string | null
  notes: string | null
}

type Project = {
  id: string
  project_code: string | null
  name: string
  address: string | null
  builder_name: string | null
  borrower_name: string | null
  subdivision_name: string | null
  loan_amount: number | null
  interest_rate_annual: number | null
  status: string
}

type DetailPanelProps = {
  projectId: string | null
  onClose: () => void
}

export function DetailPanel({ projectId, onClose }: DetailPanelProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [draws, setDraws] = useState<DrawRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (projectId) {
      loadProjectDetails()
    }
  }, [projectId])

  async function loadProjectDetails() {
    if (!projectId) return
    setLoading(true)
    
    try {
      // Load project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      // Load budgets
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      // Load draws
      const { data: drawData } = await supabase
        .from('draw_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('draw_number', { ascending: true })

      setProject(projectData)
      setBudgets(budgetData || [])
      setDraws(drawData || [])
    } catch (error) {
      console.error('Error loading project details:', error)
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

  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  return (
    <AnimatePresence>
      {projectId && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 overlay"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-14 bottom-0 w-full max-w-2xl z-50 overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {project?.project_code || project?.name || 'Loading...'}
                </h2>
                {project?.address && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{project.address}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="w-10 h-10 rounded-ios-sm flex items-center justify-center transition-colors hover:bg-[var(--bg-hover)]"
              >
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <Tabs.List className="flex border-b px-6" style={{ borderColor: 'var(--border-subtle)' }}>
                {['overview', 'budget', 'draws', 'documents'].map((tab) => (
                  <Tabs.Trigger
                    key={tab}
                    value={tab}
                    className="px-4 py-3 text-sm font-medium capitalize transition-colors relative"
                    style={{ 
                      color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)'
                    }}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
                  </div>
                ) : (
                  <>
                    {/* Overview Tab */}
                    <Tabs.Content value="overview" className="p-6 space-y-6">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="card-ios">
                          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Budget</div>
                          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(totalBudget)}
                          </div>
                        </div>
                        <div className="card-ios">
                          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Drawn</div>
                          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                            {formatCurrency(totalSpent)}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {percentSpent.toFixed(1)}% of budget
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="card-ios">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Draw Progress</span>
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{draws.length} draws</span>
                        </div>
                        <div className="progress-bar h-3">
                          <div 
                            className="progress-bar-fill"
                            style={{ width: `${Math.min(percentSpent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="card-ios space-y-4">
                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Project Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Builder</div>
                            <div style={{ color: 'var(--text-primary)' }}>{project?.builder_name || '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Borrower</div>
                            <div style={{ color: 'var(--text-primary)' }}>{project?.borrower_name || '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Subdivision</div>
                            <div style={{ color: 'var(--text-primary)' }}>{project?.subdivision_name || '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Loan Amount</div>
                            <div style={{ color: 'var(--text-primary)' }}>{project?.loan_amount ? formatCurrency(project.loan_amount) : '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Interest Rate</div>
                            <div style={{ color: 'var(--text-primary)' }}>{project?.interest_rate_annual ? `${(project.interest_rate_annual * 100).toFixed(1)}%` : '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Status</div>
                            <span className={`badge badge-${project?.status || 'draft'}`}>
                              {project?.status?.replace('_', ' ') || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Tabs.Content>

                    {/* Budget Tab */}
                    <Tabs.Content value="budget" className="p-6">
                      <div className="card-ios p-0 overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="table-header">Category</th>
                              <th className="table-header text-right">Budget</th>
                              <th className="table-header text-right">Spent</th>
                              <th className="table-header text-right">Remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {budgets.map((budget) => {
                              const remaining = (budget.current_amount || 0) - (budget.spent_amount || 0)
                              return (
                                <tr key={budget.id} className="table-row">
                                  <td className="table-cell font-medium">{budget.category}</td>
                                  <td className="table-cell text-right">{formatCurrency(budget.current_amount)}</td>
                                  <td className="table-cell text-right" style={{ color: 'var(--accent)' }}>
                                    {budget.spent_amount > 0 ? formatCurrency(budget.spent_amount) : '-'}
                                  </td>
                                  <td className="table-cell text-right" style={{ 
                                    color: remaining < 0 ? 'var(--error)' : 'var(--text-secondary)' 
                                  }}>
                                    {formatCurrency(remaining)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: 'var(--bg-hover)' }}>
                              <td className="table-cell font-semibold">Total</td>
                              <td className="table-cell text-right font-semibold">{formatCurrency(totalBudget)}</td>
                              <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
                                {formatCurrency(totalSpent)}
                              </td>
                              <td className="table-cell text-right font-semibold">
                                {formatCurrency(totalBudget - totalSpent)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </Tabs.Content>

                    {/* Draws Tab */}
                    <Tabs.Content value="draws" className="p-6 space-y-4">
                      {draws.length === 0 ? (
                        <div className="text-center py-12">
                          <p style={{ color: 'var(--text-muted)' }}>No draws yet</p>
                        </div>
                      ) : (
                        draws.map((draw) => (
                          <div key={draw.id} className="card-ios">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  Draw #{draw.draw_number}
                                </span>
                                <span className={`badge badge-${draw.status || 'draft'}`}>
                                  {draw.status || 'draft'}
                                </span>
                              </div>
                              <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                                {formatCurrency(draw.total_amount)}
                              </span>
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {draw.request_date ? new Date(draw.request_date).toLocaleDateString() : 'No date'}
                            </div>
                            {draw.notes && (
                              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                                {draw.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </Tabs.Content>

                    {/* Documents Tab */}
                    <Tabs.Content value="documents" className="p-6">
                      <div className="drop-zone">
                        <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop files here</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>or click to browse</p>
                      </div>
                    </Tabs.Content>
                  </>
                )}
              </div>
            </Tabs.Root>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
