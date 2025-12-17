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
      label: current.toLocaleDateString('en-US', { month: 'short' })
    })
    current.setMonth(current.getMonth() + 1)
  }
  
  return months
}

/**
 * TimelineSpreadsheetView - Clean spreadsheet-style table view
 * 
 * Design Language:
 * - Table styling from DESIGN_LANGUAGE.md Section 8.7
 * - Monospace font for financial values
 * - Right-aligned numeric columns
 * - Clear lender section grouping
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
      if (next.has(lenderId)) next.delete(lenderId)
      else next.add(lenderId)
      return next
    })
  }, [])

  // Format currency - compact for cells
  const formatShortCurrency = (amount: number) => {
    if (amount === 0) return '—'
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${Math.round(amount / 1000)}k`
    return `$${amount}`
  }

  // Format currency - full for totals
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
    let totalDrawn = 0
    let totalStaged = 0
    let totalBudget = 0

    monthColumns.forEach(m => byMonth.set(m.key, 0))

    projectsByLender.forEach(group => {
      group.projects.forEach(project => {
        totalBudget += project.loan_amount || 0
        
        // Staged draws
        const stagedDraws = stagedDrawsByProject.get(project.id) || []
        stagedDraws.forEach(d => totalStaged += d.total_amount || 0)
        
        // Funded draws
        project.draws.forEach(draw => {
          if (draw.status === 'funded' && draw.funded_at) {
            const fundDate = new Date(draw.funded_at)
            const monthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
            totalDrawn += draw.total_amount
            const current = byMonth.get(monthKey) || 0
            byMonth.set(monthKey, current + draw.total_amount)
          }
        })
      })
    })

    return { byMonth, totalDrawn, totalStaged, totalBudget }
  }, [projectsByLender, monthColumns, stagedDrawsByProject])

  // Column count for colspan calculations
  const totalColumns = 4 + monthColumns.length // Project, Staged, ...months, Total, Budget

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--elevation-2)'
      }}
    >
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table 
          className="w-full border-collapse"
          style={{ 
            minWidth: Math.max(500, 200 + 70 + monthColumns.length * 80 + 90 + 90),
            fontFamily: 'var(--font-primary)'
          }}
        >
          {/* Table Header */}
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {/* Project Column - Sticky */}
              <th 
                className="sticky left-0 z-20 text-left font-semibold"
                style={{ 
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)',
                  borderRight: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  minWidth: 180,
                }}
              >
                Project
              </th>
              
              {/* Staged Column - Sticky */}
              <th 
                className="sticky left-[180px] z-20 text-right font-semibold"
                style={{ 
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)',
                  borderRight: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  minWidth: 70,
                }}
              >
                Staged
              </th>
              
              {/* Month Columns */}
              {monthColumns.map(month => (
                <th 
                  key={month.key}
                  className="text-right font-medium"
                  style={{ 
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    minWidth: 80,
                  }}
                >
                  {month.label}
                </th>
              ))}
              
              {/* Total Column */}
              <th 
                className="text-right font-semibold"
                style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  minWidth: 90,
                }}
              >
                Drawn
              </th>
              
              {/* Budget Column */}
              <th 
                className="text-right font-semibold"
                style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  minWidth: 90,
                }}
              >
                Budget
              </th>
            </tr>
          </thead>
          
          <tbody>
            {projectsByLender.map((group, groupIndex) => {
              const isCollapsed = collapsedLenders.has(group.lenderId)
              
              // Calculate lender totals
              const lenderTotals = {
                byMonth: new Map<string, number>(),
                totalDrawn: 0,
                totalStaged: 0,
                totalBudget: 0,
              }
              
              monthColumns.forEach(m => lenderTotals.byMonth.set(m.key, 0))
              
              group.projects.forEach(project => {
                lenderTotals.totalBudget += project.loan_amount || 0
                
                const stagedDraws = stagedDrawsByProject.get(project.id) || []
                stagedDraws.forEach(d => lenderTotals.totalStaged += d.total_amount || 0)
                
                project.draws.forEach(draw => {
                  if (draw.status === 'funded' && draw.funded_at) {
                    const fundDate = new Date(draw.funded_at)
                    const monthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
                    lenderTotals.totalDrawn += draw.total_amount
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
                  {/* Lender Section Header */}
                  <tr>
                    <td colSpan={totalColumns} style={{ padding: 0 }}>
                      <button
                        onClick={() => toggleLenderCollapse(group.lenderId)}
                        className="w-full flex items-center justify-between transition-colors"
                        style={{ 
                          padding: '10px 16px',
                          background: 'var(--bg-tertiary)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <motion.svg
                            animate={{ rotate: isCollapsed ? -90 : 0 }}
                            transition={{ duration: 0.15 }}
                            className="w-4 h-4"
                            style={{ color: 'var(--text-muted)' }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </motion.svg>
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {group.lender?.name || 'No Lender Assigned'}
                          </span>
                          <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                          >
                            {group.projects.length} loan{group.projects.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Drawn: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              {formatCurrency(lenderTotals.totalDrawn)}
                            </span>
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            of {formatCurrency(lenderTotals.totalBudget)}
                          </span>
                        </div>
                      </button>
                    </td>
                  </tr>

                  {/* Project Rows */}
                  <AnimatePresence>
                    {!isCollapsed && group.projects.map((project, projectIndex) => {
                      const stagedDraws = stagedDrawsByProject.get(project.id) || []
                      const stagedTotal = stagedDraws.reduce((sum, d) => sum + (d.total_amount || 0), 0)
                      const projectDrawn = project.total_spent || 0
                      const isEvenRow = projectIndex % 2 === 0
                      
                      return (
                        <motion.tr
                          key={project.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="hover:opacity-90"
                          style={{ 
                            background: isEvenRow ? 'transparent' : 'var(--bg-secondary)',
                          }}
                        >
                          {/* Project Name - Sticky */}
                          <td 
                            className="sticky left-0 z-10"
                            style={{ 
                              padding: '10px 16px',
                              background: isEvenRow ? 'var(--bg-card)' : 'var(--bg-secondary)',
                              borderBottom: '1px solid var(--border-subtle)',
                              borderRight: '1px solid var(--border-subtle)',
                            }}
                          >
                            <button
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="font-medium text-sm hover:underline text-left"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {project.project_code || project.name}
                            </button>
                          </td>

                          {/* Staged - Sticky */}
                          <td 
                            className="sticky left-[180px] z-10 text-right"
                            style={{ 
                              padding: '10px 16px',
                              background: isEvenRow ? 'var(--bg-card)' : 'var(--bg-secondary)',
                              borderBottom: '1px solid var(--border-subtle)',
                              borderRight: '1px solid var(--border-subtle)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              color: stagedTotal > 0 ? 'var(--warning)' : 'var(--text-muted)',
                              fontWeight: stagedTotal > 0 ? 600 : 400,
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
                                className="text-right"
                                style={{ 
                                  padding: '10px 16px',
                                  borderBottom: '1px solid var(--border-subtle)',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '13px',
                                }}
                              >
                                {draws.length > 0 ? (
                                  <button
                                    onClick={() => onDrawClick(draws[0], project)}
                                    className="hover:underline font-medium"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    {formatShortCurrency(monthTotal)}
                                  </button>
                                ) : null}
                              </td>
                            )
                          })}

                          {/* Drawn Total */}
                          <td 
                            className="text-right font-semibold"
                            style={{ 
                              padding: '10px 16px',
                              borderBottom: '1px solid var(--border-subtle)',
                              borderLeft: '1px solid var(--border-subtle)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              color: projectDrawn > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}
                          >
                            {projectDrawn > 0 ? formatShortCurrency(projectDrawn) : '—'}
                          </td>

                          {/* Budget */}
                          <td 
                            className="text-right"
                            style={{ 
                              padding: '10px 16px',
                              borderBottom: '1px solid var(--border-subtle)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {formatShortCurrency(project.loan_amount || 0)}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>

                  {/* Lender Subtotals Row */}
                  {!isCollapsed && group.projects.length > 1 && (
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <td 
                        className="sticky left-0 z-10 text-right font-semibold text-xs uppercase tracking-wide"
                        style={{ 
                          padding: '8px 16px',
                          background: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Subtotal
                      </td>
                      <td 
                        className="sticky left-[180px] z-10 text-right font-semibold"
                        style={{ 
                          padding: '8px 16px',
                          background: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: lenderTotals.totalStaged > 0 ? 'var(--warning)' : 'var(--text-muted)',
                        }}
                      >
                        {lenderTotals.totalStaged > 0 ? formatShortCurrency(lenderTotals.totalStaged) : '—'}
                      </td>
                      {monthColumns.map(month => {
                        const monthTotal = lenderTotals.byMonth.get(month.key) || 0
                        return (
                          <td 
                            key={month.key}
                            className="text-right font-semibold"
                            style={{ 
                              padding: '8px 16px',
                              borderBottom: '1px solid var(--border)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                          >
                            {monthTotal > 0 ? formatShortCurrency(monthTotal) : '—'}
                          </td>
                        )
                      })}
                      <td 
                        className="text-right font-bold"
                        style={{ 
                          padding: '8px 16px',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: '1px solid var(--border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: 'var(--accent)',
                        }}
                      >
                        {formatShortCurrency(lenderTotals.totalDrawn)}
                      </td>
                      <td 
                        className="text-right font-semibold"
                        style={{ 
                          padding: '8px 16px',
                          borderBottom: '1px solid var(--border)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {formatShortCurrency(lenderTotals.totalBudget)}
                      </td>
                    </tr>
                  )}
                </motion.tbody>
              )
            })}

            {/* Grand Total Row */}
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <td 
                className="sticky left-0 z-10 font-bold uppercase tracking-wide"
                style={{ 
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderTop: '2px solid var(--border)',
                  borderRight: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                Total Draw
              </td>
              <td 
                className="sticky left-[180px] z-10 text-right font-bold"
                style={{ 
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderTop: '2px solid var(--border)',
                  borderRight: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: grandTotals.totalStaged > 0 ? 'var(--warning)' : 'var(--text-muted)',
                }}
              >
                {grandTotals.totalStaged > 0 ? formatCurrency(grandTotals.totalStaged) : '—'}
              </td>
              {monthColumns.map(month => {
                const monthTotal = grandTotals.byMonth.get(month.key) || 0
                return (
                  <td 
                    key={month.key}
                    className="text-right font-bold"
                    style={{ 
                      padding: '12px 16px',
                      borderTop: '2px solid var(--border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
                  </td>
                )
              })}
              <td 
                className="text-right font-bold"
                style={{ 
                  padding: '12px 16px',
                  borderTop: '2px solid var(--border)',
                  borderLeft: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  color: 'var(--accent)',
                }}
              >
                {formatCurrency(grandTotals.totalDrawn)}
              </td>
              <td 
                className="text-right font-bold"
                style={{ 
                  padding: '12px 16px',
                  borderTop: '2px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                }}
              >
                {formatCurrency(grandTotals.totalBudget)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
