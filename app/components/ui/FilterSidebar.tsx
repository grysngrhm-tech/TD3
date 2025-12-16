'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuickLinksPopup } from './QuickLinksPopup'

type FilterOption = {
  id: string
  label: string
  count: number
  disabled?: boolean
}

type FilterCategory = 'builder' | 'subdivision' | 'lender'

type FilterSections = {
  builder: FilterOption[]
  subdivision: FilterOption[]
  lender: FilterOption[]
}

type FilterSidebarProps = {
  sections: FilterSections
  selectedFilters: Record<string, string[]>
  onFilterChange: (sectionId: string, optionId: string) => void
  onClearAll: () => void
  onClearSection: (sectionId: string) => void
}

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  builder: 'Builder',
  subdivision: 'Subdivision',
  lender: 'Lender',
}

const CATEGORY_ORDER: FilterCategory[] = ['builder', 'subdivision', 'lender']

export function FilterSidebar({ 
  sections, 
  selectedFilters, 
  onFilterChange, 
  onClearAll,
  onClearSection 
}: FilterSidebarProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('builder')

  // Get active filter chips to display
  const activeChips = useMemo(() => {
    const chips: { category: FilterCategory; id: string; label: string }[] = []
    
    for (const category of CATEGORY_ORDER) {
      const selected = selectedFilters[category] || []
      const options = sections[category] || []
      
      for (const id of selected) {
        const option = options.find(o => o.id === id)
        if (option) {
          chips.push({ category, id, label: option.label })
        }
      }
    }
    
    return chips
  }, [selectedFilters, sections])

  const hasActiveFilters = activeChips.length > 0

  // Check if a category has active filters (for indicator dot)
  const hasFiltersInCategory = (category: FilterCategory) => {
    return (selectedFilters[category] || []).length > 0
  }

  // Sort options: selected first, then enabled by count (desc), then disabled (alphabetically)
  const currentOptions = useMemo(() => {
    const options = sections[activeCategory] || []
    const selected = selectedFilters[activeCategory] || []
    
    return [...options].sort((a, b) => {
      const aSelected = selected.includes(a.id)
      const bSelected = selected.includes(b.id)
      
      // Selected items first
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      
      // Then enabled items (by count descending)
      if (!a.disabled && b.disabled) return -1
      if (a.disabled && !b.disabled) return 1
      
      // Within enabled: sort by count descending
      if (!a.disabled && !b.disabled) {
        return b.count - a.count
      }
      
      // Within disabled: sort alphabetically
      if (a.disabled && b.disabled) {
        return a.label.localeCompare(b.label)
      }
      
      return 0
    })
  }, [sections, activeCategory, selectedFilters])

  // Count enabled vs total options for context
  const enabledCount = currentOptions.filter(o => !o.disabled).length
  const totalCount = currentOptions.length

  return (
    <div 
      className="flex-shrink-0 sticky flex flex-col"
      style={{ 
        width: 'var(--sidebar-width)',
        height: 'calc(100vh - var(--header-height))',
        top: 'var(--header-height)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 
            className="text-xs font-semibold uppercase tracking-wider" 
            style={{ color: 'var(--text-muted)' }}
          >
            Filters
          </h2>
          {hasActiveFilters && (
            <motion.button 
              onClick={onClearAll}
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
              whileHover={{ opacity: 0.8 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear All
            </motion.button>
          )}
        </div>

        {/* Active Filter Chips */}
        <AnimatePresence>
          {activeChips.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5">
                {activeChips.map((chip) => (
                  <motion.button
                    key={`${chip.category}-${chip.id}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => onFilterChange(chip.category, chip.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                    style={{ 
                      background: 'var(--accent-glow)', 
                      color: 'var(--accent)' 
                    }}
                  >
                    <span className="truncate max-w-[120px]">{chip.label}</span>
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Toggle */}
        <div 
          className="flex p-1 mb-3"
          style={{ 
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {CATEGORY_ORDER.map((category) => (
            <motion.button
              key={category}
              onClick={() => setActiveCategory(category)}
              className="flex-1 relative px-2 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: activeCategory === category ? 'var(--bg-card)' : 'transparent',
                color: activeCategory === category ? 'var(--text-primary)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: activeCategory === category ? 'var(--elevation-1)' : 'none',
              }}
              whileHover={{ color: 'var(--text-primary)' }}
              whileTap={{ scale: 0.98 }}
            >
              {CATEGORY_LABELS[category]}
              {/* Active filter indicator dot */}
              {hasFiltersInCategory(category) && activeCategory !== category && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-1.5 h-1.5"
                  style={{ 
                    background: 'var(--accent)',
                    borderRadius: 'var(--radius-full)',
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Filter Options List */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="p-2"
            >
              {currentOptions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    No {CATEGORY_LABELS[activeCategory].toLowerCase()}s available
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {/* Context: showing X of Y */}
                  {enabledCount < totalCount && (
                    <div className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {enabledCount} of {totalCount} with matches
                    </div>
                  )}
                  {currentOptions.map((option, index) => {
                    const isSelected = (selectedFilters[activeCategory] || []).includes(option.id)
                    const isDisabled = option.disabled && !isSelected
                    return (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.15 }}
                        onClick={() => !isDisabled && onFilterChange(activeCategory, option.id)}
                        disabled={isDisabled}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-all touch-target ${
                          isSelected ? 'font-medium' : ''
                        } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                          {/* Checkbox indicator */}
                          <div 
                            className="w-4 h-4 flex-shrink-0 flex items-center justify-center transition-all"
                            style={{ 
                              borderRadius: 'var(--radius-xs)',
                              border: isSelected 
                                ? '2px solid var(--accent)' 
                                : isDisabled
                                  ? '2px solid var(--border-subtle)'
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </motion.svg>
                            )}
                          </div>
                          <span className="truncate">{option.label}</span>
                        </div>
                        <span 
                          className="text-xs px-1.5 py-0.5 flex-shrink-0 ml-2 font-medium"
                          style={{ 
                            background: isDisabled ? 'transparent' : 'var(--bg-hover)',
                            color: 'var(--text-muted)',
                            borderRadius: 'var(--radius-full)',
                            border: isDisabled ? '1px solid var(--border-subtle)' : 'none',
                          }}
                        >
                          {option.count}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Clear Section Button */}
        {hasFiltersInCategory(activeCategory) && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onClearSection(activeCategory)}
            className="mt-2 w-full py-2 text-xs font-medium transition-colors touch-target"
            style={{ 
              background: 'var(--bg-card)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
            whileHover={{ 
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            Clear {CATEGORY_LABELS[activeCategory]} Filter
          </motion.button>
        )}
      </div>
      
      {/* Quick Links Popup */}
      <QuickLinksPopup variant="portfolio" />
    </div>
  )
}
