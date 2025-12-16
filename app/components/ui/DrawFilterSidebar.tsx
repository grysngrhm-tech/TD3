'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuickLinksPopup } from './QuickLinksPopup'

type FilterOption = {
  id: string
  label: string
  count: number
  disabled?: boolean
}

type DrawFilterSidebarProps = {
  builderFilters: FilterOption[]
  selectedBuilders: string[]
  onBuilderFilterChange: (builderId: string) => void
  onClearBuilders: () => void
}

export function DrawFilterSidebar({
  builderFilters,
  selectedBuilders,
  onBuilderFilterChange,
  onClearBuilders,
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
      className="w-64 flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 border-l flex flex-col"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <div className="p-4 flex flex-col flex-1 min-h-0">
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
        <div className="flex-1 min-h-0">
          <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Builder
          </div>
          <div 
            className="rounded-ios-sm overflow-hidden overflow-y-auto"
            style={{ background: 'var(--bg-card)', maxHeight: 'calc(100% - 24px)' }}
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
      </div>
      
      {/* Quick Links Popup */}
      <QuickLinksPopup variant="draw" />
    </div>
  )
}
