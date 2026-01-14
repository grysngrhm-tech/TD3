'use client'

import { motion } from 'framer-motion'

export type DrawStatus = 'all' | 'review' | 'staged' | 'pending_wire'

type DrawStatusSelectorProps = {
  value: DrawStatus
  onChange: (status: DrawStatus) => void
  counts: { all: number; review: number; staged: number; pending_wire: number }
}

const statuses: { id: DrawStatus; label: string; color?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'review', label: 'Pending', color: 'var(--warning)' },
  { id: 'staged', label: 'Staged', color: 'var(--info)' },
  { id: 'pending_wire', label: 'Wire', color: 'var(--purple)' },
]

/**
 * Segmented control for draw status selection
 * Used in the Draw Dashboard header
 * Features status-specific colors for each segment
 */
export function DrawStatusSelector({ value, onChange, counts }: DrawStatusSelectorProps) {
  const selectedIndex = statuses.findIndex(s => s.id === value)
  const selectedStatus = statuses.find(s => s.id === value)
  
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
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--elevation-1)',
        }}
        initial={false}
        animate={{
          left: `calc(${selectedIndex * 25}% + 4px)`,
          width: 'calc(25% - 8px)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />

      {/* Segment buttons */}
      {statuses.map((status) => {
        const isSelected = value === status.id
        const count = counts[status.id]

        return (
          <motion.button
            key={status.id}
            onClick={() => onChange(status.id)}
            className="relative z-10 flex items-center justify-center gap-2 px-5 py-2.5 font-medium transition-colors min-w-[90px] touch-target"
            style={{
              color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
            whileHover={{ color: 'var(--text-primary)' }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{status.label}</span>
            {count > 0 && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-xs px-2 py-0.5 min-w-[22px] text-center font-semibold"
                style={{
                  background: isSelected && status.color ? status.color : isSelected ? 'var(--accent)' : 'var(--bg-hover)',
                  color: isSelected ? 'white' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {count}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

