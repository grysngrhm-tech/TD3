'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface RepetitiveClockProps {
  progress?: number
  className?: string
}

export function RepetitiveClock({ progress = 0, className = '' }: RepetitiveClockProps) {
  // Detect mobile for simplified rendering
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
  const glowIntensity = stressIntensity * 10

  const tasks = [
    { label: 'Categorize', baseAngle: 0 },
    { label: 'Match', baseAngle: 72 },
    { label: 'Verify', baseAngle: 144 },
    { label: 'Enter', baseAngle: 216 },
    { label: 'Report', baseAngle: 288 },
  ]

  // 12 tick marks for clock-like appearance
  const tickMarks = Array.from({ length: 12 }, (_, i) => i * 30)

  // Clock dimensions
  const clockSize = { base: 64, md: 72 } // w-16/w-18 equivalent
  const mobileClockSize = 56 // Smaller clock for mobile
  const labelRadius = 72 // Much further out - clear separation from clock

  // Mobile layout: vertical stack with clock face and timer below
  if (isMobile) {
    return (
      <div className={`flex flex-col items-center gap-2 h-44 ${className}`}>
        {/* Clock face only - no orbital labels */}
        <div
          className="relative rounded-full flex-shrink-0"
          style={{
            width: mobileClockSize,
            height: mobileClockSize,
            background: 'var(--bg-secondary)',
            border: '2px solid var(--border)',
            boxShadow: `inset 0 2px 6px rgba(0,0,0,0.08), var(--elevation-2)`,
          }}
        >
          {/* 12 tick marks around the clock edge */}
          {tickMarks.map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180)
            const tickRadius = mobileClockSize / 2 - 5
            const tickLength = i % 3 === 0 ? 4 : 2
            const tickX = Math.cos(rad) * (tickRadius - tickLength / 2)
            const tickY = Math.sin(rad) * (tickRadius - tickLength / 2)

            return (
              <div
                key={angle}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: 1.5,
                  height: tickLength,
                  background: i % 3 === 0 ? 'var(--text-muted)' : 'var(--border)',
                  transform: `translate(-50%, -50%) translate(${tickX}px, ${tickY}px) rotate(${angle}deg)`,
                  borderRadius: 1,
                }}
              />
            )
          })}

          {/* Clock hand */}
          <div
            className="absolute top-1/2 left-1/2 origin-bottom"
            style={{
              width: 2,
              height: mobileClockSize / 2 - 8,
              marginLeft: -1,
              marginTop: -(mobileClockSize / 2 - 8),
              background: 'var(--accent)',
              borderRadius: 'var(--radius-xs)',
              transform: `rotate(${rotation}deg)`,
            }}
          />

          {/* Second hand */}
          <div
            className="absolute top-1/2 left-1/2 origin-bottom"
            style={{
              width: 1,
              height: mobileClockSize / 2 - 12,
              marginLeft: -0.5,
              marginTop: -(mobileClockSize / 2 - 12),
              background: 'var(--error)',
              borderRadius: 'var(--radius-xs)',
              transform: `rotate(${rotation * 3}deg)`,
              opacity: 0.8,
            }}
          />

          {/* Center dot */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />

          {/* Stress indicator ring */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -2,
              border: `2px solid var(--error)`,
              opacity: 0.4 + stressIntensity * 0.4,
              boxShadow: `0 0 ${glowIntensity * pulseAmount * 0.5}px ${glowIntensity * 0.15 * pulseAmount}px var(--error)`,
            }}
          />
        </div>

        {/* Timer text below */}
        <div className="text-center">
          <div
            className="font-mono text-base font-bold"
            style={{
              color: hoursWasted > 6 ? 'var(--error)' : 'var(--warning)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayHours}h {displayMinutes.toString().padStart(2, '0')}m
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            wasted weekly
          </div>
        </div>
      </div>
    )
  }

  // Desktop layout: clock with orbital labels + timer stats
  return (
    <div className={`relative w-full h-44 sm:h-52 md:h-64 flex items-center justify-center gap-6 md:gap-8 ${className}`}>
      {/* Left side: Clock with well-separated labels */}
      <div className="relative flex items-center justify-center" style={{ width: labelRadius * 2 + 40, height: labelRadius * 2 + 20 }}>
        {/* Task labels - positioned FAR outside the clock face with connecting lines */}
        {tasks.map((task, i) => {
          const rad = (task.baseAngle - 90) * (Math.PI / 180)
          const x = Math.cos(rad) * labelRadius
          const y = Math.sin(rad) * labelRadius

          // Line connection points (from clock edge to label)
          const clockEdgeRadius = 36
          const lineStartX = Math.cos(rad) * clockEdgeRadius
          const lineStartY = Math.sin(rad) * clockEdgeRadius
          const lineEndX = Math.cos(rad) * (labelRadius - 8)
          const lineEndY = Math.sin(rad) * (labelRadius - 8)

          // Which task is currently "active" based on rotation
          const normalizedRotation = (rotation % 360 + 360) % 360
          const isActive = Math.abs(normalizedRotation - task.baseAngle) < 36 ||
                          Math.abs(normalizedRotation - task.baseAngle + 360) < 36 ||
                          Math.abs(normalizedRotation - task.baseAngle - 360) < 36

          return (
            <div key={task.label}>
              {/* Connecting line from clock to label */}
              <svg
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: labelRadius * 2,
                  height: labelRadius * 2,
                  transform: 'translate(-50%, -50%)',
                  overflow: 'visible',
                }}
              >
                <line
                  x1={labelRadius + lineStartX}
                  y1={labelRadius + lineStartY}
                  x2={labelRadius + lineEndX}
                  y2={labelRadius + lineEndY}
                  stroke={isActive ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={isActive ? 1.5 : 1}
                  strokeDasharray={isActive ? 'none' : '2 2'}
                  opacity={isActive ? 0.8 : 0.4}
                />
              </svg>

              {/* Label */}
              <motion.div
                className="absolute top-1/2 left-1/2 z-10"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                }}
              >
                <span
                  className="text-[10px] md:text-[11px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                    opacity: isActive ? 1 : 0.7 + stressIntensity * 0.2,
                  }}
                >
                  {task.label}
                </span>
              </motion.div>
            </div>
          )
        })}

        {/* Clock face - compact and clean */}
        <motion.div
          className="relative w-16 h-16 md:w-18 md:h-18 rounded-full flex-shrink-0"
          style={{
            width: clockSize.base,
            height: clockSize.base,
            background: 'var(--bg-secondary)',
            border: '2px solid var(--border)',
            boxShadow: `inset 0 2px 6px rgba(0,0,0,0.08), var(--elevation-2)`,
          }}
        >
          {/* 12 tick marks around the clock edge */}
          {tickMarks.map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180)
            const tickRadius = clockSize.base / 2 - 6
            const tickLength = i % 3 === 0 ? 5 : 3
            const tickX = Math.cos(rad) * (tickRadius - tickLength / 2)
            const tickY = Math.sin(rad) * (tickRadius - tickLength / 2)

            return (
              <div
                key={angle}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: 1.5,
                  height: tickLength,
                  background: i % 3 === 0 ? 'var(--text-muted)' : 'var(--border)',
                  transform: `translate(-50%, -50%) translate(${tickX}px, ${tickY}px) rotate(${angle}deg)`,
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
              height: clockSize.base / 2 - 10,
              marginLeft: -1,
              marginTop: -(clockSize.base / 2 - 10),
              background: 'var(--accent)',
              borderRadius: 'var(--radius-xs)',
              transform: `rotate(${rotation}deg)`,
            }}
          />

          {/* Second hand (shorter, thinner, moves faster) */}
          <div
            className="absolute top-1/2 left-1/2 origin-bottom"
            style={{
              width: 1,
              height: clockSize.base / 2 - 14,
              marginLeft: -0.5,
              marginTop: -(clockSize.base / 2 - 14),
              background: 'var(--error)',
              borderRadius: 'var(--radius-xs)',
              transform: `rotate(${rotation * 3}deg)`,
              opacity: 0.8,
            }}
          />

          {/* Center dot */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: 'var(--accent)' }}
          />

          {/* Stress indicator ring */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -3,
              border: `2px solid var(--error)`,
              opacity: 0.4 + stressIntensity * 0.4,
              boxShadow: `0 0 ${glowIntensity * pulseAmount}px ${glowIntensity * 0.3 * pulseAmount}px var(--error)`,
            }}
          />
        </motion.div>
      </div>

      {/* Right side: Timer stats - larger and more prominent */}
      <div
        className="text-left flex-shrink-0"
        style={{ opacity: progress > 0.1 ? 1 : progress * 10 }}
      >
        <div
          className="font-mono text-xl md:text-2xl font-bold leading-none"
          style={{
            color: hoursWasted > 6 ? 'var(--error)' : 'var(--warning)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayHours}h {displayMinutes.toString().padStart(2, '0')}m
        </div>
        <div
          className="text-[11px] md:text-xs font-medium leading-tight mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          wasted on
        </div>
        <div
          className="text-[11px] md:text-xs font-semibold leading-tight"
          style={{ color: 'var(--error)' }}
        >
          repetitive tasks
        </div>

        {/* Visual stress indicator - dots that fill up */}
        <div className="flex gap-1 mt-2">
          {[...Array(5)].map((_, i) => {
            const filled = progress > (i + 1) * 0.2
            return (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: filled ? 'var(--error)' : 'var(--border)',
                  opacity: filled ? 0.8 : 0.4,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RepetitiveClock
