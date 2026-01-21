'use client'

import { motion } from 'framer-motion'

interface RepetitiveClockProps {
  progress?: number
  className?: string
}

export function RepetitiveClock({ progress = 0, className = '' }: RepetitiveClockProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past, effects keep intensifying

  // Clock rotation accelerates with progress (3+ full rotations)
  const rotation = progress * 1080

  // Hours accumulate with scroll - keeps growing past progress=1
  const hoursWasted = progress * 12
  const displayHours = Math.floor(hoursWasted)
  const displayMinutes = Math.floor((hoursWasted % 1) * 60)

  // Stress intensity increases with progress
  const stressIntensity = Math.min(1, progress * 1.5)

  // Glow pulsation for the stress ring (oscillates 0-1)
  const pulseAmount = Math.sin(progress * 15) * 0.5 + 0.5
  const glowIntensity = stressIntensity * 15

  const tasks = [
    { label: 'Categorize', baseAngle: 0 },
    { label: 'Match', baseAngle: 72 },
    { label: 'Verify', baseAngle: 144 },
    { label: 'Enter', baseAngle: 216 },
    { label: 'Report', baseAngle: 288 },
  ]

  return (
    <div className={`relative w-full h-32 md:h-36 flex items-center justify-center ${className}`}>
      {/* Clock face */}
      <motion.div
        className="relative w-24 h-24 md:w-28 md:h-28 rounded-full"
        style={{
          background: 'var(--bg-secondary)',
          border: '3px solid var(--border)',
          boxShadow: `inset 0 2px 8px rgba(0,0,0,0.1), var(--elevation-2)`,
        }}
      >
        {/* Task labels around the clock - grow in size instead of scattering */}
        {tasks.map((task, i) => {
          const rad = (task.baseAngle - 90) * (Math.PI / 180)
          // Fixed radius - labels stay in place
          const radius = 44
          const x = Math.cos(rad) * radius
          const y = Math.sin(rad) * radius

          // Which task is currently "active" based on rotation
          const normalizedRotation = (rotation % 360 + 360) % 360
          const isActive = Math.abs(normalizedRotation - task.baseAngle) < 36 ||
                          Math.abs(normalizedRotation - task.baseAngle + 360) < 36 ||
                          Math.abs(normalizedRotation - task.baseAngle - 360) < 36

          // Labels grow in font size with stress intensity
          const labelScale = 1 + stressIntensity * 0.4

          return (
            <motion.div
              key={task.label}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                opacity: isActive ? 1 : 0.5 + stressIntensity * 0.3,
              }}
            >
              <span
                className="text-[8px] md:text-[9px] font-medium whitespace-nowrap"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  transform: `scale(${isActive ? labelScale * 1.1 : labelScale})`,
                  display: 'inline-block',
                }}
              >
                {task.label}
              </span>
            </motion.div>
          )
        })}

        {/* Clock hand - rotation driven purely by scroll */}
        <div
          className="absolute top-1/2 left-1/2 origin-bottom"
          style={{
            width: 3,
            height: 28,
            marginLeft: -1.5,
            marginTop: -28,
            background: 'var(--accent)',
            borderRadius: 'var(--radius-xs)',
            transform: `rotate(${rotation}deg)`,
          }}
        />

        {/* Center dot */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{ background: 'var(--accent)' }}
        />

        {/* Stress indicator ring - fixed size with pulsing glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -6,
            border: `2px solid var(--error)`,
            opacity: 0.6 + stressIntensity * 0.4,
            boxShadow: `0 0 ${glowIntensity * pulseAmount}px ${glowIntensity * 0.5 * pulseAmount}px var(--error)`,
          }}
        />
      </motion.div>

      {/* Time counter - positioned clearly below */}
      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-center"
        style={{ opacity: progress > 0.2 ? 1 : progress * 5 }}
      >
        <div
          className="font-mono text-sm md:text-base font-semibold"
          style={{
            color: hoursWasted > 6 ? 'var(--error)' : 'var(--warning)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayHours}h {displayMinutes.toString().padStart(2, '0')}m
        </div>
        <div
          className="text-[9px] md:text-[10px] font-medium mt-0.5"
          style={{ color: 'var(--error)' }}
        >
          wasted on repetitive tasks
        </div>
      </motion.div>

      {/* Pulsing dots - pulse speed visual based on progress position */}
      <div className="absolute top-1 right-4 flex gap-1">
        {[...Array(Math.min(5, Math.ceil(progress * 5)))].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--error)',
              opacity: 0.4 + (stressIntensity * 0.4),
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default RepetitiveClock
