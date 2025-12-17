'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Project, DrawRequest, Lender } from '@/types/database'
import type { ProjectWithDraws, DrawWithProject } from './BuilderTimeline'

type LenderGroup = {
  lenderId: string
  lender: Lender | null
  projects: ProjectWithDraws[]
}

type TimelineSpreadsheetViewProps = {
  projectsByLender: LenderGroup[]
  allFundDates: string[]
  stagedDrawsByProject: Map<string, DrawWithProject[]>
  onDrawClick: (draw: DrawRequest, project: Project) => void
}

// Generate month columns from date range
function generateMonthColumns(allFundDates: string[]): { key: string; label: string }[] {
  if (allFundDates.length === 0) return []
  
  const minDate = new Date(allFundDates[0])
  const maxDate = new Date(allFundDates[allFundDates.length - 1])
  
  const months: { key: string; label: string }[] = []
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
  
  while (current <= end) {
    months.push({
      key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
      label: current.toLocaleDateString('en-US', { month: 'short', day: undefined })
    })
    current.setMonth(current.getMonth() + 1)
  }
  
  return months
}

/**
 * TimelineSpreadsheetView - Compact spreadsheet-style view
 * 
 * Features:
 * - Month-based columns
 * - Grouped by lender sections
 * - Compact rows with minimal padding
 * - Fixed project column on left
 */
