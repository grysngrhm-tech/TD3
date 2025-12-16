'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveSankey } from '@nivo/sankey'
import type { Budget, DrawRequestLine, DrawRequest } from '@/types/database'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { BudgetSparkline, MiniSparkline } from '@/app/components/ui/BudgetSparkline'
import { 
  type Anomaly, 
  getBudgetAnomalies, 
  getBudgetSeverity 
} from '@/lib/anomalyDetection'
import type { DetailPanelContent, DrawHistoryItem } from '@/app/components/ui/ReportDetailPanel'

type DrawLineWithBudget = DrawRequestLine & {
  budget?: Budget | null
  draw_request?: DrawRequest | null
}

type ProgressBudgetReportProps = {
  budgets: Budget[]
  drawLines: DrawLineWithBudget[]
  draws: DrawRequest[]
  anomalies: Anomaly[]
  viewMode: ViewMode
  onSelectItem: (content: DetailPanelContent) => void
}

type GroupedBudget = {
  category: string
  categoryCode: string
  items: Budget[]
  totalBudget: number
  totalSpent: number
  isExpanded: boolean
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Progress Budget Report with three view modes:
 * - Table: Grouped rows with expandable draw history
 * - Cards: Budget items as cards grouped by category
 * - Chart: Sankey diagram showing money flow
 */
export function ProgressBudgetReport({
  budgets,
  drawLines,
  draws,
  anomalies,
  viewMode,
  onSelectItem,
}: ProgressBudgetReportProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<'category' | 'budget' | 'spent' | 'remaining' | 'percent'>('category')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Group budgets by NAHB category
  const groupedBudgets = useMemo(() => {
    const groups = new Map<string, GroupedBudget>()
    
    for (const budget of budgets) {
      const categoryKey = budget.nahb_category || 'Uncategorized'
      const categoryCode = budget.cost_code?.substring(0, 2) || '00'
      
      if (!groups.has(categoryKey)) {
        groups.set(categoryKey, {
          category: categoryKey,
          categoryCode,
          items: [],
          totalBudget: 0,
          totalSpent: 0,
          isExpanded: expandedCategories.has(categoryKey),
        })
      }
      
      const group = groups.get(categoryKey)!
      group.items.push(budget)
      group.totalBudget += budget.current_amount || 0
      group.totalSpent += budget.spent_amount || 0
    }
    
    // Sort groups by category code
    return Array.from(groups.values()).sort((a, b) => 
      a.categoryCode.localeCompare(b.categoryCode)
    )
  }, [budgets, expandedCategories])

  // Create draw history lookup by budget ID
  const drawHistoryByBudget = useMemo(() => {
    const history = new Map<string, DrawHistoryItem[]>()
    
    for (const line of drawLines) {
      if (!line.budget_id) continue
      
      const existing = history.get(line.budget_id) || []
      existing.push({
        drawNumber: line.draw_request?.draw_number || 0,
        date: line.draw_request?.request_date || line.created_at || '',
        amount: line.amount_approved || line.amount_requested || 0,
        notes: line.notes,
      })
      history.set(line.budget_id, existing)
    }
    
    // Sort each budget's history by date
    for (const [key, items] of history) {
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    
    return history
  }, [drawLines])

  // Calculate totals
  const totals = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      percentUsed: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    }
  }, [budgets])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Toggle budget line expansion
  const toggleBudget = (budgetId: string) => {
    setExpandedBudgets(prev => {
      const next = new Set(prev)
      if (next.has(budgetId)) {
        next.delete(budgetId)
      } else {
        next.add(budgetId)
      }
      return next
    })
  }

  // Handle sort column click
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Get severity color for anomaly indicator
  const getSeverityColor = (severity: 'info' | 'warning' | 'critical' | null) => {
    switch (severity) {
      case 'critical': return 'var(--error)'
      case 'warning': return 'var(--warning)'
      case 'info': return 'var(--info)'
      default: return 'transparent'
    }
  }

  // Handle row click to open detail panel
  const handleBudgetClick = (budget: Budget) => {
    const history = drawHistoryByBudget.get(budget.id) || []
    onSelectItem({
      type: 'budget',
      data: budget,
      drawHistory: history,
    })
  }

  // Render based on view mode
  if (viewMode === 'chart') {
    return <SankeyView budgets={budgets} draws={draws} totals={totals} />
  }

  if (viewMode === 'cards') {
    return (
      <CardsView 
        groupedBudgets={groupedBudgets} 
        anomalies={anomalies}
        drawHistoryByBudget={drawHistoryByBudget}
        onBudgetClick={handleBudgetClick}
        getSeverityColor={getSeverityColor}
      />
    )
  }

  // Table View (default)
  return (
    <div className="card-ios p-0 overflow-hidden">
      {/* Sticky Header */}
      <div 
        className="sticky top-0 z-10"
        style={{ background: 'var(--bg-card)' }}
      >
        <table className="w-full">
          <thead>
            <tr>
              <th 
                className="table-header text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-2">
                  Code / Category
                  {sortColumn === 'category' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="table-header text-right cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => handleSort('budget')}
              >
                <div className="flex items-center justify-end gap-2">
                  Budget
                  {sortColumn === 'budget' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="table-header text-right cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => handleSort('spent')}
              >
                <div className="flex items-center justify-end gap-2">
                  Drawn
                  {sortColumn === 'spent' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="table-header text-right cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => handleSort('remaining')}
              >
                <div className="flex items-center justify-end gap-2">
                  Remaining
                  {sortColumn === 'remaining' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </div>
              </th>
              <th className="table-header text-center w-20">Trend</th>
              <th 
                className="table-header text-right cursor-pointer hover:bg-[var(--bg-hover)] transition-colors w-20"
                onClick={() => handleSort('percent')}
              >
                <div className="flex items-center justify-end gap-2">
                  %
                  {sortColumn === 'percent' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </div>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Table Body */}
      <div className="overflow-y-auto max-h-[600px]">
        <table className="w-full">
          <tbody>
            {groupedBudgets.map((group) => (
              <GroupedBudgetRows
                key={group.category}
                group={group}
                isExpanded={expandedCategories.has(group.category)}
                expandedBudgets={expandedBudgets}
                anomalies={anomalies}
                drawHistoryByBudget={drawHistoryByBudget}
                onToggleCategory={() => toggleCategory(group.category)}
                onToggleBudget={toggleBudget}
                onBudgetClick={handleBudgetClick}
                getSeverityColor={getSeverityColor}
              />
            ))}
          </tbody>

          {/* Sticky Footer with Totals */}
          <tfoot className="sticky bottom-0" style={{ background: 'var(--bg-hover)' }}>
            <tr>
              <td className="table-cell font-semibold">Total</td>
              <td className="table-cell text-right font-semibold">{formatCurrency(totals.totalBudget)}</td>
              <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
                {formatCurrency(totals.totalSpent)}
              </td>
              <td className="table-cell text-right font-semibold" style={{ 
                color: totals.remaining < 0 ? 'var(--error)' : 'var(--success)' 
              }}>
                {formatCurrency(totals.remaining)}
              </td>
              <td className="table-cell text-center">
                <MiniSparkline 
                  percentUsed={totals.percentUsed} 
                  isOverBudget={totals.remaining < 0} 
                />
              </td>
              <td className="table-cell text-right font-semibold">
                {totals.percentUsed.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// Grouped budget rows component
function GroupedBudgetRows({
  group,
  isExpanded,
  expandedBudgets,
  anomalies,
  drawHistoryByBudget,
  onToggleCategory,
  onToggleBudget,
  onBudgetClick,
  getSeverityColor,
}: {
  group: GroupedBudget
  isExpanded: boolean
  expandedBudgets: Set<string>
  anomalies: Anomaly[]
  drawHistoryByBudget: Map<string, DrawHistoryItem[]>
  onToggleCategory: () => void
  onToggleBudget: (id: string) => void
  onBudgetClick: (budget: Budget) => void
  getSeverityColor: (severity: 'info' | 'warning' | 'critical' | null) => string
}) {
  const remaining = group.totalBudget - group.totalSpent
  const percentUsed = group.totalBudget > 0 ? (group.totalSpent / group.totalBudget) * 100 : 0

  return (
    <>
      {/* Category Header Row */}
      <tr 
        className="cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        style={{ background: 'var(--bg-secondary)' }}
        onClick={onToggleCategory}
      >
        <td className="table-cell font-semibold">
          <div className="flex items-center gap-2">
            <motion.svg 
              className="w-4 h-4 flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </motion.svg>
            <span style={{ color: 'var(--text-primary)' }}>
              {group.categoryCode} - {group.category}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ 
              background: 'var(--bg-hover)', 
              color: 'var(--text-muted)' 
            }}>
              {group.items.length}
            </span>
          </div>
        </td>
        <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(group.totalBudget)}
        </td>
        <td className="table-cell text-right font-semibold" style={{ color: 'var(--accent)' }}>
          {formatCurrency(group.totalSpent)}
        </td>
        <td className="table-cell text-right font-semibold" style={{ 
          color: remaining < 0 ? 'var(--error)' : 'var(--text-primary)' 
        }}>
          {formatCurrency(remaining)}
        </td>
        <td className="table-cell text-center">
          <MiniSparkline percentUsed={percentUsed} isOverBudget={remaining < 0} />
        </td>
        <td className="table-cell text-right font-semibold" style={{ 
          color: percentUsed > 100 ? 'var(--error)' : percentUsed > 80 ? 'var(--warning)' : 'var(--text-primary)'
        }}>
          {percentUsed.toFixed(1)}%
        </td>
      </tr>

      {/* Individual Budget Lines */}
      <AnimatePresence>
        {isExpanded && group.items.map((budget) => {
          const budgetRemaining = (budget.current_amount || 0) - (budget.spent_amount || 0)
          const budgetPercent = budget.current_amount ? ((budget.spent_amount || 0) / budget.current_amount) * 100 : 0
          const severity = getBudgetSeverity(budget.id, anomalies)
          const history = drawHistoryByBudget.get(budget.id) || []
          const isBudgetExpanded = expandedBudgets.has(budget.id)

          return (
            <motion.tr
              key={budget.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              style={{ 
                borderLeft: severity ? `3px solid ${getSeverityColor(severity)}` : undefined 
              }}
              onClick={() => onBudgetClick(budget)}
            >
              <td className="table-cell pl-10">
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleBudget(budget.id)
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--bg-card)] transition-colors"
                    >
                      <motion.svg 
                        className="w-3 h-3"
                        style={{ color: 'var(--text-muted)' }}
                        animate={{ rotate: isBudgetExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </motion.svg>
                    </button>
                  )}
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {budget.cost_code && <span className="mr-2" style={{ color: 'var(--text-muted)' }}>{budget.cost_code}</span>}
                      {budget.category}
                    </div>
                    {budget.nahb_subcategory && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {budget.nahb_subcategory}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="table-cell text-right">{formatCurrency(budget.current_amount)}</td>
              <td className="table-cell text-right" style={{ color: 'var(--accent)' }}>
                {(budget.spent_amount || 0) > 0 ? formatCurrency(budget.spent_amount) : '—'}
              </td>
              <td className="table-cell text-right" style={{ 
                color: budgetRemaining < 0 ? 'var(--error)' : 'var(--text-secondary)' 
              }}>
                {formatCurrency(budgetRemaining)}
              </td>
              <td className="table-cell text-center">
                {history.length > 0 ? (
                  <BudgetSparkline
                    data={history.map(h => ({ date: h.date, amount: h.amount }))}
                    budgetAmount={budget.current_amount || 0}
                    width={60}
                    height={20}
                    showTooltip={false}
                  />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td className="table-cell text-right" style={{ 
                color: budgetPercent > 100 ? 'var(--error)' : budgetPercent > 80 ? 'var(--warning)' : 'var(--text-secondary)'
              }}>
                {budgetPercent.toFixed(0)}%
              </td>
            </motion.tr>
          )
        })}
      </AnimatePresence>
    </>
  )
}

// Cards View component
function CardsView({
  groupedBudgets,
  anomalies,
  drawHistoryByBudget,
  onBudgetClick,
  getSeverityColor,
}: {
  groupedBudgets: GroupedBudget[]
  anomalies: Anomaly[]
  drawHistoryByBudget: Map<string, DrawHistoryItem[]>
  onBudgetClick: (budget: Budget) => void
  getSeverityColor: (severity: 'info' | 'warning' | 'critical' | null) => string
}) {
  return (
    <div className="space-y-6">
      {groupedBudgets.map((group) => (
        <div key={group.category}>
          {/* Category Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {group.categoryCode} - {group.category}
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <span style={{ color: 'var(--text-muted)' }}>
                {formatCurrency(group.totalSpent)} / {formatCurrency(group.totalBudget)}
              </span>
              <MiniSparkline 
                percentUsed={group.totalBudget > 0 ? (group.totalSpent / group.totalBudget) * 100 : 0}
                isOverBudget={group.totalSpent > group.totalBudget}
              />
            </div>
          </div>

          {/* Budget Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((budget) => {
              const remaining = (budget.current_amount || 0) - (budget.spent_amount || 0)
              const percentUsed = budget.current_amount ? ((budget.spent_amount || 0) / budget.current_amount) * 100 : 0
              const severity = getBudgetSeverity(budget.id, anomalies)
              const history = drawHistoryByBudget.get(budget.id) || []

              return (
                <motion.div
                  key={budget.id}
                  className="card-ios cursor-pointer"
                  style={{ 
                    borderLeft: severity ? `3px solid ${getSeverityColor(severity)}` : undefined 
                  }}
                  onClick={() => onBudgetClick(budget)}
                  whileHover={{ scale: 1.01, boxShadow: 'var(--elevation-3)' }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {budget.category}
                      </div>
                      {budget.cost_code && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {budget.cost_code}
                        </div>
                      )}
                    </div>
                    {severity && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ background: getSeverityColor(severity) }}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Budget</div>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(budget.current_amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Drawn</div>
                      <div className="font-semibold" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(budget.spent_amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining</div>
                      <div className="font-semibold" style={{ 
                        color: remaining < 0 ? 'var(--error)' : 'var(--success)' 
                      }}>
                        {formatCurrency(remaining)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                    <motion.div 
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ 
                        background: remaining < 0 ? 'var(--error)' : 'var(--accent)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentUsed, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{percentUsed.toFixed(1)}% used</span>
                    <span>{history.length} draw{history.length !== 1 ? 's' : ''}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// Sankey Chart View
function SankeyView({
  budgets,
  draws,
  totals,
}: {
  budgets: Budget[]
  draws: DrawRequest[]
  totals: { totalBudget: number; totalSpent: number }
}) {
  // Build Sankey data
  const sankeyData = useMemo(() => {
    const nodes: { id: string; nodeColor?: string }[] = []
    const links: { source: string; target: string; value: number }[] = []
    
    // Add loan source node
    nodes.push({ id: 'Loan', nodeColor: 'var(--accent)' })
    
    // Add category nodes and links from loan
    const categories = new Map<string, number>()
    for (const budget of budgets) {
      const category = budget.nahb_category || 'Other'
      const current = categories.get(category) || 0
      categories.set(category, current + (budget.spent_amount || 0))
    }
    
    for (const [category, spent] of categories) {
      if (spent > 0) {
        nodes.push({ id: category })
        links.push({ source: 'Loan', target: category, value: spent })
      }
    }
    
    // Add draw nodes and links from categories
    for (const draw of draws) {
      if (draw.total_amount > 0) {
        const drawId = `Draw #${draw.draw_number}`
        nodes.push({ id: drawId, nodeColor: 'var(--success)' })
        
        // For simplicity, connect all draws to all categories proportionally
        // In a real implementation, you'd track which draw funded which category
        for (const [category, spent] of categories) {
          if (spent > 0) {
            const proportion = spent / totals.totalSpent
            links.push({ 
              source: category, 
              target: drawId, 
              value: draw.total_amount * proportion 
            })
          }
        }
      }
    }
    
    return { nodes, links }
  }, [budgets, draws, totals.totalSpent])

  if (sankeyData.nodes.length < 2 || sankeyData.links.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 400 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No draw data available for chart</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Draw funds to see the flow visualization</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-ios p-0" style={{ height: 500 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fund Flow</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Loan → Categories → Draws
        </p>
      </div>
      <div style={{ height: 450 }}>
        <ResponsiveSankey
          data={sankeyData}
          margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
          align="justify"
          colors={{ scheme: 'category10' }}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={24}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={16}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
          theme={{
            background: 'transparent',
            text: {
              fill: 'var(--text-primary)',
              fontSize: 11,
            },
            tooltip: {
              container: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--elevation-2)',
                padding: '8px 12px',
              },
            },
          }}
        />
      </div>
    </div>
  )
}

