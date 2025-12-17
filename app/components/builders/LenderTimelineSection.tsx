'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, DrawRequest, Lender } from '@/types/database'
import { TimelineProjectRow } from './TimelineProjectRow'
import { GanttDrawBar } from './GanttDrawBar'
import type { ProjectWithDraws, DrawWithProject } from './BuilderTimeline'

type LenderTimelineSectionProps = {
  lender: Lender | null
  projects: ProjectWithDraws[]
  allFundDates: string[]
  stagedDrawsByProject: Map<string, DrawWithProject[]>
  onDrawClick: (draw: DrawRequest, project: Project) => void
  animationDelay?: number
}

/**
 * LenderTimelineSection - Timeline section for a single lender
 * 
 * Features:
 * - Collapsible header
 * - Fixed left column with project names and staged draws
 * - Scrollable right section with Gantt bars
 * - Crosshair highlighting on hover
 */
export function LenderTimelineSection({
  lender,
  projects,
  allFundDates,
  stagedDrawsByProject,
  onDrawClick,
  animationDelay = 0
}: LenderTimelineSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Calculate column width based on content
  const columnWidth = 100 // pixels per date column
  const fixedColumnWidth = 280 // pixels for project column + staged

  // Format date for column header
  const formatColumnDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate totals for this lender section
  const sectionTotals = useMemo(() => {
    let totalDrawn = 0
    let totalBudget = 0
    
    projects.forEach(project => {
      totalBudget += project.loan_amount || 0
      totalDrawn += project.total_spent || 0
    })

    return { totalDrawn, totalBudget }
  }, [projects])

  // Get draws for a specific date and project
  const getDrawsForDateAndProject = useCallback((projectId: string, dateStr: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return []
    
    return project.draws.filter(draw => {
      if (draw.status !== 'funded' || !draw.funded_at) return false
      const fundDate = new Date(draw.funded_at).toISOString().split('T')[0]
      return fundDate === dateStr
    })
  }, [projects])

  // Get previous draw date for a project (for Gantt bar start)
  const getPreviousDrawDate = useCallback((project: ProjectWithDraws, currentDateStr: string) => {
    const fundedDraws = project.draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    const currentDate = new Date(currentDateStr)
    let prevDate = project.loan_start_date ? new Date(project.loan_start_date) : null
    
    for (const draw of fundedDraws) {
      const drawDate = new Date(draw.funded_at!)
      if (drawDate.toISOString().split('T')[0] === currentDateStr) {
        return prevDate
      }
      prevDate = drawDate
    }
    
    return prevDate
  }, [])

  const handleMouseEnterCell = useCallback((projectId: string, dateStr: string) => {
    setHoveredRow(projectId)
    setHoveredColumn(dateStr)
  }, [])

  const handleMouseLeaveCell = useCallback(() => {
    setHoveredRow(null)
    setHoveredColumn(null)
  }, [])

  return (
    <motion.div
      className="card-ios overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.3 }}
    >
      {/* Lender Header - Collapsible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between border-b transition-colors"
        style={{ 
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div className="flex items-center gap-3">
          <motion.svg
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {lender?.name || 'No Lender Assigned'}
          </h4>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            {projects.length} loan{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span style={{ color: 'var(--text-muted)' }}>
            Drawn: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {formatCurrency(sectionTotals.totalDrawn)}
            </span>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            of {formatCurrency(sectionTotals.totalBudget)}
          </span>
        </div>
      </button>

      {/* Timeline Grid */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex">
              {/* Fixed Left Column */}
              <div 
                className="flex-shrink-0 border-r"
                style={{ 
                  width: fixedColumnWidth,
                  borderColor: 'var(--border-subtle)'
                }}
              >
                {/* Header Row */}
                <div 
                  className="h-10 px-4 flex items-center border-b text-xs font-medium"
                  style={{ 
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div className="flex-1">Project</div>
                  <div className="w-16 text-center">Staged</div>
                </div>

                {/* Project Rows */}
                {projects.map((project, index) => (
                  <TimelineProjectRow
                    key={project.id}
                    project={project}
                    stagedDraws={stagedDrawsByProject.get(project.id) || []}
                    isHovered={hoveredRow === project.id}
                    animationDelay={animationDelay + (index * 0.05)}
                  />
                ))}

                {/* Totals Row */}
                <div 
                  className="h-12 px-4 flex items-center justify-between border-t font-semibold text-sm"
                  style={{ 
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span>TOTALS</span>
                  <span style={{ color: 'var(--accent)' }}>
                    {formatCurrency(sectionTotals.totalDrawn)}
                  </span>
                </div>
              </div>

              {/* Scrollable Timeline Area */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div style={{ minWidth: allFundDates.length * columnWidth }}>
                  {/* Date Headers */}
                  <div 
                    className="h-10 flex border-b"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
                  >
                    {allFundDates.map(dateStr => (
                      <div
                        key={dateStr}
                        className="flex items-center justify-center text-xs font-medium transition-colors"
                        style={{ 
                          width: columnWidth,
                          color: hoveredColumn === dateStr ? 'var(--accent)' : 'var(--text-muted)',
                          background: hoveredColumn === dateStr ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent'
                        }}
                      >
                        {formatColumnDate(dateStr)}
                      </div>
                    ))}
                    {/* Totals column */}
                    <div
                      className="flex items-center justify-center text-xs font-medium px-4"
                      style={{ 
                        minWidth: 100,
                        color: 'var(--text-muted)',
                        borderLeft: '1px solid var(--border-subtle)'
                      }}
                    >
                      Total
                    </div>
                  </div>

                  {/* Gantt Rows */}
                  {projects.map((project, index) => (
                    <div 
                      key={project.id}
                      className="h-14 flex items-center relative transition-colors"
                      style={{ 
                        background: hoveredRow === project.id ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
                    >
                      {/* Gantt bars for each date */}
                      {allFundDates.map(dateStr => {
                        const draws = getDrawsForDateAndProject(project.id, dateStr)
                        const prevDate = draws.length > 0 ? getPreviousDrawDate(project, dateStr) : null
                        
                        return (
                          <div
                            key={dateStr}
                            className="relative flex items-center justify-center"
                            style={{ 
                              width: columnWidth,
                              background: hoveredColumn === dateStr ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent'
                            }}
                            onMouseEnter={() => handleMouseEnterCell(project.id, dateStr)}
                            onMouseLeave={handleMouseLeaveCell}
                          >
                            {draws.map(draw => (
                              <GanttDrawBar
                                key={draw.id}
                                draw={draw}
                                project={project}
                                previousDate={prevDate}
                                currentDate={new Date(dateStr)}
                                columnWidth={columnWidth}
                                onClick={() => onDrawClick(draw, project)}
                                isHighlighted={hoveredRow === project.id || hoveredColumn === dateStr}
                              />
                            ))}
                          </div>
                        )
                      })}

                      {/* Row Total */}
                      <div
                        className="flex items-center justify-center px-4 font-medium text-sm"
                        style={{ 
                          minWidth: 100,
                          color: 'var(--text-primary)',
                          borderLeft: '1px solid var(--border-subtle)'
                        }}
                      >
                        {formatCurrency(project.total_spent || 0)}
                      </div>
                    </div>
                  ))}

                  {/* Totals Row */}
                  <div 
                    className="h-12 flex items-center border-t"
                    style={{ 
                      borderColor: 'var(--border-subtle)',
                      background: 'var(--bg-secondary)'
                    }}
                  >
                    {allFundDates.map(dateStr => {
                      // Sum all draws for this date
                      const dateTotal = projects.reduce((sum, project) => {
                        const draws = getDrawsForDateAndProject(project.id, dateStr)
                        return sum + draws.reduce((s, d) => s + d.total_amount, 0)
                      }, 0)
                      
                      return (
                        <div
                          key={dateStr}
                          className="flex items-center justify-center text-xs font-semibold"
                          style={{ 
                            width: columnWidth,
                            color: dateTotal > 0 ? 'var(--accent)' : 'var(--text-muted)'
                          }}
                        >
                          {dateTotal > 0 ? formatCurrency(dateTotal) : '—'}
                        </div>
                      )
                    })}
                    {/* Grand Total */}
                    <div
                      className="flex items-center justify-center px-4 font-bold text-sm"
                      style={{ 
                        minWidth: 100,
                        color: 'var(--accent)',
                        borderLeft: '1px solid var(--border-subtle)'
                      }}
                    >
                      {formatCurrency(sectionTotals.totalDrawn)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

