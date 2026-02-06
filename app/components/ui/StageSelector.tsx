'use client'

import { motion } from 'framer-motion'
import type { LifecycleStage } from '@/types/custom'

type StageSelectorProps = {
  value: LifecycleStage
  onChange: (stage: LifecycleStage) => void
  counts: { pending: number; active: number; historic: number }
}

const stages: { id: LifecycleStage; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'historic', label: 'Historic' },
]

/**
 * Segmented control for lifecycle stage selection
 * Used in the Portfolio Dashboard header
 */
export function StageSelector({ value, onChange, counts }: StageSelectorProps) {
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
          left: `calc(${stages.findIndex(s => s.id === value) * 33.333}% + 4px)`,
          width: 'calc(33.333% - 8px)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />

      {/* Segment buttons */}
      {stages.map((stage) => {
        const isSelected = value === stage.id
        const count = counts[stage.id]

        return (
          <motion.button
            key={stage.id}
            onClick={() => onChange(stage.id)}
            className="relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 font-medium transition-colors min-w-[120px] touch-target"
            style={{
              color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
            whileHover={{ color: 'var(--text-primary)' }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{stage.label}</span>
            {count > 0 && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-xs px-2 py-0.5 min-w-[22px] text-center font-semibold"
                style={{
                  background: isSelected ? 'var(--accent)' : 'var(--bg-hover)',
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
