'use client'

import { motion } from 'framer-motion'
import type { LifecycleStage } from '@/types/database'

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

export function StageSelector({ value, onChange, counts }: StageSelectorProps) {
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
          <button
            key={stage.id}
            onClick={() => onChange(stage.id)}
            className="relative z-10 flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium transition-colors min-w-[120px]"
            style={{
              color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <span>{stage.label}</span>
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
