'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Project, DrawRequest, Lender } from '@/types/custom'
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

// ============================================================================
// CONSTANTS - Fixed dimensions for consistent layout
// ============================================================================

const ROW_HEIGHTS = {
  header: 36,
  lenderHeader: 44,
  data: 40,
  subtotal: 36,
  grandTotal: 44,
}

const COLUMN_WIDTHS = {
  project: 160,
  staged: 80,
  month: 90,
  drawn: 100,
  budget: 100,
}

const LEFT_PANEL_WIDTH = COLUMN_WIDTHS.project + COLUMN_WIDTHS.staged // 240px

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

function formatShortCurrency(amount: number): string {
  if (amount === 0) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`
  return `$${amount}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * TimelineSpreadsheetView - Two-panel spreadsheet layout
 * 
 * Architecture:
 * - Fixed left panel (Project + Staged) - never scrolls horizontally
 * - Scrollable right panel (Months + Drawn + Budget) - horizontal scroll
 * - Both panels use matching row heights for alignment
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

  // Generate month columns
  const monthColumns = useMemo(() => generateMonthColumns(allFundDates), [allFundDates])

  // Get draws for a specific month and project
  const getMonthAmount = useCallback((project: ProjectWithDraws, monthKey: string): { amount: number; draws: DrawRequest[] } => {
    const draws = project.draws.filter(draw => {
      if (draw.status !== 'funded' || !draw.funded_at) return false
      const fundDate = new Date(draw.funded_at)
      const drawMonthKey = `${fundDate.getFullYear()}-${String(fundDate.getMonth() + 1).padStart(2, '0')}`
      return drawMonthKey === monthKey
    })
    const amount = draws.reduce((sum, d) => sum + d.total_amount, 0)
    return { amount, draws }
  }, [])

  // Calculate totals for a lender group
  const calculateLenderTotals = useCallback((group: LenderGroup) => {
    const byMonth = new Map<string, number>()
    let totalDrawn = 0
    let totalStaged = 0
    let totalBudget = 0

    monthColumns.forEach(m => byMonth.set(m.key, 0))

    group.projects.forEach(project => {
      totalBudget += project.loan_amount || 0
      
      const stagedDraws = stagedDrawsByProject.get(project.id) || []
      stagedDraws.forEach(d => totalStaged += d.total_amount || 0)
      
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

    return { byMonth, totalDrawn, totalStaged, totalBudget }
  }, [monthColumns, stagedDrawsByProject])

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const byMonth = new Map<string, number>()
    let totalDrawn = 0
    let totalStaged = 0
    let totalBudget = 0

    monthColumns.forEach(m => byMonth.set(m.key, 0))

    projectsByLender.forEach(group => {
      const lenderTotals = calculateLenderTotals(group)
      totalDrawn += lenderTotals.totalDrawn
      totalStaged += lenderTotals.totalStaged
      totalBudget += lenderTotals.totalBudget
      
      lenderTotals.byMonth.forEach((amount, key) => {
        const current = byMonth.get(key) || 0
        byMonth.set(key, current + amount)
      })
    })

    return { byMonth, totalDrawn, totalStaged, totalBudget }
  }, [projectsByLender, monthColumns, calculateLenderTotals])

  // Calculate right panel width
  const rightPanelMinWidth = 
    monthColumns.length * COLUMN_WIDTHS.month + 
    COLUMN_WIDTHS.drawn + 
    COLUMN_WIDTHS.budget

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--elevation-2)'
      }}
    >
      <div className="flex">
        {/* ================================================================ */}
        {/* LEFT PANEL - Fixed (Project + Staged)                           */}
        {/* ================================================================ */}
        <div 
          className="flex-shrink-0"
          style={{ 
            width: LEFT_PANEL_WIDTH,
            borderRight: '2px solid var(--border)'
          }}
        >
          {/* Left Header */}
          <div 
            className="flex"
            style={{ 
              height: ROW_HEIGHTS.header,
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)'
            }}
          >
            <div 
              className="flex items-center px-4 font-semibold text-xs uppercase tracking-wide"
              style={{ 
                width: COLUMN_WIDTHS.project,
                color: 'var(--text-secondary)'
              }}
            >
              Project
            </div>
            <div 
              className="flex items-center justify-end px-3 font-semibold text-xs uppercase tracking-wide"
              style={{ 
                width: COLUMN_WIDTHS.staged,
                color: 'var(--text-secondary)'
              }}
            >
              Staged
            </div>
          </div>

          {/* Left Body - Lender Groups */}
          {projectsByLender.map((group, groupIndex) => {
            const isCollapsed = collapsedLenders.has(group.lenderId)
            const lenderTotals = calculateLenderTotals(group)

            return (
              <div key={group.lenderId}>
                {/* Lender Header - Left Side */}
                <button
                  onClick={() => toggleLenderCollapse(group.lenderId)}
                  className="w-full flex items-center gap-2 px-4 transition-colors hover:opacity-80"
                  style={{ 
                    height: ROW_HEIGHTS.lenderHeader,
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <motion.svg
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {group.lender?.name || 'No Lender Assigned'}
                  </span>
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                  >
                    {group.projects.length}
                  </span>
                </button>

                {/* Project Rows - Left Side */}
                <AnimatePresence>
                  {!isCollapsed && group.projects.map((project, projectIndex) => {
                    const stagedDraws = stagedDrawsByProject.get(project.id) || []
                    const stagedTotal = stagedDraws.reduce((sum, d) => sum + (d.total_amount || 0), 0)
                    const isEvenRow = projectIndex % 2 === 0

                    return (
                      <motion.div
                        key={project.id}
                        className="flex"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: ROW_HEIGHTS.data }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ 
                          background: isEvenRow ? 'transparent' : 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                      >
                        {/* Project Name */}
                        <div 
                          className="flex items-center px-4"
                          style={{ width: COLUMN_WIDTHS.project }}
                        >
                          <button
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="font-medium text-sm hover:underline truncate text-left"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {project.project_code || project.name}
                          </button>
                        </div>

                        {/* Staged Amount */}
                        <div 
                          className="flex items-center justify-end px-3 text-sm"
                          style={{ 
                            width: COLUMN_WIDTHS.staged,
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            color: stagedTotal > 0 ? 'var(--warning)' : 'var(--text-muted)',
                            fontWeight: stagedTotal > 0 ? 600 : 400,
                          }}
                        >
                          {stagedTotal > 0 ? formatShortCurrency(stagedTotal) : '—'}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {/* Subtotal Row - Left Side */}
                {!isCollapsed && group.projects.length > 1 && (
                  <div 
                    className="flex"
                    style={{ 
                      height: ROW_HEIGHTS.subtotal,
                      background: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div 
                      className="flex items-center justify-end px-4 font-semibold text-xs uppercase tracking-wide"
                      style={{ 
                        width: COLUMN_WIDTHS.project,
                        color: 'var(--text-muted)'
                      }}
                    >
                      Subtotal
                    </div>
                    <div 
                      className="flex items-center justify-end px-3 text-sm font-semibold"
                      style={{ 
                        width: COLUMN_WIDTHS.staged,
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        color: lenderTotals.totalStaged > 0 ? 'var(--warning)' : 'var(--text-muted)',
                      }}
                    >
                      {lenderTotals.totalStaged > 0 ? formatShortCurrency(lenderTotals.totalStaged) : '—'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Grand Total Row - Left Side */}
          <div 
            className="flex"
            style={{ 
              height: ROW_HEIGHTS.grandTotal,
              background: 'var(--bg-tertiary)',
              borderTop: '2px solid var(--border)'
            }}
          >
            <div 
              className="flex items-center px-4 font-bold text-sm uppercase tracking-wide"
              style={{ 
                width: COLUMN_WIDTHS.project,
                color: 'var(--text-primary)'
              }}
            >
              Total Draw
            </div>
            <div 
              className="flex items-center justify-end px-3 font-bold text-sm"
              style={{ 
                width: COLUMN_WIDTHS.staged,
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                color: grandTotals.totalStaged > 0 ? 'var(--warning)' : 'var(--text-muted)',
              }}
            >
              {grandTotals.totalStaged > 0 ? formatCurrency(grandTotals.totalStaged) : '—'}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT PANEL - Scrollable (Months + Drawn + Budget)              */}
        {/* ================================================================ */}
        <div 
          className="flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div style={{ minWidth: rightPanelMinWidth }}>
            {/* Right Header */}
            <div 
              className="grid"
              style={{ 
                height: ROW_HEIGHTS.header,
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                gridTemplateColumns: `repeat(${monthColumns.length}, ${COLUMN_WIDTHS.month}px) ${COLUMN_WIDTHS.drawn}px ${COLUMN_WIDTHS.budget}px`
              }}
            >
              {monthColumns.map(month => (
                <div 
                  key={month.key}
                  className="flex items-center justify-end px-3 font-medium text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {month.label}
                </div>
              ))}
              <div 
                className="flex items-center justify-end px-3 font-semibold text-xs uppercase tracking-wide"
                style={{ 
                  color: 'var(--text-secondary)',
                  borderLeft: '1px solid var(--border-subtle)'
                }}
              >
                Drawn
              </div>
              <div 
                className="flex items-center justify-end px-3 font-semibold text-xs uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                Budget
              </div>
            </div>

            {/* Right Body - Lender Groups */}
            {projectsByLender.map((group) => {
              const isCollapsed = collapsedLenders.has(group.lenderId)
              const lenderTotals = calculateLenderTotals(group)

              return (
                <div key={group.lenderId}>
                  {/* Lender Header - Right Side (summary info) */}
                  <div 
                    className="flex items-center justify-end px-4 gap-4"
                    style={{ 
                      height: ROW_HEIGHTS.lenderHeader,
                      background: 'var(--bg-tertiary)',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <span 
                      className="text-xs"
                      style={{ 
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)' 
                      }}
                    >
                      Drawn:{' '}
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {formatCurrency(lenderTotals.totalDrawn)}
                      </span>
                    </span>
                    <span 
                      className="text-xs"
                      style={{ 
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)' 
                      }}
                    >
                      of {formatCurrency(lenderTotals.totalBudget)}
                    </span>
                  </div>

                  {/* Project Rows - Right Side */}
                  <AnimatePresence>
                    {!isCollapsed && group.projects.map((project, projectIndex) => {
                      const isEvenRow = projectIndex % 2 === 0
                      const projectDrawn = project.total_spent || 0

                      return (
                        <motion.div
                          key={project.id}
                          className="grid"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: ROW_HEIGHTS.data }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ 
                            background: isEvenRow ? 'transparent' : 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border-subtle)',
                            gridTemplateColumns: `repeat(${monthColumns.length}, ${COLUMN_WIDTHS.month}px) ${COLUMN_WIDTHS.drawn}px ${COLUMN_WIDTHS.budget}px`
                          }}
                        >
                          {/* Month Columns */}
                          {monthColumns.map(month => {
                            const { amount, draws } = getMonthAmount(project, month.key)
                            
                            return (
                              <div 
                                key={month.key}
                                className="flex items-center justify-end px-3 text-sm"
                                style={{ 
                                  fontFamily: 'var(--font-mono)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {draws.length > 0 ? (
                                  <button
                                    onClick={() => onDrawClick(draws[0], project)}
                                    className="hover:underline font-medium"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    {formatShortCurrency(amount)}
                                  </button>
                                ) : null}
                              </div>
                            )
                          })}

                          {/* Drawn Total */}
                          <div 
                            className="flex items-center justify-end px-3 text-sm font-semibold"
                            style={{ 
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              color: projectDrawn > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              borderLeft: '1px solid var(--border-subtle)'
                            }}
                          >
                            {projectDrawn > 0 ? formatShortCurrency(projectDrawn) : '—'}
                          </div>

                          {/* Budget */}
                          <div 
                            className="flex items-center justify-end px-3 text-sm"
                            style={{ 
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {formatShortCurrency(project.loan_amount || 0)}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>

                  {/* Subtotal Row - Right Side */}
                  {!isCollapsed && group.projects.length > 1 && (
                    <div 
                      className="grid"
                      style={{ 
                        height: ROW_HEIGHTS.subtotal,
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border)',
                        gridTemplateColumns: `repeat(${monthColumns.length}, ${COLUMN_WIDTHS.month}px) ${COLUMN_WIDTHS.drawn}px ${COLUMN_WIDTHS.budget}px`
                      }}
                    >
                      {/* Month Subtotals */}
                      {monthColumns.map(month => {
                        const monthTotal = lenderTotals.byMonth.get(month.key) || 0
                        return (
                          <div 
                            key={month.key}
                            className="flex items-center justify-end px-3 text-sm font-semibold"
                            style={{ 
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                          >
                            {monthTotal > 0 ? formatShortCurrency(monthTotal) : '—'}
                          </div>
                        )
                      })}
                      
                      {/* Drawn Subtotal */}
                      <div 
                        className="flex items-center justify-end px-3 text-sm font-bold"
                        style={{ 
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--accent)',
                          borderLeft: '1px solid var(--border-subtle)'
                        }}
                      >
                        {formatShortCurrency(lenderTotals.totalDrawn)}
                      </div>
                      
                      {/* Budget Subtotal */}
                      <div 
                        className="flex items-center justify-end px-3 text-sm font-semibold"
                        style={{ 
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {formatShortCurrency(lenderTotals.totalBudget)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Grand Total Row - Right Side */}
            <div 
              className="grid"
              style={{ 
                height: ROW_HEIGHTS.grandTotal,
                background: 'var(--bg-tertiary)',
                borderTop: '2px solid var(--border)',
                gridTemplateColumns: `repeat(${monthColumns.length}, ${COLUMN_WIDTHS.month}px) ${COLUMN_WIDTHS.drawn}px ${COLUMN_WIDTHS.budget}px`
              }}
            >
              {/* Month Grand Totals */}
              {monthColumns.map(month => {
                const monthTotal = grandTotals.byMonth.get(month.key) || 0
                return (
                  <div 
                    key={month.key}
                    className="flex items-center justify-end px-3 text-sm font-bold"
                    style={{ 
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
                  </div>
                )
              })}
              
              {/* Drawn Grand Total */}
              <div 
                className="flex items-center justify-end px-3 font-bold"
                style={{ 
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '14px',
                  color: 'var(--accent)',
                  borderLeft: '1px solid var(--border-subtle)'
                }}
              >
                {formatCurrency(grandTotals.totalDrawn)}
              </div>
              
              {/* Budget Grand Total */}
              <div 
                className="flex items-center justify-end px-3 font-bold"
                style={{ 
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                }}
              >
                {formatCurrency(grandTotals.totalBudget)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
