'use client'

import { motion } from 'framer-motion'

interface RepetitiveClockProps {
  progress?: number
  className?: string
}

export function RepetitiveClock({ progress = 0, className = '' }: RepetitiveClockProps) {
  // Tasks cycle endlessly
  const rotation = progress * 360 * 2

  const tasks = [
    { label: 'Categorize', angle: 0 },
    { label: 'Match', angle: 72 },
    { label: 'Verify', angle: 144 },
    { label: 'Enter', angle: 216 },
    { label: 'Report', angle: 288 },
  ]

  return (
    <div className={`relative w-full h-36 md:h-44 flex items-center justify-center ${className}`}>
      {/* Clock face - using TD3 design tokens */}
      <div
        className="relative w-36 h-36 md:w-44 md:h-44 rounded-full"
        style={{
          background: 'var(--bg-secondary)',
          border: '3px solid var(--border)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), var(--elevation-2)',
        }}
      >
        {/* Task labels around the clock */}
        {tasks.map((task) => {
          const rad = (task.angle - 90) * (Math.PI / 180)
          const x = Math.cos(rad) * 70
          const y = Math.sin(rad) * 70
          const isActive = Math.abs((rotation % 360) - task.angle) < 36 ||
                          Math.abs((rotation % 360) - task.angle + 360) < 36

          return (
            <motion.div
              key={task.label}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ x, y }}
              animate={{
                scale: isActive ? 1.1 : 1,
                opacity: isActive ? 1 : 0.5,
              }}
              transition={{ duration: 0.2 }}
            >
              <span
                className="text-[10px] md:text-xs font-medium whitespace-nowrap"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {task.label}
              </span>
            </motion.div>
          )
        })}

        {/* Clock hand - using accent color */}
        <motion.div
          className="absolute top-1/2 left-1/2 origin-bottom"
          style={{
            width: 3,
            height: 45,
            marginLeft: -1.5,
            marginTop: -45,
            background: 'var(--accent)',
            borderRadius: 'var(--radius-xs)',
          }}
          animate={{ rotate: rotation }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />

        {/* Center dot */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{ background: 'var(--accent)' }}
        />

        {/* Stress indicator ring - appears as progress increases */}
        <motion.div
          className="absolute -inset-2 rounded-full pointer-events-none"
          style={{
            border: '2px solid var(--error)',
            opacity: progress > 0.5 ? (progress - 0.5) * 0.6 : 0,
          }}
          animate={{
            scale: progress > 0.5 ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Repeating task indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--text-muted)' }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* "Hours wasted" indicator - error state */}
      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.6 ? 1 : 0 }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--error)' }}
        >
          ...repeat endlessly
        </span>
      </motion.div>

      {/* Time counter showing hours being wasted */}
      <motion.div
        className="absolute top-0 right-4 font-mono text-sm"
        style={{
          color: 'var(--warning)',
          fontVariantNumeric: 'tabular-nums',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.4 ? 1 : 0 }}
      >
        {Math.floor(progress * 8)}h {Math.floor((progress * 8 % 1) * 60)}m
      </motion.div>
    </div>
  )
}

export default RepetitiveClock
