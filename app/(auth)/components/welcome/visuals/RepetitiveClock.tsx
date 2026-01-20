'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface RepetitiveClockProps {
  progress?: number
  className?: string
}

export function RepetitiveClock({ progress = 0, className = '' }: RepetitiveClockProps) {
  // Continuous rotation that never stops
  const [rotation, setRotation] = useState(0)
  const [hoursWasted, setHoursWasted] = useState(0)
  const isVisible = useRef(false)

  // Track visibility and continue animation while visible
  useEffect(() => {
    isVisible.current = progress > 0.1

    const interval = setInterval(() => {
      if (isVisible.current) {
        setRotation(r => r + 3) // Continuous rotation
        setHoursWasted(h => h + 0.02) // Hours keep accumulating
      }
    }, 50)

    return () => clearInterval(interval)
  }, [progress])

  // Update visibility when progress changes
  useEffect(() => {
    isVisible.current = progress > 0.1
  }, [progress])

  const tasks = [
    { label: 'Categorize', angle: 0 },
    { label: 'Match', angle: 72 },
    { label: 'Verify', angle: 144 },
    { label: 'Enter', angle: 216 },
    { label: 'Report', angle: 288 },
  ]

  // Format hours display
  const displayHours = Math.floor(hoursWasted)
  const displayMinutes = Math.floor((hoursWasted % 1) * 60)

  return (
    <div className={`relative w-full h-32 md:h-36 flex items-center justify-center ${className}`}>
      {/* Clock face */}
      <div
        className="relative w-28 h-28 md:w-32 md:h-32 rounded-full"
        style={{
          background: 'var(--bg-secondary)',
          border: '3px solid var(--border)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), var(--elevation-2)',
        }}
      >
        {/* Task labels around the clock */}
        {tasks.map((task) => {
          const rad = (task.angle - 90) * (Math.PI / 180)
          const x = Math.cos(rad) * 52
          const y = Math.sin(rad) * 52
          const isActive = Math.abs((rotation % 360) - task.angle) < 36 ||
                          Math.abs((rotation % 360) - task.angle + 360) < 36

          return (
            <motion.div
              key={task.label}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ x, y }}
              animate={{
                scale: isActive ? 1.15 : 1,
                opacity: isActive ? 1 : 0.5,
              }}
              transition={{ duration: 0.15 }}
            >
              <span
                className="text-[9px] md:text-[10px] font-medium whitespace-nowrap"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {task.label}
              </span>
            </motion.div>
          )
        })}

        {/* Clock hand - continuously spinning */}
        <div
          className="absolute top-1/2 left-1/2 origin-bottom"
          style={{
            width: 3,
            height: 32,
            marginLeft: -1.5,
            marginTop: -32,
            background: 'var(--accent)',
            borderRadius: 'var(--radius-xs)',
            transform: `rotate(${rotation}deg)`,
          }}
        />

        {/* Center dot */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />

        {/* Stress indicator ring - pulses as hours accumulate */}
        <motion.div
          className="absolute -inset-2 rounded-full pointer-events-none"
          style={{
            border: '2px solid var(--error)',
            opacity: Math.min(0.6, hoursWasted * 0.1),
          }}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: Math.max(0.5, 2 - hoursWasted * 0.1),
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Repeating task indicators - pulse faster as time goes on */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
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
              duration: Math.max(0.5, 1.5 - hoursWasted * 0.05),
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      {/* "Repeat endlessly" text */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.5 ? 1 : 0 }}
      >
        <span
          className="text-[10px] font-medium"
          style={{ color: 'var(--error)' }}
        >
          ...repeat endlessly
        </span>
      </motion.div>

      {/* Time counter - keeps incrementing while visible */}
      <motion.div
        className="absolute top-0 right-2 font-mono text-xs"
        style={{
          color: hoursWasted > 4 ? 'var(--error)' : 'var(--warning)',
          fontVariantNumeric: 'tabular-nums',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.3 ? 1 : 0 }}
      >
        <motion.span
          animate={{ scale: hoursWasted > 4 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.5, repeat: hoursWasted > 4 ? Infinity : 0 }}
        >
          {displayHours}h {displayMinutes.toString().padStart(2, '0')}m wasted
        </motion.span>
      </motion.div>
    </div>
  )
}

export default RepetitiveClock
