'use client'

import { motion } from 'framer-motion'

export type ReportType = 'budget' | 'amortization' | 'payoff'

type ReportOption = {
  id: ReportType
  label: string
  icon?: React.ReactNode
}

type ReportToggleProps = {
  value: ReportType
  onChange: (type: ReportType) => void
  options?: ReportOption[]
}

const defaultOptions: ReportOption[] = [
  { 
    id: 'budget', 
    label: 'Budget',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    id: 'amortization', 
    label: 'Amortization',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'payoff', 
    label: 'Payoff',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
]

/**
 * iOS-style segmented control for switching between report types
 * Animated sliding indicator with Framer Motion
 */
export function ReportToggle({ value, onChange, options = defaultOptions }: ReportToggleProps) {
  const selectedIndex = options.findIndex(opt => opt.id === value)
  const segmentWidth = 100 / options.length

  return (
    <div 
      className="inline-flex p-1 relative"
      style={{ 
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {/* Animated background indicator */}
      <motion.div
        className="absolute top-1 bottom-1"
        style={{ 
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 8px var(--accent-glow)',
        }}
        initial={false}
        animate={{
          left: `calc(${selectedIndex * segmentWidth}% + 4px)`,
          width: `calc(${segmentWidth}% - 8px)`,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />

      {/* Segment buttons */}
      {options.map((option) => {
        const isSelected = value === option.id

        return (
          <motion.button
            key={option.id}
            onClick={() => onChange(option.id)}
            className="relative z-10 flex items-center justify-center gap-1.5 px-4 py-2.5 font-medium transition-colors min-w-[110px] touch-target"
            style={{
              color: isSelected ? 'white' : 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
            whileHover={!isSelected ? { color: 'var(--text-primary)' } : undefined}
            whileTap={{ scale: 0.98 }}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