export function TimelineSpreadsheetView({
  projectsByLender,
  allFundDates,
  stagedDrawsByProject,
  onDrawClick
}: TimelineSpreadsheetViewProps) {
  const router = useRouter()
  const [collapsedLenders, setCollapsedLenders] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    // Auto-expand projects with draws
    const expanded = new Set<string>()
    projectsByLender.forEach(group => {
      group.projects.forEach(project => {
        const hasFundedDraws = project.draws.some(d => d.status === 'funded')
        const hasStagedDraws = (stagedDrawsByProject.get(project.id) || []).length > 0
        if (hasFundedDraws || hasStagedDraws) {
          expanded.add(project.id)
        }
      })
    })
    return expanded
  })

  const toggleLenderCollapse = useCallback((lenderId: string) => {
    setCollapsedLenders(prev => {
      const next = new Set(prev)
      if (next.has(lenderId)) next.delete(lenderId)
      else next.add(lenderId)
      return next
    })
  }, [])

  const toggleProjectExpand = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }, [])

  const formatShortCurrency = (amount: number) => {
    if (amount === 0) return ''
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${Math.round(amount / 1000)}k`
    return `$${amount}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Generate month columns
  const monthColumns = useMemo(() => generateMonthColumns(allFundDates), [allFundDates])

  // Get draws for a specific month and project
  const getDrawsForMonth = useCallback((project: ProjectWithDraws, monthKey: string) => {
    return project.draws.filter(draw => {
      if (draw.status !== 'funded' || !draw.funded_at) return false
      const fundDate = new Date(draw.funded_at)
      const drawMonthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
      return drawMonthKey === monthKey
    })
  }, [])

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const byMonth = new Map<string, number>()
    let total = 0
    let budget = 0

    monthColumns.forEach(m => byMonth.set(m.key, 0))

    projectsByLender.forEach(group => {
      group.projects.forEach(project => {
        budget += project.loan_amount || 0
        
        project.draws.forEach(draw => {
          if (draw.status === 'funded' && draw.funded_at) {
            const fundDate = new Date(draw.funded_at)
            const monthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
            total += draw.total_amount
            const current = byMonth.get(monthKey) || 0
            byMonth.set(monthKey, current + draw.total_amount)
          }
        })
      })
    })

    return { byMonth, total, budget }
  }, [projectsByLender, monthColumns])

  const rowHeight = 32
  const headerHeight = 28
  const colWidth = 80

  return (
    <div className="card-ios overflow-hidden">
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full border-collapse text-xs" style={{ minWidth: 400 + monthColumns.length * colWidth }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th 
                className="sticky left-0 z-20 px-3 text-left font-semibold border-b border-r"
                style={{ 
                  height: headerHeight,
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  minWidth: 140
                }}
              >
                Project
              </th>
              <th 
                className="sticky left-[140px] z-20 px-2 text-center font-semibold border-b border-r"
                style={{ 
                  height: headerHeight,
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  width: 60
                }}
              >
                Staged
              </th>
              {monthColumns.map(month => (
                <th 
                  key={month.key}
                  className="px-2 text-center font-medium border-b"
                  style={{ 
                    height: headerHeight,
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                    width: colWidth
                  }}
                >
                  {month.label}
                </th>
              ))}
              <th 
                className="px-2 text-center font-semibold border-b border-l"
                style={{ 
                  height: headerHeight,
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  width: colWidth
                }}
              >
                Total
              </th>
              <th 
                className="px-2 text-center font-semibold border-b"
                style={{ 
                  height: headerHeight,
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  width: colWidth
                }}
              >
                Budget
              </th>
            </tr>
          </thead>
          <tbody>
            {projectsByLender.map((group, groupIndex) => {
              const isLenderCollapsed = collapsedLenders.has(group.lenderId)
              
              // Calculate lender totals
              const lenderTotals = {
                byMonth: new Map<string, number>(),
                total: 0,
                budget: 0,
                staged: 0
              }
              
              monthColumns.forEach(m => lenderTotals.byMonth.set(m.key, 0))
              
              group.projects.forEach(project => {
                lenderTotals.budget += project.loan_amount || 0
                const stagedDraws = stagedDrawsByProject.get(project.id) || []
                stagedDraws.forEach(d => lenderTotals.staged += d.total_amount || 0)
                
                project.draws.forEach(draw => {
                  if (draw.status === 'funded' && draw.funded_at) {
                    const fundDate = new Date(draw.funded_at)
                    const monthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
                    lenderTotals.total += draw.total_amount
                    const current = lenderTotals.byMonth.get(monthKey) || 0
                    lenderTotals.byMonth.set(monthKey, current + draw.total_amount)
                  }
                })
              })

              return (
                <motion.tbody
                  key={group.lenderId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: groupIndex * 0.05 }}
                >
                  {/* Lender Header Row */}
                  <tr>
                    <td colSpan={4 + monthColumns.length}>
                      <button
                        onClick={() => toggleLenderCollapse(group.lenderId)}
                        className="w-full px-3 flex items-center gap-2 text-left font-semibold border-b transition-colors hover:opacity-80"
                        style={{ 
                          height: rowHeight,
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <motion.svg
                          animate={{ rotate: isLenderCollapsed ? -90 : 0 }}
                          className="w-3 h-3"
                          style={{ color: 'var(--text-muted)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                        <span>{group.lender?.name || 'No Lender Assigned'}</span>
                        <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                          ({group.projects.length} loan{group.projects.length !== 1 ? 's' : ''})
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* Project Rows */}
                  <AnimatePresence>
                    {!isLenderCollapsed && group.projects.map((project, projectIndex) => {
                      const stagedDraws = stagedDrawsByProject.get(project.id) || []
                      const stagedTotal = stagedDraws.reduce((sum, d) => sum + d.total_amount, 0)
                      const projectTotal = project.total_spent || 0
                      const hasFundedDraws = project.draws.some(d => d.status === 'funded')
                      const isExpanded = expandedProjects.has(project.id)
                      
                      return (
                        <motion.tr
                          key={project.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{ 
                            height: rowHeight,
                            background: projectIndex % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' 
                          }}
                        >
                          {/* Project Name */}
                          <td 
                            className="sticky left-0 z-10 px-3 border-b border-r"
                            style={{ 
                              background: projectIndex % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                              borderColor: 'var(--border-subtle)'
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => hasFundedDraws && toggleProjectExpand(project.id)}
                                className="w-3 h-3 flex items-center justify-center"
                                style={{ 
                                  color: hasFundedDraws ? 'var(--text-muted)' : 'transparent',
                                  cursor: hasFundedDraws ? 'pointer' : 'default'
                                }}
                              >
                                {hasFundedDraws && (
                                  <motion.svg 
                                    animate={{ rotate: isExpanded ? 0 : -90 }}
                                    className="w-2.5 h-2.5" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </motion.svg>
                                )}
                              </button>
                              <button
                                onClick={() => router.push(`/projects/${project.id}`)}
                                className="font-medium hover:underline text-left truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {project.project_code || project.name}
                              </button>
                            </div>
                          </td>

                          {/* Staged */}
                          <td 
                            className="sticky left-[140px] z-10 px-2 text-center border-b border-r"
                            style={{ 
                              background: projectIndex % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                              borderColor: 'var(--border-subtle)',
                              color: stagedTotal > 0 ? 'var(--warning)' : 'var(--text-muted)'
                            }}
                          >
                            {stagedTotal > 0 ? formatShortCurrency(stagedTotal) : '—'}
                          </td>

                          {/* Month Columns */}
                          {monthColumns.map(month => {
                            const draws = getDrawsForMonth(project, month.key)
                            const monthTotal = draws.reduce((sum, d) => sum + d.total_amount, 0)
                            
                            return (
                              <td 
                                key={month.key}
                                className="px-2 text-center border-b"
                                style={{ borderColor: 'var(--border-subtle)' }}
                              >
                                {draws.length > 0 && isExpanded ? (
                                  <button
                                    onClick={() => draws[0] && onDrawClick(draws[0], project)}
                                    className="hover:underline font-medium"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    {formatShortCurrency(monthTotal)}
                                  </button>
                                ) : draws.length > 0 ? (
                                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                                ) : null}
                              </td>
                            )
                          })}

                          {/* Row Totals */}
                          <td 
                            className="px-2 text-center border-b border-l font-semibold"
                            style={{ 
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {formatShortCurrency(projectTotal)}
                          </td>
                          <td 
                            className="px-2 text-center border-b"
                            style={{ 
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {formatShortCurrency(project.loan_amount || 0)}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>

                  {/* Lender Totals Row */}
                  {!isLenderCollapsed && (
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <td 
                        className="sticky left-0 z-10 px-3 border-b border-r font-semibold"
                        style={{ 
                          height: rowHeight,
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        TOTALS
                      </td>
                      <td 
                        className="sticky left-[140px] z-10 px-2 border-b border-r text-center font-semibold"
                        style={{ 
                          height: rowHeight,
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border)',
                          color: lenderTotals.staged > 0 ? 'var(--warning)' : 'var(--text-muted)'
                        }}
                      >
                        {lenderTotals.staged > 0 ? formatShortCurrency(lenderTotals.staged) : '—'}
                      </td>
                      {monthColumns.map(month => {
                        const monthTotal = lenderTotals.byMonth.get(month.key) || 0
                        return (
                          <td 
                            key={month.key}
                            className="px-2 text-center border-b font-semibold"
                            style={{ 
                              height: rowHeight,
                              borderColor: 'var(--border)',
                              color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)'
                            }}
                          >
                            {monthTotal > 0 ? formatShortCurrency(monthTotal) : '—'}
                          </td>
                        )
                      })}
                      <td 
                        className="px-2 text-center border-b border-l font-bold"
                        style={{ 
                          height: rowHeight,
                          borderColor: 'var(--border)',
                          color: 'var(--accent)'
                        }}
                      >
                        {formatCurrency(lenderTotals.total)}
                      </td>
                      <td 
                        className="px-2 text-center border-b font-semibold"
                        style={{ 
                          height: rowHeight,
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {formatCurrency(lenderTotals.budget)}
                      </td>
                    </tr>
                  )}
                </motion.tbody>
              )
            })}

            {/* Grand Total Row */}
            <tr style={{ background: 'var(--bg-card)' }}>
              <td 
                className="sticky left-0 z-10 px-3 border-t-2 border-r font-bold"
                style={{ 
                  height: rowHeight + 4,
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                TOTAL DRAW
              </td>
              <td 
                className="sticky left-[140px] z-10 px-2 border-t-2 border-r font-bold text-center"
                style={{ 
                  height: rowHeight + 4,
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--accent)'
                }}
              >
                {formatCurrency(grandTotals.total)}
              </td>
              {monthColumns.map(month => {
                const monthTotal = grandTotals.byMonth.get(month.key) || 0
                return (
                  <td 
                    key={month.key}
                    className="px-2 text-center border-t-2 font-bold"
                    style={{ 
                      height: rowHeight + 4,
                      borderColor: 'var(--border)',
                      color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)'
                    }}
                  >
                    {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
                  </td>
                )
              })}
              <td 
                className="px-2 text-center border-t-2 border-l font-bold"
                style={{ 
                  height: rowHeight + 4,
                  borderColor: 'var(--border)',
                  color: 'var(--accent)'
                }}
              >
                {formatCurrency(grandTotals.total)}
              </td>
              <td 
                className="px-2 text-center border-t-2 font-bold"
                style={{ 
                  height: rowHeight + 4,
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                {formatCurrency(grandTotals.budget)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
