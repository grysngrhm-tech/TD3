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
  const glowIntensity = stressIntensity * 12

  const tasks = [
    { label: 'Categorize', baseAngle: 0 },
    { label: 'Match', baseAngle: 72 },
    { label: 'Verify', baseAngle: 144 },
    { label: 'Enter', baseAngle: 216 },
    { label: 'Report', baseAngle: 288 },
  ]

  // 12 tick marks for clock-like appearance
  const tickMarks = Array.from({ length: 12 }, (_, i) => i * 30)

  return (
    <div className={`relative w-full h-32 md:h-36 flex items-center justify-center gap-4 md:gap-6 ${className}`}>
      {/* Left side: Clock with external labels */}
      <div className="relative">
        {/* Task labels - positioned OUTSIDE the clock face */}
        {tasks.map((task, i) => {
          const rad = (task.baseAngle - 90) * (Math.PI / 180)
          // Radius 52px - clearly outside the ~40-48px clock radius
          const radius = 52
          const x = Math.cos(rad) * radius
          const y = Math.sin(rad) * radius

          // Which task is currently "active" based on rotation
          const normalizedRotation = (rotation % 360 + 360) % 360
          const isActive = Math.abs(normalizedRotation - task.baseAngle) < 36 ||
                          Math.abs(normalizedRotation - task.baseAngle + 360) < 36 ||
                          Math.abs(normalizedRotation - task.baseAngle - 360) < 36

          return (
            <motion.div
              key={task.label}
              className="absolute top-1/2 left-1/2 z-10"
              style={{
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                opacity: isActive ? 1 : 0.6 + stressIntensity * 0.2,
              }}
            >
              <span
                className="text-[9px] md:text-[10px] font-semibold whitespace-nowrap"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {task.label}
              </span>
            </motion.div>
          )
        })}

        {/* Clock face - slightly smaller to give room for external labels */}
        <motion.div
          className="relative w-20 h-20 md:w-24 md:h-24 rounded-full"
          style={{
            background: 'var(--bg-secondary)',
            border: '2px solid var(--border)',
            boxShadow: `inset 0 2px 6px rgba(0,0,0,0.08), var(--elevation-2)`,
          }}
        >
          {/* 12 tick marks around the clock edge for clock-like appearance */}
          {tickMarks.map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180)
            const outerRadius = 38 // md:46
            const innerRadius = i % 3 === 0 ? 32 : 34 // Longer ticks at 12, 3, 6, 9
            const x1 = Math.cos(rad) * innerRadius
            const y1 = Math.sin(rad) * innerRadius
            const x2 = Math.cos(rad) * outerRadius
            const y2 = Math.sin(rad) * outerRadius

            return (
              <div
                key={angle}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: 1.5,
                  height: i % 3 === 0 ? 6 : 4,
                  background: 'var(--border)',
                  transform: `translate(-50%, -50%) translate(${(x1 + x2) / 2}px, ${(y1 + y2) / 2}px) rotate(${angle}deg)`,
                  borderRadius: 1,
                }}
              />
            )
          })}

          {/* Clock hand - rotation driven purely by scroll */}
          <div
            className="absolute top-1/2 left-1/2 origin-bottom"
            style={{
              width: 2,
              height: 24,
              marginLeft: -1,
              marginTop: -24,
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

          {/* Stress indicator ring - contained within the clock */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -4,
              border: `2px solid var(--error)`,
              opacity: 0.5 + stressIntensity * 0.4,
              boxShadow: `0 0 ${glowIntensity * pulseAmount}px ${glowIntensity * 0.4 * pulseAmount}px var(--error)`,
            }}
          />
        </motion.div>
      </div>

      {/* Right side: Timer stats */}
      <div
        className="text-left"
        style={{ opacity: progress > 0.2 ? 1 : progress * 5 }}
      >
        <div
          className="font-mono text-lg md:text-xl font-bold leading-tight"
          style={{
            color: hoursWasted > 6 ? 'var(--error)' : 'var(--warning)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayHours}h {displayMinutes.toString().padStart(2, '0')}m
        </div>
        <div
          className="text-[10px] md:text-[11px] font-medium leading-tight mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          wasted on
        </div>
        <div
          className="text-[10px] md:text-[11px] font-medium leading-tight"
          style={{ color: 'var(--error)' }}
        >
          repetitive tasks
        </div>
      </div>
    </div>
  )
}

export default RepetitiveClock
