'use client'

import { motion } from 'framer-motion'

type DrawStatus = 'all' | 'review' | 'staged' | 'pending_wire'

type DrawStatusSelectorProps = {
  value: DrawStatus
  onChange: (status: DrawStatus) => void
  counts: { all: number; review: number; staged: number; pending_wire: number }
}

const statuses: { id: DrawStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'review', label: 'Pending' },
  { id: 'staged', label: 'Staged' },
  { id: 'pending_wire', label: 'Wire' },
]

export function DrawStatusSelector({ value, onChange, counts }: DrawStatusSelectorProps) {
  const selectedIndex = statuses.findIndex(s => s.id === value)
  
  return (
    <div 
      className="inline-flex p-1 rounded-ios-sm relative"
      style={{ background: 'var(--bg-card)' }}
    >
      {/* Animated background indicator */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-ios-xs"
        style={{ background: 'var(--bg-secondary)' }}
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
          <button
            key={status.id}
            onClick={() => onChange(status.id)}
            className="relative z-10 flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium transition-colors min-w-[90px]"
            style={{
              color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <span>{status.label}</span>
            {count > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                style={{
                  background: isSelected ? 'var(--accent)' : 'var(--bg-hover)',
                  color: isSelected ? 'white' : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

