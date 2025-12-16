'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

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

// Quick Link component
function QuickLink({ href, icon, label }: { href: string; icon: 'list' | 'dollar' | 'chart' | 'building'; label: string }) {
  const icons = {
    list: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    dollar: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    chart: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    building: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-ios-xs text-sm transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{icons[icon]}</span>
      <span>{label}</span>
    </Link>
  )
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

        {/* Quick Links Section */}
        <div 
          className="rounded-ios-sm p-3 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h3 
            className="text-xs font-semibold uppercase tracking-wide mb-3 px-1" 
            style={{ color: 'var(--text-muted)' }}
          >
            Quick Links
          </h3>
          <nav className="space-y-1">
            <QuickLink href="/draws" icon="list" label="All Draws" />
            <QuickLink href="/budgets" icon="dollar" label="Budgets" />
            <QuickLink href="/reports" icon="chart" label="Reports" />
            <QuickLink href="/projects" icon="building" label="All Projects" />
          </nav>
        </div>
      </div>
    </div>
  )
}
