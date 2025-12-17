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

// Generate month columns from date range
function generateMonthColumns(allFundDates: string[]): { key: string; label: string; startDate: Date; endDate: Date }[] {
  if (allFundDates.length === 0) return []
  
  const minDate = new Date(allFundDates[0])
  const maxDate = new Date(allFundDates[allFundDates.length - 1])
  
  // Extend range to include full months
  const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
  
  const months: { key: string; label: string; startDate: Date; endDate: Date }[] = []
  const current = new Date(startMonth)
  
  while (current <= endMonth) {
    const year = current.getFullYear()
    const month = current.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0) // Last day of month
    
    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: current.toLocaleDateString('en-US', { month: 'short', day: undefined }),
      startDate,
      endDate
    })
    
    current.setMonth(current.getMonth() + 1)
  }
  
  return months
}

// Calculate bar position within a month (0-100%)
function getPositionInMonth(date: Date, monthStart: Date, monthEnd: Date): number {
  const monthDays = monthEnd.getDate()
  const dayOfMonth = Math.min(date.getDate(), monthDays)
  return (dayOfMonth / monthDays) * 100
}

/**
 * LenderTimelineSection - Timeline section for a single lender
 * 
 * Features:
 * - Collapsible header
 * - Fixed left column with project names and staged draws
 * - Scrollable right section with month-based Gantt bars
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    // Auto-expand projects with draws or staged draws
    const expanded = new Set<string>()
    projects.forEach(project => {
      const hasFundedDraws = project.draws.some(d => d.status === 'funded')
      const hasStagedDraws = (stagedDrawsByProject.get(project.id) || []).length > 0
      if (hasFundedDraws || hasStagedDraws) {
        expanded.add(project.id)
      }
    })
    return expanded
  })
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Calculate column dimensions
  const monthColumnWidth = 100 // pixels per month column
  const fixedColumnWidth = 200 // pixels for project column + staged
  const rowHeight = 36 // Compact row height

  // Generate month columns
  const monthColumns = useMemo(() => generateMonthColumns(allFundDates), [allFundDates])

  // Calculate totals for this lender section
  const sectionTotals = useMemo(() => {
    let totalDrawn = 0
    let totalBudget = 0
    let totalStaged = 0
    
    projects.forEach(project => {
      totalBudget += project.loan_amount || 0
      totalDrawn += project.total_spent || 0
      const staged = stagedDrawsByProject.get(project.id) || []
      staged.forEach(d => totalStaged += d.total_amount || 0)
    })

    return { totalDrawn, totalBudget, totalStaged }
  }, [projects, stagedDrawsByProject])

  // Get draws grouped by month for a project
  const getDrawsByMonth = useCallback((project: ProjectWithDraws) => {
    const byMonth = new Map<string, { draw: DrawRequest; positionPercent: number; prevDate: Date | null }[]>()
    
    const fundedDraws = project.draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    let prevDate: Date | null = project.loan_start_date ? new Date(project.loan_start_date) : null
    
    fundedDraws.forEach(draw => {
      const fundDate = new Date(draw.funded_at!)
      const monthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
      const monthCol = monthColumns.find(m => m.key === monthKey)
      
      if (monthCol) {
        const positionPercent = getPositionInMonth(fundDate, monthCol.startDate, monthCol.endDate)
        
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, [])
        }
        byMonth.get(monthKey)!.push({ draw, positionPercent, prevDate })
      }
      
      prevDate = fundDate
    })
    
    return byMonth
  }, [monthColumns])

  const toggleProjectExpanded = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  const handleMouseEnterCell = useCallback((projectId: string, monthKey: string) => {
    setHoveredRow(projectId)
    setHoveredMonth(monthKey)
  }, [])

  const handleMouseLeaveCell = useCallback(() => {
    setHoveredRow(null)
    setHoveredMonth(null)
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
        className="w-full px-3 py-2 flex items-center justify-between border-b transition-colors"
        style={{ 
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div className="flex items-center gap-2">
          <motion.svg
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-3.5 h-3.5"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {lender?.name || 'No Lender Assigned'}
          </h4>
          <span 
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            {projects.length} loan{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
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
                  className="px-3 flex items-center border-b text-xs font-medium"
                  style={{ 
                    height: 28,
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div className="flex-1">Project</div>
                  <div className="w-14 text-center">Staged</div>
                </div>

                {/* Project Rows */}
                {projects.map((project, index) => {
                  const isExpanded = expandedProjects.has(project.id)
                  const hasFundedDraws = project.draws.some(d => d.status === 'funded')
                  const staged = stagedDrawsByProject.get(project.id) || []
                  
                  return (
                    <TimelineProjectRow
                      key={project.id}
                      project={project}
                      stagedDraws={staged}
                      isHovered={hoveredRow === project.id}
                      isExpanded={isExpanded}
                      hasDraws={hasFundedDraws || staged.length > 0}
                      onToggleExpand={() => toggleProjectExpanded(project.id)}
                      animationDelay={animationDelay + (index * 0.02)}
                      rowHeight={rowHeight}
                    />
                  )
                })}

                {/* Totals Row */}
                <div 
                  className="px-3 flex items-center justify-between border-t font-semibold text-xs"
                  style={{ 
                    height: rowHeight,
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span>TOTALS</span>
                  {sectionTotals.totalStaged > 0 && (
                    <span style={{ color: 'var(--warning)' }}>
                      {formatCurrency(sectionTotals.totalStaged)}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Timeline Area */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div style={{ minWidth: monthColumns.length * monthColumnWidth + 80 }}>
                  {/* Month Headers */}
                  <div 
                    className="flex border-b"
                    style={{ height: 28, borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
                  >
                    {monthColumns.map(month => (
                      <div
                        key={month.key}
                        className="flex items-center justify-center text-xs font-medium transition-colors"
                        style={{ 
                          width: monthColumnWidth,
                          color: hoveredMonth === month.key ? 'var(--accent)' : 'var(--text-muted)',
                          background: hoveredMonth === month.key ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent'
                        }}
                      >
                        {month.label}
                      </div>
                    ))}
                    {/* Totals column */}
                    <div
                      className="flex items-center justify-center text-xs font-medium px-2"
                      style={{ 
                        minWidth: 80,
                        color: 'var(--text-muted)',
                        borderLeft: '1px solid var(--border-subtle)'
                      }}
                    >
                      Total
                    </div>
                  </div>

                  {/* Gantt Rows */}
                  {projects.map((project) => {
                    const isExpanded = expandedProjects.has(project.id)
                    const drawsByMonth = getDrawsByMonth(project)
                    
                    return (
                      <div 
                        key={project.id}
                        className="flex items-center relative transition-colors"
                        style={{ 
                          height: rowHeight,
                          background: hoveredRow === project.id ? 'rgba(var(--accent-rgb), 0.03)' : 'transparent',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                      >
                        {/* Gantt bars for each month */}
                        {monthColumns.map(month => {
                          const drawsInMonth = drawsByMonth.get(month.key) || []
                          
                          return (
                            <div
                              key={month.key}
                              className="relative flex items-center"
                              style={{ 
                                width: monthColumnWidth,
                                height: '100%',
                                background: hoveredMonth === month.key ? 'rgba(var(--accent-rgb), 0.03)' : 'transparent'
                              }}
                              onMouseEnter={() => handleMouseEnterCell(project.id, month.key)}
                              onMouseLeave={handleMouseLeaveCell}
                            >
                              {isExpanded && drawsInMonth.map(({ draw, positionPercent, prevDate }) => (
                                <GanttDrawBar
                                  key={draw.id}
                                  draw={draw}
                                  project={project}
                                  previousDate={prevDate}
                                  currentDate={new Date(draw.funded_at!)}
                                  positionPercent={positionPercent}
                                  columnWidth={monthColumnWidth}
                                  onClick={() => onDrawClick(draw, project)}
                                  isHighlighted={hoveredRow === project.id || hoveredMonth === month.key}
                                />
                              ))}
                            </div>
                          )
                        })}

                        {/* Row Total */}
                        <div
                          className="flex items-center justify-center px-2 font-medium text-xs"
                          style={{ 
                            minWidth: 80,
                            color: 'var(--text-primary)',
                            borderLeft: '1px solid var(--border-subtle)'
                          }}
                        >
                          {formatCurrency(project.total_spent || 0)}
                        </div>
                      </div>
                    )
                  })}

                  {/* Totals Row */}
                  <div 
                    className="flex items-center border-t"
                    style={{ 
                      height: rowHeight,
                      borderColor: 'var(--border-subtle)',
                      background: 'var(--bg-secondary)'
                    }}
                  >
                    {monthColumns.map(month => {
                      // Sum all draws for this month
                      const monthTotal = projects.reduce((sum, project) => {
                        const drawsInMonth = project.draws.filter(d => {
                          if (d.status !== 'funded' || !d.funded_at) return false
                          const fundDate = new Date(d.funded_at)
                          const monthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
                          return monthKey === month.key
                        })
                        return sum + drawsInMonth.reduce((s, d) => s + d.total_amount, 0)
                      }, 0)
                      
                      return (
                        <div
                          key={month.key}
                          className="flex items-center justify-center text-xs font-semibold"
                          style={{ 
                            width: monthColumnWidth,
                            color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)'
                          }}
                        >
                          {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
                        </div>
                      )
                    })}
                    {/* Grand Total */}
                    <div
                      className="flex items-center justify-center px-2 font-bold text-xs"
                      style={{ 
                        minWidth: 80,
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
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
