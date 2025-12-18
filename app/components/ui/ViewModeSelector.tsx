'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export type ViewMode = 'table' | 'chart'

type ViewModeOption = {
  id: ViewMode
  label: string
  icon: React.ReactNode
}

type ViewModeSelectorProps = {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  storageKey?: string // Optional localStorage key to persist preference
}

const viewModeOptions: ViewModeOption[] = [
  {
    id: 'table',
    label: 'Table',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'chart',
    label: 'Charts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

/**
 * Icon-based toggle for switching between Table/Charts view modes
 * Persists preference to localStorage when storageKey is provided
 */
export function ViewModeSelector({ value, onChange, storageKey }: ViewModeSelectorProps) {
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount, migrate old 'cards' value to 'table'
  useEffect(() => {
    setMounted(true)
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      // Migrate legacy 'cards' value to 'table'
      if (saved === 'cards') {
        localStorage.setItem(storageKey, 'table')
        onChange('table')
      } else if (saved && ['table', 'chart'].includes(saved)) {
        onChange(saved as ViewMode)
      }
    }
  }, [storageKey, onChange])

  // Save to localStorage on change
  useEffect(() => {
    if (mounted && storageKey) {
      localStorage.setItem(storageKey, value)
    }
  }, [value, storageKey, mounted])

  return (
    <div 
      className="inline-flex p-1 gap-0.5"
      style={{ 
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {viewModeOptions.map((option) => {
        const isSelected = value === option.id

        return (
          <motion.button
            key={option.id}
            onClick={() => onChange(option.id)}
            className="relative flex items-center justify-center p-2 rounded-md transition-colors touch-target"
            style={{
              background: isSelected ? 'var(--accent)' : 'transparent',
              color: isSelected ? 'white' : 'var(--text-muted)',
            }}
            whileHover={!isSelected ? { 
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)' 
            } : undefined}
            whileTap={{ scale: 0.95 }}
            title={option.label}
            aria-label={`View as ${option.label}`}
          >
            {option.icon}
          </motion.button>
        )
      })}
    </div>
  )
}

