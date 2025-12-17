'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { DrawRequest, Project } from '@/types/database'

type TimelineDetailPanelProps = {
  draw: DrawRequest | null
  project: Project | null
  onClose: () => void
  onRefresh?: () => void
}

/**
 * TimelineDetailPanel - Slide-out panel for draw details
 * 
 * Features:
 * - Slides in from right side
 * - Shows full draw details
 * - Action buttons based on draw status
 * - Keyboard navigation (Escape to close)
 */
export function TimelineDetailPanel({
  draw,
  project,
  onClose,
  onRefresh
}: TimelineDetailPanelProps) {
  const router = useRouter()

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draw) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [draw, onClose])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (draw) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [draw])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleViewFullDraw = useCallback(() => {
    if (draw) {
      router.push(`/draws/${draw.id}`)
    }
  }, [draw, router])

  const handleViewProject = useCallback(() => {
    if (project) {
      router.push(`/projects/${project.id}`)
    }
  }, [project, router])

  // Get status styling
  const getStatusStyle = (status: string | null) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      funded: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', label: 'Funded' },
      approved: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', label: 'Approved' },
      staged: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', label: 'Staged' },
      pending_wire: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', label: 'Pending Wire' },
      review: { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', label: 'In Review' },
      draft: { bg: 'var(--bg-hover)', color: 'var(--text-muted)', label: 'Draft' },
      rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', label: 'Rejected' },
    }
    return styles[status || 'draft'] || styles.draft
  }

  const statusStyle = draw ? getStatusStyle(draw.status) : getStatusStyle(null)

  return (
    <AnimatePresence>
      {draw && project && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 h-full z-50 w-full max-w-md"
            style={{ 
              background: 'var(--bg-primary)',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)'
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div 
              className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between"
              style={{ 
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-secondary)'
              }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Draw #{draw.draw_number}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {project.project_code || project.name}
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close panel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: statusStyle.bg, color: statusStyle.color }}
                >
                  {statusStyle.label}
                </span>
                {draw.funded_at && (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(draw.funded_at)}
                  </span>
                )}
              </div>

              {/* Amount Card */}
              <div 
                className="p-4 rounded-lg"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                  Total Amount
                </div>
                <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                  {formatCurrency(draw.total_amount)}
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Details
                </h3>
                
                <div 
                  className="rounded-lg divide-y"
                  style={{ 
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <DetailRow label="Project" value={project.project_code || project.name || '—'} />
                  <DetailRow label="Draw Number" value={`#${draw.draw_number}`} />
                  <DetailRow label="Request Date" value={formatDate(draw.request_date)} />
                  {draw.funded_at && (
                    <DetailRow label="Funded Date" value={formatDate(draw.funded_at)} />
                  )}
                  {project.subdivision_name && (
                    <DetailRow label="Subdivision" value={project.subdivision_name} />
                  )}
                  {project.loan_amount && (
                    <DetailRow 
                      label="Loan Amount" 
                      value={formatCurrency(project.loan_amount)} 
                    />
                  )}
                </div>
              </div>

              {/* Notes */}
              {draw.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Notes
                  </h3>
                  <div 
                    className="p-3 rounded-lg text-sm"
                    style={{ 
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {draw.notes}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Quick Links
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleViewProject}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    View Project
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div 
              className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t flex justify-between"
              style={{ 
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-secondary)'
              }}
            >
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={handleViewFullDraw}
                className="btn-primary flex items-center gap-2"
              >
                View Full Draw
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Helper component for detail rows
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex justify-between items-center">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

