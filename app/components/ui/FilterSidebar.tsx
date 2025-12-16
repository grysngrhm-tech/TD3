'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div className="sidebar w-64 flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Filters
          </h2>
          {hasActiveFilters && (
            <button 
              onClick={onClearAll}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Clear All
            </button>
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
          className="flex rounded-ios-sm p-1 mb-3"
          style={{ background: 'var(--bg-hover)' }}
        >
          {CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex-1 relative px-2 py-1.5 text-xs font-medium rounded-ios-xs transition-all ${
                activeCategory === category ? 'shadow-sm' : ''
              }`}
              style={{
                background: activeCategory === category ? 'var(--bg-card)' : 'transparent',
                color: activeCategory === category ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {CATEGORY_LABELS[category]}
              {/* Active filter indicator dot */}
              {hasFiltersInCategory(category) && activeCategory !== category && (
                <span 
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Filter Options List */}
        <div 
          className="flex-1 overflow-y-auto rounded-ios-sm"
          style={{ background: 'var(--bg-card)' }}
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
                  {currentOptions.map((option) => {
                    const isSelected = (selectedFilters[activeCategory] || []).includes(option.id)
                    const isDisabled = option.disabled && !isSelected
                    return (
                      <button
                        key={option.id}
                        onClick={() => !isDisabled && onFilterChange(activeCategory, option.id)}
                        disabled={isDisabled}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-ios-xs text-sm transition-all ${
                          isSelected ? 'font-medium' : ''
                        } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                          {/* Checkbox indicator */}
                          <div 
                            className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                              isSelected 
                                ? 'border-[var(--accent)] bg-[var(--accent)]' 
                                : isDisabled
                                  ? 'border-[var(--border-subtle)]'
                                  : 'border-[var(--border)]'
                            }`}
                          >
                            {isSelected && (
                              <motion.svg
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </motion.svg>
                            )}
                          </div>
                          <span className="truncate">{option.label}</span>
                        </div>
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2"
                          style={{ 
                            background: isDisabled ? 'transparent' : 'var(--bg-hover)',
                            color: 'var(--text-muted)',
                            border: isDisabled ? '1px solid var(--border-subtle)' : 'none',
                          }}
                        >
                          {option.count}
                        </span>
                      </button>
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
            className="mt-2 w-full py-2 text-xs font-medium rounded-ios-sm transition-colors"
            style={{ 
              background: 'var(--bg-card)',
              color: 'var(--text-muted)'
            }}
          >
            Clear {CATEGORY_LABELS[activeCategory]} Filter
          </motion.button>
        )}
      </div>
    </div>
  )
}
