'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveSankey } from '@nivo/sankey'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import type { Budget, DrawRequestLine, DrawRequest } from '@/types/database'
import type { ViewMode } from '@/app/components/ui/ViewModeSelector'
import { BudgetSparkline, MiniSparkline } from '@/app/components/ui/BudgetSparkline'
import { 
  type Anomaly, 
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
 * Progress Budget Report with two view modes:
 * - Table: Grouped rows with expandable draw history
 * - Chart: Dashboard with 3 visualizations (Sankey, Utilization, Velocity)
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
    return (
      <ChartDashboard 
        budgets={budgets} 
        draws={draws} 
        drawLines={drawLines}
        groupedBudgets={groupedBudgets}
        totals={totals} 
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

// =============================================================================
// CHART DASHBOARD - 3 Visualizations
// =============================================================================

function ChartDashboard({
  budgets,
  draws,
  drawLines,
  groupedBudgets,
  totals,
}: {
  budgets: Budget[]
  draws: DrawRequest[]
  drawLines: DrawLineWithBudget[]
  groupedBudgets: GroupedBudget[]
  totals: { totalBudget: number; totalSpent: number; remaining: number; percentUsed: number }
}) {
  return (
    <div className="space-y-6">
      {/* Row 1: Sankey Flow (Full Width) */}
      <SankeyChart budgets={budgets} draws={draws} totals={totals} />
      
      {/* Row 2: Utilization Bar + Velocity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryUtilizationChart groupedBudgets={groupedBudgets} />
        <SpendingVelocityChart draws={draws} totals={totals} />
      </div>
    </div>
  )
}

// Chart 1: Fund Flow Sankey
function SankeyChart({
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
      <div className="card-ios flex items-center justify-center" style={{ height: 350 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No draw data available for flow chart</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Draw funds to see the flow visualization</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-ios p-0" style={{ height: 380 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fund Flow</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Loan → Categories → Draws
        </p>
      </div>
      <div style={{ height: 320 }}>
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

// Chart 2: Category Utilization Bars
function CategoryUtilizationChart({
  groupedBudgets,
}: {
  groupedBudgets: GroupedBudget[]
}) {
  const chartData = useMemo(() => {
    return groupedBudgets
      .filter(g => g.totalBudget > 0)
      .map(g => ({
        category: g.category.length > 15 ? g.category.substring(0, 12) + '...' : g.category,
        fullCategory: g.category,
        spent: g.totalSpent,
        remaining: Math.max(0, g.totalBudget - g.totalSpent),
        percentUsed: g.totalBudget > 0 ? (g.totalSpent / g.totalBudget) * 100 : 0,
        isOverBudget: g.totalSpent > g.totalBudget,
      }))
      .sort((a, b) => b.percentUsed - a.percentUsed)
  }, [groupedBudgets])

  if (chartData.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 350 }}>
        <div className="text-center">
          <p style={{ color: 'var(--text-muted)' }}>No budget data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-ios p-0" style={{ height: 350 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Category Utilization</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Budget usage by NAHB category
        </p>
      </div>
      <div style={{ height: 290 }}>
        <ResponsiveBar
          data={chartData}
          keys={['spent', 'remaining']}
          indexBy="category"
          margin={{ top: 10, right: 20, bottom: 50, left: 100 }}
          padding={0.3}
          layout="horizontal"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={({ id, data }: { id: string; data: Record<string, unknown> }) => {
            if (id === 'spent') {
              const isOverBudget = data?.isOverBudget as boolean | undefined
              const percentUsed = data?.percentUsed as number | undefined
              if (isOverBudget) return 'var(--error)'
              if ((percentUsed ?? 0) > 80) return 'var(--warning)'
              return 'var(--accent)'
            }
            return 'var(--bg-hover)'
          }}
          borderRadius={2}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 5,
            format: (value) => `$${(Number(value) / 1000).toFixed(0)}k`,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
          }}
          enableLabel={false}
          tooltip={({ id, value, data }: { id: string; value: number; data: Record<string, unknown> }) => {
            const fullCategory = (data?.fullCategory as string) || 'Unknown'
            const isOverBudget = data?.isOverBudget as boolean | undefined
            const percentUsed = (data?.percentUsed as number) ?? 0
            return (
              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--elevation-2)',
                }}
              >
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {fullCategory}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {id === 'spent' ? 'Spent' : 'Remaining'}: {formatCurrency(value)}
                </div>
                <div className="text-xs" style={{ color: isOverBudget ? 'var(--error)' : 'var(--text-muted)' }}>
                  {percentUsed.toFixed(1)}% utilized
                </div>
              </div>
            )
          }}
          theme={{
            background: 'transparent',
            axis: {
              ticks: {
                text: { fill: 'var(--text-muted)', fontSize: 10 }
              },
            },
            grid: {
              line: { stroke: 'var(--border-subtle)', strokeDasharray: '4 4' }
            }
          }}
        />
      </div>
    </div>
  )
}

// Chart 3: Spending Velocity Timeline
function SpendingVelocityChart({
  draws,
  totals,
}: {
  draws: DrawRequest[]
  totals: { totalBudget: number; totalSpent: number }
}) {
  const chartData = useMemo(() => {
    // Get funded draws sorted by date
    const fundedDraws = draws
      .filter(d => d.status === 'funded' && d.funded_at)
      .sort((a, b) => new Date(a.funded_at!).getTime() - new Date(b.funded_at!).getTime())
    
    if (fundedDraws.length === 0) return []
    
    // Calculate cumulative spending
    let cumulative = 0
    const actualSpending = fundedDraws.map(draw => {
      cumulative += draw.total_amount || 0
      return {
        x: formatDate(draw.funded_at),
        y: cumulative,
      }
    })
    
    // Calculate expected linear burn rate
    const firstDate = new Date(fundedDraws[0].funded_at!)
    const lastDate = fundedDraws.length > 1 
      ? new Date(fundedDraws[fundedDraws.length - 1].funded_at!) 
      : new Date()
    const totalDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    const dailyBurnRate = totals.totalBudget / Math.max(totalDays, 180) // Assume 6 month project minimum
    
    const expectedBurn = fundedDraws.map((draw, idx) => {
      const daysSinceStart = (new Date(draw.funded_at!).getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      return {
        x: formatDate(draw.funded_at),
        y: dailyBurnRate * daysSinceStart,
      }
    })
    
    return [
      { id: 'Actual Spend', data: actualSpending },
      { id: 'Expected Pace', data: expectedBurn },
    ]
  }, [draws, totals.totalBudget])

  if (chartData.length === 0 || chartData[0].data.length === 0) {
    return (
      <div className="card-ios flex items-center justify-center" style={{ height: 350 }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>No spending history available</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Draw funds to see velocity chart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-ios p-0" style={{ height: 350 }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Spending Velocity</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Actual vs expected burn rate
        </p>
      </div>
      <div style={{ height: 290 }}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: -45,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value) => `$${(Number(value) / 1000).toFixed(0)}k`,
          }}
          enableGridX={false}
          enableGridY={true}
          colors={['var(--accent)', 'var(--text-muted)']}
          lineWidth={3}
          pointSize={8}
          pointColor={{ from: 'color' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          enableArea={true}
          areaOpacity={0.1}
          useMesh={true}
          legends={[
            {
              anchor: 'top-right',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: -15,
              itemsSpacing: 20,
              itemDirection: 'left-to-right',
              itemWidth: 100,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 10,
              symbolShape: 'circle',
            }
          ]}
          tooltip={({ point }) => (
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {point.serieId}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {point.data.xFormatted}: {formatCurrency(Number(point.data.y))}
              </div>
            </div>
          )}
          theme={{
            background: 'transparent',
            axis: {
              ticks: {
                text: { fill: 'var(--text-muted)', fontSize: 10 }
              },
            },
            grid: {
              line: { stroke: 'var(--border-subtle)', strokeDasharray: '4 4' }
            },
            legends: {
              text: { fill: 'var(--text-muted)', fontSize: 10 }
            }
          }}
        />
      </div>
    </div>
  )
}
