'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Builder, Project, DrawRequest, Lender } from '@/types/database'
import { LenderTimelineSection } from './LenderTimelineSection'
import { TimelineSpreadsheetView } from './TimelineSpreadsheetView'
import { TimelineDetailPanel } from './TimelineDetailPanel'

export type TimelineViewMode = 'spreadsheet' | 'gantt'

export type ProjectWithDraws = Project & {
  draws: DrawRequest[]
  lender?: Lender | null
  total_budget: number
  total_spent: number
}

export type DrawWithProject = DrawRequest & {
  project?: Project | null
}

type BuilderTimelineProps = {
  builder: Builder
  projects: ProjectWithDraws[]
  stagedDraws: DrawWithProject[]
  onRefresh: () => void
}

/**
 * BuilderTimeline - Interactive timeline showing all draws grouped by lender
 * 
 * Features:
 * - Toggle between spreadsheet (legacy) and Gantt (visual) views
 * - Groups projects by lender
 * - Fixed left column with projects and staged draws
 * - Scrollable timeline area with draw history
 * - Compact, collapsible layout
 */
export function BuilderTimeline({ 
  builder, 
  projects, 
  stagedDraws,
  onRefresh 
}: BuilderTimelineProps) {
  const [viewMode, setViewMode] = useState<TimelineViewMode>('gantt')
  const [selectedDraw, setSelectedDraw] = useState<DrawRequest | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [focusedDrawIndex, setFocusedDrawIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Flatten all draws for keyboard navigation
  const allDrawsFlat = useMemo(() => {
    const draws: { draw: DrawRequest; project: ProjectWithDraws }[] = []
    projects.forEach(project => {
      project.draws
        .filter(d => d.status === 'funded')
        .sort((a, b) => new Date(a.funded_at || 0).getTime() - new Date(b.funded_at || 0).getTime())
        .forEach(draw => {
          draws.push({ draw, project })
        })
    })
    return draws
  }, [projects])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (selectedDraw && e.key === 'Escape') {
        setSelectedDraw(null)
        setSelectedProject(null)
        return
      }

      if (allDrawsFlat.length === 0) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          setFocusedDrawIndex(prev => {
            const next = prev + 1
            return next >= allDrawsFlat.length ? 0 : next
          })
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          setFocusedDrawIndex(prev => {
            const next = prev - 1
            return next < 0 ? allDrawsFlat.length - 1 : next
          })
          break
        case 'Enter':
          e.preventDefault()
          if (focusedDrawIndex >= 0 && focusedDrawIndex < allDrawsFlat.length) {
            const { draw, project } = allDrawsFlat[focusedDrawIndex]
            setSelectedDraw(draw)
            setSelectedProject(project)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [allDrawsFlat, focusedDrawIndex, selectedDraw])

  // Group projects by lender
  const projectsByLender = useMemo(() => {
    const grouped = new Map<string, { lender: Lender | null; projects: ProjectWithDraws[] }>()
    
    projects.forEach(project => {
      const lenderId = project.lender_id || 'no-lender'
      
      if (!grouped.has(lenderId)) {
        grouped.set(lenderId, {
          lender: project.lender || null,
          projects: []
        })
      }
      
      grouped.get(lenderId)!.projects.push(project)
    })

    // Sort projects within each lender group by project code
    grouped.forEach(group => {
      group.projects.sort((a, b) => {
        const codeA = a.project_code || a.name || ''
        const codeB = b.project_code || b.name || ''
        return codeA.localeCompare(codeB)
      })
    })

    return Array.from(grouped.entries()).map(([id, data]) => ({
      lenderId: id,
      ...data
    }))
  }, [projects])

  // Get all unique fund dates across all draws for the timeline columns
  const allFundDates = useMemo(() => {
    const dates = new Set<string>()
    
    projects.forEach(project => {
      project.draws
        .filter(draw => draw.status === 'funded' && draw.funded_at)
        .forEach(draw => {
          const dateStr = new Date(draw.funded_at!).toISOString().split('T')[0]
          dates.add(dateStr)
        })
    })

    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [projects])

  // Map staged draws to their projects
  const stagedDrawsByProject = useMemo(() => {
    const map = new Map<string, DrawWithProject[]>()
    
    stagedDraws.forEach(draw => {
      if (draw.project_id) {
        if (!map.has(draw.project_id)) {
          map.set(draw.project_id, [])
        }
        map.get(draw.project_id)!.push(draw)
      }
    })

    return map
  }, [stagedDraws])

  // Handle draw selection for detail panel
  const handleDrawClick = useCallback((draw: DrawRequest, project: Project) => {
    setSelectedDraw(draw)
    setSelectedProject(project)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedDraw(null)
    setSelectedProject(null)
  }, [])

  // Calculate totals
  const totals = useMemo(() => {
    let totalBudget = 0
    let totalDrawn = 0
    let totalStaged = 0

    projects.forEach(project => {
      totalBudget += project.loan_amount || 0
      totalDrawn += project.total_spent || 0
    })

    stagedDraws.forEach(draw => {
      totalStaged += draw.total_amount || 0
    })

    return { totalBudget, totalDrawn, totalStaged }
  }, [projects, stagedDraws])

  const hasData = projects.length > 0

  return (
    <div ref={containerRef} className="space-y-3" tabIndex={0}>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            Builder Timeline
          </h3>
          <span 
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            {projects.length} loan{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div 
          className="inline-flex p-0.5 gap-0.5"
          style={{ 
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <motion.button
            onClick={() => setViewMode('spreadsheet')}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{
              background: viewMode === 'spreadsheet' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'spreadsheet' ? 'white' : 'var(--text-muted)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Spreadsheet</span>
          </motion.button>
          
          <motion.button
            onClick={() => setViewMode('gantt')}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{
              background: viewMode === 'gantt' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'gantt' ? 'white' : 'var(--text-muted)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Gantt</span>
          </motion.button>
        </div>
      </div>

      {/* Timeline Content */}
      {!hasData ? (
        <div className="card-ios text-center py-8">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'var(--bg-hover)' }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            No loans yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Create a loan to see the timeline
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'spreadsheet' ? (
            <motion.div
              key="spreadsheet"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <TimelineSpreadsheetView
                projectsByLender={projectsByLender}
                allFundDates={allFundDates}
                stagedDrawsByProject={stagedDrawsByProject}
                onDrawClick={handleDrawClick}
              />
            </motion.div>
          ) : (
            <motion.div
              key="gantt"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {projectsByLender.map((group, index) => (
                <LenderTimelineSection
                  key={group.lenderId}
                  lender={group.lender}
                  projects={group.projects}
                  allFundDates={allFundDates}
                  stagedDrawsByProject={stagedDrawsByProject}
                  onDrawClick={handleDrawClick}
                  animationDelay={index * 0.05}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Compact Summary Footer */}
      {hasData && (
        <motion.div 
          className="flex items-center justify-between py-2 px-3 rounded-lg text-xs"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Total Budget </span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(totals.totalBudget)}
              </span>
            </div>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Total Drawn </span>
              <span className="font-bold" style={{ color: 'var(--accent)' }}>
                {formatCurrency(totals.totalDrawn)}
              </span>
            </div>
            {totals.totalStaged > 0 && (
              <>
                <div className="w-px h-4" style={{ background: 'var(--border)' }} />
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Staged </span>
                  <span className="font-bold" style={{ color: 'var(--warning)' }}>
                    {formatCurrency(totals.totalStaged)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Keyboard hints */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>←→</span>
              <span>Navigate</span>
              <span className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>Enter</span>
              <span>Open</span>
            </div>

            {/* Export placeholder */}
            <button
              className="flex items-center gap-1 px-2 py-1 rounded opacity-50 cursor-not-allowed"
              disabled
              title="Export coming soon"
              style={{ background: 'var(--bg-hover)' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span style={{ color: 'var(--text-muted)' }}>Export PDF</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Detail Panel */}
      <TimelineDetailPanel
        draw={selectedDraw}
        project={selectedProject}
        onClose={handleClosePanel}
        onRefresh={onRefresh}
      />
    </div>
  )
}

// Helper function
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
