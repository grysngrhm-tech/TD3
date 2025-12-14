'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type FilterOption = {
  id: string
  label: string
  count: number
}

type FilterSection = {
  id: string
  title: string
  options: FilterOption[]
  type: 'single' | 'multi'
}

type FilterSidebarProps = {
  sections: FilterSection[]
  selectedFilters: Record<string, string[]>
  onFilterChange: (sectionId: string, optionId: string) => void
  onClearAll: () => void
}

export function FilterSidebar({ sections, selectedFilters, onFilterChange, onClearAll }: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(sections.map(s => s.id))

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const hasActiveFilters = Object.values(selectedFilters).some(arr => arr.length > 0)

  return (
    <div className="sidebar w-64 flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Filter Sections */}
        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.id} className="rounded-ios-sm overflow-hidden" style={{ background: 'var(--bg-card)' }}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="accordion-trigger w-full"
              >
                <span className="font-medium text-sm">{section.title}</span>
                <motion.svg
                  animate={{ rotate: expandedSections.includes(section.id) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4"
                  style={{ color: 'var(--text-muted)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {expandedSections.includes(section.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-1">
                      {section.options.map((option) => {
                        const isSelected = selectedFilters[section.id]?.includes(option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => onFilterChange(section.id, option.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-ios-xs text-sm transition-all ${
                              isSelected ? 'font-medium' : ''
                            }`}
                            style={{ 
                              background: isSelected ? 'var(--accent-glow)' : 'transparent',
                              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)'
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {/* Radio/Checkbox indicator */}
                              <div 
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                                }`}
                              >
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: 'var(--accent)' }}
                                  />
                                )}
                              </div>
                              <span>{option.label}</span>
                            </div>
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ 
                                background: 'var(--bg-hover)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {option.count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
