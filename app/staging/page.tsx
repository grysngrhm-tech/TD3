'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import type { Builder, DrawRequest, Project, WireBatch } from '@/types/database'
import { DashboardHeader } from '@/app/components/ui/DashboardHeader'
import { DrawStatusSelector } from '@/app/components/ui/DrawStatusSelector'
import { DrawFilterSidebar } from '@/app/components/ui/DrawFilterSidebar'
import { DrawStatsBar } from '@/app/components/ui/DrawStatsBar'
import { useNavigation } from '@/app/context/NavigationContext'

type DrawStatus = 'all' | 'review' | 'staged' | 'pending_wire'

type DrawWithProject = DrawRequest & {
  project?: Project & {
    builder?: Builder
  }
}

type WireBatchWithDetails = WireBatch & {
  builder?: Builder
  draws?: DrawWithProject[]
}

type BuilderWithDraws = Builder & {
  stagedDraws: DrawWithProject[]
  totalAmount: number
}

function StagingDashboardContent() {
  const searchParams = useSearchParams()
  const highlightedBatchId = searchParams.get('batch')
  const { setLastDashboard, setCurrentPageTitle } = useNavigation()

  const [loading, setLoading] = useState(true)
  const [pendingReview, setPendingReview] = useState<DrawWithProject[]>([])
  const [stagedByBuilder, setStagedByBuilder] = useState<BuilderWithDraws[]>([])
  const [pendingWireBatches, setPendingWireBatches] = useState<WireBatchWithDetails[]>([])
  
  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<DrawStatus>('all')
  const [selectedBuilders, setSelectedBuilders] = useState<string[]>([])
  
  // Bookkeeper modal state
  const [selectedBatch, setSelectedBatch] = useState<WireBatchWithDetails | null>(null)
  const [wireReference, setWireReference] = useState('')
  const [fundingNotes, setFundingNotes] = useState('')
  const [isFunding, setIsFunding] = useState(false)
  const [fundingError, setFundingError] = useState('')

  // Register this as the Draw dashboard
  useEffect(() => {
    setLastDashboard('draw')
    setCurrentPageTitle('Draw Dashboard')
  }, [setLastDashboard, setCurrentPageTitle])

  const loadData = useCallback(async () => {
    try {
      // Load draws pending review
      const { data: reviewDraws } = await supabase
        .from('draw_requests')
        .select('*, projects(*, builder:builders(*))')
        .eq('status', 'review')
        .order('created_at', { ascending: false })

      setPendingReview(
        (reviewDraws || []).map(d => ({
          ...d,
          project: (d as any).projects
        }))
      )

      // Load staged draws grouped by builder
      const { data: stagedDraws } = await supabase
        .from('draw_requests')
        .select('*, projects(*, builder:builders(*))')
        .eq('status', 'staged')
        .order('created_at', { ascending: false })

      // Group by builder
      const builderMap = new Map<string, BuilderWithDraws>()
      for (const draw of (stagedDraws || [])) {
        const project = (draw as any).projects
        const builder = project?.builder
        if (!builder) continue

        if (!builderMap.has(builder.id)) {
          builderMap.set(builder.id, {
            ...builder,
            stagedDraws: [],
            totalAmount: 0
          })
        }

        const builderEntry = builderMap.get(builder.id)!
        builderEntry.stagedDraws.push({ ...draw, project })
        builderEntry.totalAmount += draw.total_amount
      }

      setStagedByBuilder(Array.from(builderMap.values()))

      // Load pending wire batches
      const { data: wireBatches } = await supabase
        .from('wire_batches')
        .select('*, builder:builders(*)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })

      // Get draws for each batch
      const batchesWithDraws: WireBatchWithDetails[] = []
      for (const batch of (wireBatches || [])) {
        const { data: draws } = await supabase
          .from('draw_requests')
          .select('*, projects(*)')
          .eq('wire_batch_id', batch.id)

        batchesWithDraws.push({
          ...batch,
          builder: (batch as any).builder,
          draws: (draws || []).map(d => ({
            ...d,
            project: (d as any).projects
          }))
        })
      }

      setPendingWireBatches(batchesWithDraws)

      // Auto-open highlighted batch
      if (highlightedBatchId) {
        const batch = batchesWithDraws.find(b => b.id === highlightedBatchId)
        if (batch) {
          setSelectedBatch(batch)
        }
      }

    } catch (error) {
      console.error('Error loading staging data:', error)
    } finally {
      setLoading(false)
    }
  }, [highlightedBatchId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate status counts for DrawStatusSelector
  const statusCounts = useMemo(() => {
    const reviewCount = pendingReview.length
    const stagedCount = stagedByBuilder.reduce((sum, b) => sum + b.stagedDraws.length, 0)
    const wireCount = pendingWireBatches.length
    return {
      all: reviewCount + stagedCount + wireCount,
      review: reviewCount,
      staged: stagedCount,
      pending_wire: wireCount
    }
  }, [pendingReview, stagedByBuilder, pendingWireBatches])

  // Build builder filter options with cross-filtering
  const builderFilters = useMemo(() => {
    const builderCounts = new Map<string, { name: string; count: number }>()
    
    // Count draws per builder based on selected status
    const drawsToCount = selectedStatus === 'all' 
      ? [...pendingReview, ...stagedByBuilder.flatMap(b => b.stagedDraws)]
      : selectedStatus === 'review'
        ? pendingReview
        : selectedStatus === 'staged'
          ? stagedByBuilder.flatMap(b => b.stagedDraws)
          : pendingWireBatches.flatMap(b => b.draws || [])
    
    drawsToCount.forEach(draw => {
      const builder = draw.project?.builder
      if (builder) {
        const existing = builderCounts.get(builder.id)
        if (existing) {
          existing.count++
        } else {
          builderCounts.set(builder.id, { name: builder.company_name, count: 1 })
        }
      }
    })

    // Add wire batch builders
    if (selectedStatus === 'all' || selectedStatus === 'pending_wire') {
      pendingWireBatches.forEach(batch => {
        if (batch.builder) {
          const existing = builderCounts.get(batch.builder.id)
          if (existing) {
            // Already counted from draws
          } else {
            builderCounts.set(batch.builder.id, { 
              name: batch.builder.company_name, 
              count: batch.draws?.length || 1 
            })
          }
        }
      })
    }

    // Get all builders for disabled state
    const allBuilders = new Set<string>()
    pendingReview.forEach(d => d.project?.builder && allBuilders.add(d.project.builder.id))
    stagedByBuilder.forEach(b => allBuilders.add(b.id))
    pendingWireBatches.forEach(b => b.builder && allBuilders.add(b.builder.id))

    return Array.from(allBuilders).map(id => {
      const counted = builderCounts.get(id)
      const builder = pendingReview.find(d => d.project?.builder?.id === id)?.project?.builder
        || stagedByBuilder.find(b => b.id === id)
        || pendingWireBatches.find(b => b.builder?.id === id)?.builder
      
      return {
        id,
        label: counted?.name || builder?.company_name || 'Unknown',
        count: counted?.count || 0,
        disabled: !counted || counted.count === 0
      }
    })
  }, [pendingReview, stagedByBuilder, pendingWireBatches, selectedStatus])

  // Filter data based on selections
  const filteredPendingReview = useMemo(() => {
    if (selectedStatus !== 'all' && selectedStatus !== 'review') return []
    
    return pendingReview.filter(draw => {
      if (selectedBuilders.length > 0) {
        if (!draw.project?.builder || !selectedBuilders.includes(draw.project.builder.id)) {
          return false
        }
      }
      return true
    })
  }, [pendingReview, selectedStatus, selectedBuilders])

  const filteredStagedByBuilder = useMemo(() => {
    if (selectedStatus !== 'all' && selectedStatus !== 'staged') return []
    
    return stagedByBuilder
      .filter(builder => {
        if (selectedBuilders.length > 0 && !selectedBuilders.includes(builder.id)) {
          return false
        }
        return true
      })
      .map(builder => ({
        ...builder,
        stagedDraws: builder.stagedDraws,
        totalAmount: builder.stagedDraws.reduce((sum, d) => sum + d.total_amount, 0)
      }))
  }, [stagedByBuilder, selectedStatus, selectedBuilders])

  const filteredPendingWireBatches = useMemo(() => {
    if (selectedStatus !== 'all' && selectedStatus !== 'pending_wire') return []
    
    return pendingWireBatches.filter(batch => {
      if (selectedBuilders.length > 0) {
        if (!batch.builder || !selectedBuilders.includes(batch.builder.id)) {
          return false
        }
      }
      return true
    })
  }, [pendingWireBatches, selectedStatus, selectedBuilders])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const pendingReviewAmount = filteredPendingReview.reduce((sum, d) => sum + d.total_amount, 0)
    const stagedAmount = filteredStagedByBuilder.reduce((sum, b) => sum + b.totalAmount, 0)
    const pendingWireAmount = filteredPendingWireBatches.reduce((sum, b) => sum + b.total_amount, 0)
    
    return {
      pendingReview: filteredPendingReview.length,
      stagedDraws: filteredStagedByBuilder.reduce((sum, b) => sum + b.stagedDraws.length, 0),
      pendingWires: filteredPendingWireBatches.length,
      totalPendingAmount: pendingReviewAmount + stagedAmount + pendingWireAmount,
      stagedAmount,
      pendingWireAmount,
      pendingReviewAmount,
    }
  }, [filteredPendingReview, filteredStagedByBuilder, filteredPendingWireBatches])

  const handleBuilderFilterChange = (builderId: string) => {
    setSelectedBuilders(prev => 
      prev.includes(builderId) 
        ? prev.filter(id => id !== builderId)
        : [...prev, builderId]
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }

  const handleMarkAsFunded = async () => {
    if (!selectedBatch) return

    setIsFunding(true)
    setFundingError('')

    try {
      const response = await fetch(`/api/wire-batches/${selectedBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fund',
          wire_reference: wireReference || null,
          notes: fundingNotes || null,
          funded_by: 'bookkeeper'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark as funded')
      }

      setSelectedBatch(null)
      setWireReference('')
      setFundingNotes('')
      await loadData()

    } catch (err: any) {
      setFundingError(err.message || 'Failed to mark as funded')
    } finally {
      setIsFunding(false)
    }
  }

  const handleCancelBatch = async (batchId: string) => {
    if (!confirm('Cancel this wire batch? Draws will return to staged status.')) return

    try {
      const response = await fetch(`/api/wire-batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })

      if (!response.ok) throw new Error('Failed to cancel batch')

      setSelectedBatch(null)
      await loadData()

    } catch (err) {
      console.error('Error cancelling batch:', err)
    }
  }

  const maskAccountNumber = (num: string | null): string => {
    if (!num) return '****'
    return '****' + num.slice(-4)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Dashboard Header */}
          <DashboardHeader
            title="Draw Dashboard"
            subtitle="Manage draw requests and wire funding"
            toggleElement={
              <DrawStatusSelector
                value={selectedStatus}
                onChange={setSelectedStatus}
                counts={statusCounts}
              />
            }
            actions={
              <>
                <a href="/builders/new" className="btn-secondary">+ Builder</a>
                <a href="/projects/new" className="btn-secondary">+ Project</a>
                <a href="/draws/new" className="btn-primary">+ Draw Request</a>
              </>
            }
          />

          {/* Stats Bar with Nav Button on Left */}
          <DrawStatsBar
            pendingReviewCount={summaryStats.pendingReview}
            pendingReviewAmount={summaryStats.pendingReviewAmount}
            stagedCount={summaryStats.stagedDraws}
            stagedAmount={summaryStats.stagedAmount}
            pendingWireCount={summaryStats.pendingWires}
            pendingWireAmount={summaryStats.pendingWireAmount}
            navButton={{
              href: '/',
              label: 'Portfolio',
              icon: 'home',
              position: 'left'
            }}
          />

          {/* Content Sections */}
          <div className="space-y-6">
            {/* Pending Review Section */}
            {(selectedStatus === 'all' || selectedStatus === 'review') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden"
              >
                <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }}></span>
                    Pending Review
                    {filteredPendingReview.length > 0 && (
                      <span className="text-sm px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {filteredPendingReview.length}
                      </span>
                    )}
                  </h3>
                </div>

                {filteredPendingReview.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No draws pending review
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {filteredPendingReview.map(draw => (
                      <a
                        key={draw.id}
                        href={`/draws/${draw.id}`}
                        className="flex items-center justify-between p-4 hover:opacity-80 transition-opacity"
                        style={{ background: 'transparent' }}
                      >
                        <div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Draw #{draw.draw_number}
                          </span>
                          <span className="mx-2" style={{ color: 'var(--text-muted)' }}>—</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {draw.project?.builder?.company_name || 'No Builder'}
                          </span>
                          <span className="mx-2" style={{ color: 'var(--text-muted)' }}>—</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {draw.project?.project_code || draw.project?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(draw.total_amount)}
                          </span>
                          <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Staged by Builder Section */}
            {(selectedStatus === 'all' || selectedStatus === 'staged') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card overflow-hidden"
              >
                <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></span>
                    Staged by Builder
                  </h3>
                </div>

                {filteredStagedByBuilder.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No draws staged for funding
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {filteredStagedByBuilder.map(builder => (
                      <div key={builder.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <a
                            href={`/builders/${builder.id}`}
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {builder.company_name}
                          </a>
                          <div className="flex items-center gap-3">
                            <span className="font-bold" style={{ color: 'var(--success)' }}>
                              {formatCurrency(builder.totalAmount)}
                            </span>
                            <a
                              href={`/builders/${builder.id}`}
                              className="btn-secondary text-sm"
                            >
                              Fund All →
                            </a>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          {builder.stagedDraws.map(draw => (
                            <div key={draw.id} className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                              <span>{draw.project?.project_code || draw.project?.name} - Draw #{draw.draw_number}</span>
                              <span>{formatCurrency(draw.total_amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Pending Wire Batches Section */}
            {(selectedStatus === 'all' || selectedStatus === 'pending_wire') && filteredPendingWireBatches.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card overflow-hidden"
              >
                <div 
                  className="px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-subtle)', background: 'rgba(245, 158, 11, 0.1)' }}
                >
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending Wire Confirmation
                    <span className="text-sm px-2 py-0.5 rounded" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                      {filteredPendingWireBatches.length}
                    </span>
                  </h3>
                </div>

                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredPendingWireBatches.map(batch => (
                    <button
                      key={batch.id}
                      onClick={() => setSelectedBatch(batch)}
                      className="w-full p-4 text-left hover:opacity-80 transition-opacity"
                      style={{ 
                        background: batch.id === highlightedBatchId ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {batch.builder?.company_name}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {batch.draws?.length || 0} draw{(batch.draws?.length || 0) !== 1 ? 's' : ''} • {formatTimeAgo(batch.submitted_at || batch.created_at || '')}
                          </p>
                        </div>
                        <span className="font-bold" style={{ color: 'var(--warning)' }}>
                          {formatCurrency(batch.total_amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Filter Panel */}
      <DrawFilterSidebar
        builderFilters={builderFilters}
        selectedBuilders={selectedBuilders}
        onBuilderFilterChange={handleBuilderFilterChange}
        onClearBuilders={() => setSelectedBuilders([])}
      />

      {/* Bookkeeper Confirmation Modal */}
      <AnimatePresence>
        {selectedBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedBatch(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                      Wire Batch Confirmation
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Batch #{selectedBatch.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="p-2 rounded-lg hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Wire Details */}
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {selectedBatch.builder?.company_name}
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-muted)' }}>Bank</dt>
                      <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedBatch.builder?.bank_name || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-muted)' }}>Routing</dt>
                      <dd className="font-mono" style={{ color: 'var(--text-primary)' }}>
                        {selectedBatch.builder?.bank_routing_number || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--text-muted)' }}>Account</dt>
                      <dd className="font-mono" style={{ color: 'var(--text-primary)' }}>
                        {maskAccountNumber(selectedBatch.builder?.bank_account_number)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Draws */}
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Draws Included ({selectedBatch.draws?.length || 0})
                  </h4>
                  <div className="space-y-1 text-sm">
                    {selectedBatch.draws?.map(draw => (
                      <div key={draw.id} className="flex justify-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {draw.project?.project_code || draw.project?.name} - Draw #{draw.draw_number}
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(draw.total_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total Amount</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(selectedBatch.total_amount)}
                  </span>
                </div>

                {/* Wire Reference Input */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Wire Reference # (optional)
                  </label>
                  <input
                    type="text"
                    value={wireReference}
                    onChange={(e) => setWireReference(e.target.value)}
                    placeholder="Bank confirmation number"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={fundingNotes}
                    onChange={(e) => setFundingNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    className="input w-full"
                    rows={2}
                  />
                </div>

                {fundingError && (
                  <p className="text-sm p-2 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                    {fundingError}
                  </p>
                )}
              </div>

              <div className="p-4 border-t flex justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex gap-2">
                  <a
                    href={`/api/wire-batches/${selectedBatch.id}/report`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    View Report
                  </a>
                  <button
                    onClick={() => handleCancelBatch(selectedBatch.id)}
                    className="btn-secondary text-sm"
                    style={{ color: 'var(--error)' }}
                  >
                    Cancel Batch
                  </button>
                </div>
                <button
                  onClick={handleMarkAsFunded}
                  disabled={isFunding}
                  className="btn-primary"
                >
                  {isFunding ? 'Processing...' : 'Mark as Funded ✓'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function StagingDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    }>
      <StagingDashboardContent />
    </Suspense>
  )
}
