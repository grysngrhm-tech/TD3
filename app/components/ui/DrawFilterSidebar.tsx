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

/**
 * Right-side filter sidebar for Draw Dashboard
 * Mirrors the Portfolio Dashboard's FilterSidebar layout
 */
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
      className="flex-shrink-0 sticky flex flex-col"
      style={{ 
        width: 'var(--sidebar-width)',
        height: 'calc(100vh - var(--header-height))',
        top: 'var(--header-height)',
        background: 'var(--bg-secondary)', 
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-xs font-semibold uppercase tracking-wider" 
            style={{ color: 'var(--text-muted)' }}
          >
            Filters
          </h2>
          {hasBuilderFilters && (
            <motion.button 
              onClick={onClearBuilders}
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
              whileHover={{ opacity: 0.8 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear
            </motion.button>
          )}
        </div>

        {/* Builder Filter List */}
        <div className="flex-1 min-h-0">
          <div 
            className="text-xs font-medium uppercase tracking-wider mb-2" 
            style={{ color: 'var(--text-muted)' }}
          >
            Builder
          </div>
          <div 
            className="overflow-hidden overflow-y-auto"
            style={{ 
              background: 'var(--bg-card)', 
              maxHeight: 'calc(100% - 24px)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key="builder-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-2 space-y-0.5"
              >
                {sortedBuilders.length === 0 ? (
                  <div 
                    className="py-6 text-center text-xs" 
                    style={{ color: 'var(--text-muted)' }}
                  >
                    No builders available
                  </div>
                ) : (
                  <>
                    {enabledCount < sortedBuilders.length && (
                      <div 
                        className="px-2 py-1.5 text-xs" 
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {enabledCount} of {sortedBuilders.length} with draws
                      </div>
                    )}
                    {sortedBuilders.map((builder, index) => {
                      const isSelected = selectedBuilders.includes(builder.id)
                      const isDisabled = builder.disabled && !isSelected
                      return (
                        <motion.button
                          key={builder.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.15 }}
                          onClick={() => !isDisabled && onBuilderFilterChange(builder.id)}
                          disabled={isDisabled}
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs transition-all touch-target ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          style={{ 
                            background: isSelected ? 'var(--accent-muted)' : 'transparent',
                            color: isDisabled 
                              ? 'var(--text-disabled)' 
                              : isSelected 
                                ? 'var(--accent)' 
                                : 'var(--text-secondary)',
                            opacity: isDisabled ? 0.5 : 1,
                            borderRadius: 'var(--radius-sm)',
                          }}
                          whileHover={!isDisabled ? { 
                            backgroundColor: isSelected ? 'var(--accent-muted)' : 'var(--bg-hover)' 
                          } : undefined}
                          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox */}
                            <div 
                              className="w-4 h-4 flex-shrink-0 flex items-center justify-center transition-all"
                              style={{ 
                                borderRadius: 'var(--radius-xs)',
                                border: isSelected 
                                  ? '2px solid var(--accent)' 
                                  : '2px solid var(--border)',
                                background: isSelected ? 'var(--accent)' : 'transparent',
                              }}
                            >
                              {isSelected && (
                                <motion.svg 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-2.5 h-2.5" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="white"
                                  strokeWidth={3}
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M5 13l4 4L19 7" 
                                  />
                                </motion.svg>
                              )}
                            </div>
                            <span className="truncate">{builder.label}</span>
                          </div>
                          
                          {/* Count badge */}
                          <span 
                            className="text-xs px-1.5 py-0.5 flex-shrink-0 ml-1 font-medium"
                            style={{ 
                              background: isDisabled ? 'transparent' : 'var(--bg-hover)',
                              color: 'var(--text-muted)',
                              borderRadius: 'var(--radius-full)',
                              border: isDisabled ? '1px solid var(--border-subtle)' : 'none',
                            }}
                          >
                            {builder.count}
                          </span>
                        </motion.button>
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
