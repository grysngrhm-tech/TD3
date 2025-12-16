'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type FilterOption = {
  id: string
  label: string
  count: number
  disabled?: boolean
}

type SummaryStats = {
  pendingReview: number
  stagedDraws: number
  pendingWires: number
  totalPendingAmount: number
  stagedAmount: number
  pendingWireAmount: number
}

type DrawFilterSidebarProps = {
  builderFilters: FilterOption[]
  selectedBuilders: string[]
  onBuilderFilterChange: (builderId: string) => void
  onClearBuilders: () => void
  summaryStats: SummaryStats
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DrawFilterSidebar({
  builderFilters,
  selectedBuilders,
  onBuilderFilterChange,
  onClearBuilders,
  summaryStats,
}: DrawFilterSidebarProps) {
  
  // Sort builders: selected first, then by count desc, then disabled
  const sortedBuilders = useMemo(() => {
    return [...builderFilters].sort((a, b) => {
      const aSelected = selectedBuilders.includes(a.id)
      const bSelected = selectedBuilders.includes(b.id)
      
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      
      if (!a.disabled && b.disabled) return -1
      if (a.disabled && !b.disabled) return 1
      
      if (!a.disabled && !b.disabled) {
        return b.count - a.count
      }
      
      return a.label.localeCompare(b.label)
    })
  }, [builderFilters, selectedBuilders])

  const hasBuilderFilters = selectedBuilders.length > 0
  const enabledCount = sortedBuilders.filter(b => !b.disabled).length

  return (
    <div 
      className="w-64 flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 border-l"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Filters
          </h2>
          {hasBuilderFilters && (
            <button 
              onClick={onClearBuilders}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Builder Filter List */}
        <div className="mb-4">
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Builder
          </div>
          <div 
            className="rounded-ios-sm overflow-hidden max-h-64 overflow-y-auto"
            style={{ background: 'var(--bg-card)' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key="builder-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-2 space-y-0.5"
              >
                {sortedBuilders.length === 0 ? (
                  <div className="py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No builders available
                  </div>
                ) : (
                  <>
                    {enabledCount < sortedBuilders.length && (
                      <div className="px-2 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {enabledCount} of {sortedBuilders.length} with draws
                      </div>
                    )}
                    {sortedBuilders.map((builder) => {
                      const isSelected = selectedBuilders.includes(builder.id)
                      const isDisabled = builder.disabled && !isSelected
                      return (
                        <button
                          key={builder.id}
                          onClick={() => !isDisabled && onBuilderFilterChange(builder.id)}
                          disabled={isDisabled}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-ios-xs text-xs transition-all ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          style={{ 
                            background: isSelected ? 'var(--accent-glow)' : 'transparent',
                            color: isDisabled 
                              ? 'var(--text-muted)' 
                              : isSelected 
                                ? 'var(--accent)' 
                                : 'var(--text-secondary)',
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className={`w-3 h-3 rounded-sm flex-shrink-0 flex items-center justify-center border transition-all ${
                                isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="truncate">{builder.label}</span>
                          </div>
                          <span 
                            className="text-xs px-1 py-0.5 rounded flex-shrink-0 ml-1"
                            style={{ 
                              background: isDisabled ? 'transparent' : 'var(--bg-hover)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {builder.count}
                          </span>
                        </button>
                      )
                    })}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Summary Card */}
        <div 
          className="rounded-ios-sm p-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            Summary
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-muted)' }}>Pending Review</dt>
              <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {summaryStats.pendingReview}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-muted)' }}>Staged Draws</dt>
              <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {summaryStats.stagedDraws}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: 'var(--text-muted)' }}>Pending Wires</dt>
              <dd className="font-medium" style={{ color: 'var(--warning)' }}>
                {summaryStats.pendingWires}
              </dd>
            </div>
            <div 
              className="pt-2 mt-2 flex justify-between border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <dt className="font-medium" style={{ color: 'var(--text-primary)' }}>Total Pending</dt>
              <dd className="font-bold" style={{ color: 'var(--accent)' }}>
                {formatCurrency(summaryStats.totalPendingAmount)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
