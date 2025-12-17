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

/**
 * TimelineSpreadsheetView - Legacy Excel-style table view
 * 
 * Features:
 * - Traditional spreadsheet layout matching legacy Excel
 * - Grouped by lender sections
 * - Fixed left column with project names
 * - Date columns with draw amounts
 * - Totals row and column
 */
export function TimelineSpreadsheetView({
  projectsByLender,
  allFundDates,
  stagedDrawsByProject,
  onDrawClick
}: TimelineSpreadsheetViewProps) {
  const router = useRouter()
  const [collapsedLenders, setCollapsedLenders] = useState<Set<string>>(new Set())

  const toggleLenderCollapse = useCallback((lenderId: string) => {
    setCollapsedLenders(prev => {
      const next = new Set(prev)
      if (next.has(lenderId)) {
        next.delete(lenderId)
      } else {
        next.add(lenderId)
      }
      return next
    })
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatShortCurrency = (amount: number) => {
    if (amount === 0) return ''
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`
    }
    return `$${amount}`
  }

  const formatColumnDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  }

  // Get draws for a specific date and project
  const getDrawsForDateAndProject = useCallback((project: ProjectWithDraws, dateStr: string) => {
    return project.draws.filter(draw => {
      if (draw.status !== 'funded' || !draw.funded_at) return false
      const fundDate = new Date(draw.funded_at).toISOString().split('T')[0]
      return fundDate === dateStr
    })
  }, [])

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const byDate = new Map<string, number>()
    let total = 0
    let budget = 0
    let amortization = 0

    allFundDates.forEach(date => byDate.set(date, 0))

    projectsByLender.forEach(group => {
      group.projects.forEach(project => {
        budget += project.loan_amount || 0
        amortization += project.loan_amount || 0 // Simplified - would need actual amortization calc
        
        project.draws.forEach(draw => {
          if (draw.status === 'funded' && draw.funded_at) {
            const dateStr = new Date(draw.funded_at).toISOString().split('T')[0]
            total += draw.total_amount
            const current = byDate.get(dateStr) || 0
            byDate.set(dateStr, current + draw.total_amount)
          }
        })
      })
    })

    return { byDate, total, budget, amortization }
  }, [projectsByLender, allFundDates])

  return (
    <div className="card-ios overflow-hidden">
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full border-collapse" style={{ minWidth: 800 + allFundDates.length * 100 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th 
                className="sticky left-0 z-10 px-4 py-3 text-left text-xs font-semibold border-b border-r"
                style={{ 
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  minWidth: 180
                }}
              >
                Project
              </th>
              <th 
                className="sticky left-[180px] z-10 px-3 py-3 text-center text-xs font-semibold border-b border-r"
                style={{ 
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  minWidth: 70
                }}
              >
                Draw
              </th>
              {allFundDates.map(dateStr => (
                <th 
                  key={dateStr}
                  className="px-2 py-3 text-center text-xs font-medium border-b"
                  style={{ 
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                    minWidth: 100
                  }}
                >
                  {formatColumnDate(dateStr)}
                </th>
              ))}
              <th 
                className="px-3 py-3 text-center text-xs font-semibold border-b border-l"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  minWidth: 100
                }}
              >
                Totals
              </th>
              <th 
                className="px-3 py-3 text-center text-xs font-semibold border-b"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  minWidth: 100
                }}
              >
                Budget
              </th>
              <th 
                className="px-3 py-3 text-center text-xs font-semibold border-b"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  minWidth: 100
                }}
              >
                Amortization
              </th>
            </tr>
          </thead>
          <tbody>
            {projectsByLender.map((group, groupIndex) => {
              const isCollapsed = collapsedLenders.has(group.lenderId)
              
              // Calculate lender totals
              const lenderTotals = {
                byDate: new Map<string, number>(),
                total: 0,
                budget: 0,
                amortization: 0
              }
              
              allFundDates.forEach(date => lenderTotals.byDate.set(date, 0))
              
              group.projects.forEach(project => {
                lenderTotals.budget += project.loan_amount || 0
                lenderTotals.amortization += project.loan_amount || 0
                
                project.draws.forEach(draw => {
                  if (draw.status === 'funded' && draw.funded_at) {
                    const dateStr = new Date(draw.funded_at).toISOString().split('T')[0]
                    lenderTotals.total += draw.total_amount
                    const current = lenderTotals.byDate.get(dateStr) || 0
                    lenderTotals.byDate.set(dateStr, current + draw.total_amount)
                  }
                })
              })

              return (
                <motion.tbody
                  key={group.lenderId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: groupIndex * 0.1 }}
                >
                  {/* Lender Header Row */}
                  <tr>
                    <td 
                      colSpan={3 + allFundDates.length + 3}
                      className="px-0 py-0"
                    >
                      <button
                        onClick={() => toggleLenderCollapse(group.lenderId)}
                        className="w-full px-4 py-2 flex items-center gap-2 text-left font-semibold border-b transition-colors hover:opacity-80"
                        style={{ 
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <motion.svg
                          animate={{ rotate: isCollapsed ? -90 : 0 }}
                          className="w-4 h-4"
                          style={{ color: 'var(--text-muted)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                        {group.lender?.name || 'No Lender Assigned'}
                      </button>
                    </td>
                  </tr>

                  {/* Project Rows */}
                  <AnimatePresence>
                    {!isCollapsed && group.projects.map((project, projectIndex) => {
                      const projectTotal = project.total_spent || 0
                      const stagedDraws = stagedDrawsByProject.get(project.id) || []
                      
                      return (
                        <motion.tr
                          key={project.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="hover:opacity-90 transition-opacity"
                          style={{ background: projectIndex % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
                        >
                          {/* Project Name - Fixed */}
                          <td 
                            className="sticky left-0 z-10 px-4 py-2 border-b border-r"
                            style={{ 
                              background: projectIndex % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                              borderColor: 'var(--border-subtle)'
                            }}
                          >
                            <button
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="text-sm font-medium hover:underline text-left"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {project.project_code || project.name}
                            </button>
                          </td>

                          {/* Draw Number / Staged Indicator */}
                          <td 
                            className="sticky left-[180px] z-10 px-3 py-2 text-center border-b border-r"
                            style={{ 
                              background: projectIndex % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                              borderColor: 'var(--border-subtle)'
                            }}
                          >
                            {stagedDraws.length > 0 ? (
                              <span 
                                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse"
                                style={{ 
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: 'var(--warning)'
                                }}
                              >
                                {stagedDraws.length}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Date Columns */}
                          {allFundDates.map(dateStr => {
                            const draws = getDrawsForDateAndProject(project, dateStr)
                            const dateTotal = draws.reduce((sum, d) => sum + d.total_amount, 0)
                            
                            return (
                              <td 
                                key={dateStr}
                                className="px-2 py-2 text-center border-b text-sm"
                                style={{ borderColor: 'var(--border-subtle)' }}
                              >
                                {draws.length > 0 ? (
                                  <button
                                    onClick={() => draws[0] && onDrawClick(draws[0], project)}
                                    className="hover:underline font-medium"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    {formatShortCurrency(dateTotal)}
                                  </button>
                                ) : null}
                              </td>
                            )
                          })}

                          {/* Row Totals */}
                          <td 
                            className="px-3 py-2 text-center border-b border-l text-sm font-semibold"
                            style={{ 
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {formatShortCurrency(projectTotal)}
                          </td>
                          <td 
                            className="px-3 py-2 text-center border-b text-sm"
                            style={{ 
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {formatShortCurrency(project.loan_amount || 0)}
                          </td>
                          <td 
                            className="px-3 py-2 text-center border-b text-sm"
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
                  {!isCollapsed && (
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <td 
                        className="sticky left-0 z-10 px-4 py-2 border-b border-r font-semibold text-sm"
                        style={{ 
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        TOTALS
                      </td>
                      <td 
                        className="sticky left-[180px] z-10 px-3 py-2 border-b border-r"
                        style={{ 
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border)'
                        }}
                      />
                      {allFundDates.map(dateStr => {
                        const dateTotal = lenderTotals.byDate.get(dateStr) || 0
                        return (
                          <td 
                            key={dateStr}
                            className="px-2 py-2 text-center border-b text-sm font-semibold"
                            style={{ 
                              borderColor: 'var(--border)',
                              color: dateTotal > 0 ? 'var(--accent)' : 'var(--text-muted)'
                            }}
                          >
                            {dateTotal > 0 ? formatShortCurrency(dateTotal) : '—'}
                          </td>
                        )
                      })}
                      <td 
                        className="px-3 py-2 text-center border-b border-l text-sm font-bold"
                        style={{ 
                          borderColor: 'var(--border)',
                          color: 'var(--accent)'
                        }}
                      >
                        {formatCurrency(lenderTotals.total)}
                      </td>
                      <td 
                        className="px-3 py-2 text-center border-b text-sm font-semibold"
                        style={{ 
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {formatCurrency(lenderTotals.budget)}
                      </td>
                      <td 
                        className="px-3 py-2 text-center border-b text-sm font-semibold"
                        style={{ 
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {formatCurrency(lenderTotals.amortization)}
                      </td>
                    </tr>
                  )}
                </motion.tbody>
              )
            })}

            {/* Grand Total Row */}
            <tr style={{ background: 'var(--bg-card)' }}>
              <td 
                className="sticky left-0 z-10 px-4 py-3 border-t-2 border-r font-bold"
                style={{ 
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                TOTAL DRAW
              </td>
              <td 
                className="sticky left-[180px] z-10 px-3 py-3 border-t-2 border-r font-bold"
                style={{ 
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--accent)'
                }}
              >
                {formatCurrency(grandTotals.total)}
              </td>
              {allFundDates.map(dateStr => {
                const dateTotal = grandTotals.byDate.get(dateStr) || 0
                return (
                  <td 
                    key={dateStr}
                    className="px-2 py-3 text-center border-t-2 text-sm font-bold"
                    style={{ 
                      borderColor: 'var(--border)',
                      color: dateTotal > 0 ? 'var(--accent)' : 'var(--text-muted)'
                    }}
                  >
                    {dateTotal > 0 ? formatCurrency(dateTotal) : '—'}
                  </td>
                )
              })}
              <td 
                className="px-3 py-3 text-center border-t-2 border-l font-bold"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--accent)'
                }}
              >
                {formatCurrency(grandTotals.total)}
              </td>
              <td 
                className="px-3 py-3 text-center border-t-2 font-bold"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                {formatCurrency(grandTotals.budget)}
              </td>
              <td 
                className="px-3 py-3 text-center border-t-2 font-bold"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                {formatCurrency(grandTotals.amortization)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

