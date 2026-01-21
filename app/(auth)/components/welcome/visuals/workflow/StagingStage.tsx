'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'

interface StagingStageProps {
  progress?: number
}

/**
 * Stage 4: Stage for Funding
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-15%:  Cards Entry (8 draw cards fly in from different angles)
 * - 10-30%: Status Display (overlaps with entry)
 * - 20-45%: Builder Detection (overlaps with status)
 * - 35-65%: Grouping Animation (overlaps with detection)
 * - 55-85%: Batch Formation (overlaps with grouping)
 * - 75-100%: Wire Ready (overlaps with batch)
 */
export function StagingStage({ progress = 0 }: StagingStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Cards Entry (0-15%)
  const cardsEntryProgress = Math.min(1, progress / 0.15)

  // Phase 2: Status Display (10-30%)
  const statusProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.20))

  // Phase 3: Builder Detection (20-45%)
  const builderDetectProgress = Math.max(0, Math.min(1, (progress - 0.20) / 0.25))

  // Phase 4: Grouping Animation (35-65%)
  const groupingProgress = Math.max(0, Math.min(1, (progress - 0.35) / 0.30))

  // Phase 5: Batch Formation (55-85%)
  const batchProgress = Math.max(0, Math.min(1, (progress - 0.55) / 0.30))

  // Phase 6: Wire Ready (75-100%)
  const wireReadyProgress = Math.max(0, Math.min(1, (progress - 0.75) / 0.25))

  // Draw data - expanded to 8 draws from 4 builders
  const draws = [
    { id: 'D4', builder: 'Oak Heights', amount: 27400, initials: 'OH', color: 'var(--info)' },
    { id: 'D5', builder: 'Oak Heights', amount: 18200, initials: 'OH', color: 'var(--info)' },
    { id: 'D6', builder: 'Pine Valley', amount: 34100, initials: 'PV', color: 'var(--accent)' },
    { id: 'D7', builder: 'Pine Valley', amount: 22500, initials: 'PV', color: 'var(--accent)' },
    { id: 'D8', builder: 'Maple Ridge', amount: 41200, initials: 'MR', color: 'var(--purple, #8b5cf6)' },
    { id: 'D9', builder: 'Maple Ridge', amount: 19800, initials: 'MR', color: 'var(--purple, #8b5cf6)' },
    { id: 'D10', builder: 'Cedar Lane', amount: 28600, initials: 'CL', color: 'var(--warning)' },
    { id: 'D11', builder: 'Cedar Lane', amount: 12800, initials: 'CL', color: 'var(--warning)' },
  ]

  // Entry angles for 8 cards flying in (4x2 grid layout)
  const entryAngles = [
    { x: -40, y: -30, rotate: -8 },
    { x: -20, y: -40, rotate: -4 },
    { x: 20, y: -40, rotate: 4 },
    { x: 40, y: -30, rotate: 8 },
    { x: -35, y: 30, rotate: -6 },
    { x: -15, y: 40, rotate: -2 },
    { x: 15, y: 40, rotate: 2 },
    { x: 35, y: 30, rotate: 6 },
  ]

  // Calculate visible status badges
  const visibleBadges = Math.ceil(statusProgress * draws.length)

  // Builder groups for batch display
  const builders = [
    { name: 'Oak Heights', initials: 'OH', color: 'var(--info)', draws: draws.filter(d => d.builder === 'Oak Heights') },
    { name: 'Pine Valley', initials: 'PV', color: 'var(--accent)', draws: draws.filter(d => d.builder === 'Pine Valley') },
    { name: 'Maple Ridge', initials: 'MR', color: 'var(--purple, #8b5cf6)', draws: draws.filter(d => d.builder === 'Maple Ridge') },
    { name: 'Cedar Lane', initials: 'CL', color: 'var(--warning)', draws: draws.filter(d => d.builder === 'Cedar Lane') },
  ]

  // Running total during grouping - show progressive accumulation
  const runningTotal = useMemo(() => {
    const totalAmount = draws.reduce((sum, d) => sum + d.amount, 0)
    return Math.floor(totalAmount * Math.min(groupingProgress * 1.5, 1))
  }, [groupingProgress])

  // Show batches after grouping
  const showBatches = batchProgress > 0.2
  const showIndividualCards = !showBatches

  // Calculate grid positions (4x2 layout)
  const getGridPosition = (index: number) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    return { col, row }
  }

  // Magnetic snap calculation - group by builder
  const getSnapPosition = (index: number, builder: string) => {
    if (groupingProgress === 0) return { x: 0, y: 0 }

    const builderIndex = builders.findIndex(b => b.name === builder)
    const drawsInBuilder = draws.filter(d => d.builder === builder)
    const positionInBuilder = drawsInBuilder.findIndex(d => d.id === draws[index].id)

    // Target positions for each builder group
    const targets = [
      { x: -60, y: -15 },  // Oak Heights (top-left)
      { x: 60, y: -15 },   // Pine Valley (top-right)
      { x: -60, y: 25 },   // Maple Ridge (bottom-left)
      { x: 60, y: 25 },    // Cedar Lane (bottom-right)
    ]

    const target = targets[builderIndex] || { x: 0, y: 0 }
    const stackOffset = positionInBuilder * 8

    // Ease-in-out for magnetic snap
    const eased = groupingProgress < 0.5
      ? 2 * groupingProgress * groupingProgress
      : 1 - Math.pow(-2 * groupingProgress + 2, 2) / 2

    return {
      x: target.x * eased,
      y: (target.y + stackOffset) * eased,
    }
  }

  // Which builder is currently glowing
  const getBuilderGlowing = () => {
    if (builderDetectProgress < 0.25) return 'Oak Heights'
    if (builderDetectProgress < 0.5) return 'Pine Valley'
    if (builderDetectProgress < 0.75) return 'Maple Ridge'
    return 'Cedar Lane'
  }
  const glowingBuilder = getBuilderGlowing()

  // Mobile detection for scaling
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const mobileScale = isMobile ? 1.15 : 1

  // Total amounts for summary
  const totalAmount = draws.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden"
      style={{ transform: `scale(${mobileScale})`, transformOrigin: 'center center' }}
    >
      {/* Status indicator at top */}
      {cardsEntryProgress > 0.5 && !showBatches && (
        <motion.div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="px-3 py-1.5 rounded-lg flex items-center gap-2"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--success)' }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              8 draws ready for staging
            </span>
          </div>
        </motion.div>
      )}

      {/* Connection lines during grouping */}
      {builderDetectProgress > 0.1 && !showBatches && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            {builders.map((builder, i) => (
              <linearGradient key={builder.initials} id={`conn${builder.initials}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={builder.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={builder.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>
          {/* Draw connection lines between same-builder cards */}
          {builders.map((builder, bi) => {
            const builderDraws = draws
              .map((d, i) => ({ ...d, originalIndex: i }))
              .filter(d => d.builder === builder.name)

            if (builderDraws.length < 2) return null
            const isGlowing = glowingBuilder === builder.name

            return builderDraws.slice(0, -1).map((draw, di) => {
              const nextDraw = builderDraws[di + 1]
              const startPos = getGridPosition(draw.originalIndex)
              const endPos = getGridPosition(nextDraw.originalIndex)

              return (
                <motion.line
                  key={`${builder.initials}-${di}`}
                  x1={`${20 + startPos.col * 20}%`}
                  y1={`${35 + startPos.row * 30}%`}
                  x2={`${20 + endPos.col * 20}%`}
                  y2={`${35 + endPos.row * 30}%`}
                  stroke={`url(#conn${builder.initials})`}
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: Math.min(groupingProgress * 2, 1),
                    opacity: builderDetectProgress * 0.8,
                  }}
                  style={{
                    filter: isGlowing ? `drop-shadow(0 0 4px ${builder.color})` : 'none',
                  }}
                />
              )
            })
          })}
        </svg>
      )}

      {/* Individual draw cards - 4x2 grid layout */}
      {showIndividualCards && (
        <div className="grid grid-cols-4 gap-1.5 md:gap-2 relative z-10 px-2">
          {draws.map((draw, i) => {
            const entryVisible = cardsEntryProgress > i * 0.1
            const entry = entryAngles[i]
            const snap = getSnapPosition(i, draw.builder)
            const isGlowing = glowingBuilder === draw.builder && builderDetectProgress > 0.1
            const showBadge = i < visibleBadges

            return (
              <motion.div
                key={draw.id}
                className="w-full min-w-[60px] relative"
                style={{
                  opacity: entryVisible ? 1 : 0,
                  transform: entryVisible
                    ? `translate(${snap.x}px, ${snap.y}px) scale(${1 - groupingProgress * 0.15})`
                    : `translate(${entry.x}px, ${entry.y}px) rotate(${entry.rotate}deg) scale(0.7)`,
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: isGlowing ? 2 : 1,
                }}
              >
                <div
                  className="rounded-lg p-1.5 relative overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${isGlowing ? draw.color : 'var(--border-subtle)'}`,
                    boxShadow: isGlowing
                      ? `0 0 8px color-mix(in srgb, ${draw.color} 40%, transparent)`
                      : 'var(--elevation-1)',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}
                >
                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-1">
                    {showBadge ? (
                      <motion.span
                        className="text-[5px] px-1 py-0.5 rounded font-medium"
                        style={{
                          background: 'var(--success-muted)',
                          color: 'var(--success)',
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        OK
                      </motion.span>
                    ) : (
                      <span className="text-[5px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        --
                      </span>
                    )}

                    {/* Builder badge */}
                    <motion.div
                      className="w-4 h-4 rounded flex items-center justify-center text-[5px] font-bold"
                      style={{
                        background: draw.color,
                        color: 'white',
                      }}
                      animate={isGlowing ? {
                        scale: [1, 1.1, 1],
                      } : {}}
                      transition={{ duration: 0.6, repeat: isGlowing ? Infinity : 0 }}
                    >
                      {draw.initials}
                    </motion.div>
                  </div>

                  <p className="text-[6px] truncate mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {draw.builder}
                  </p>
                  <p className="text-[8px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    ${draw.amount.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Grouping indicator */}
      {builderDetectProgress > 0.3 && !showBatches && (
        <motion.div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="px-3 py-1.5 rounded-lg flex items-center gap-2"
            style={{
              background: 'color-mix(in srgb, var(--info) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)',
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--info)' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--info)' }}>
              Grouping by builder...
            </span>
            {groupingProgress > 0.2 && (
              <motion.span
                className="text-[8px] font-mono font-bold"
                style={{ color: 'var(--info)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                ${runningTotal.toLocaleString()}
              </motion.span>
            )}
          </div>
        </motion.div>
      )}

      {/* Batch cards - 2x2 grid after formation */}
      {showBatches && (
        <div className="grid grid-cols-2 gap-2 md:gap-3 w-full max-w-[95%]">
          {builders.map((builder, bi) => {
            const builderTotal = builder.draws.reduce((sum, d) => sum + d.amount, 0)
            const delayFactor = bi * 0.08

            return (
              <motion.div
                key={builder.initials}
                className="w-full"
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: delayFactor }}
              >
                <div
                  className="rounded-lg overflow-hidden relative"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${bi === 0 ? builder.color : 'var(--border-subtle)'}`,
                    boxShadow: bi === 0
                      ? `0 2px 12px color-mix(in srgb, ${builder.color} 20%, transparent)`
                      : 'var(--elevation-1)',
                  }}
                >
                  {/* Ready badge - cascade in */}
                  {wireReadyProgress > 0.2 + bi * 0.15 && (
                    <motion.div
                      className="absolute -top-1 -right-1 z-10"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <div
                        className="px-1.5 py-0.5 rounded-full text-[5px] font-bold"
                        style={{
                          background: 'var(--success)',
                          color: 'white',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        Ready
                      </div>
                    </motion.div>
                  )}

                  {/* Batch header */}
                  <div
                    className="px-2 py-1.5 flex items-center gap-1.5"
                    style={{
                      background: `color-mix(in srgb, ${builder.color} 8%, var(--bg-secondary))`,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <motion.div
                      className="w-5 h-5 rounded flex items-center justify-center text-[6px] font-bold"
                      style={{ background: builder.color, color: 'white' }}
                      animate={wireReadyProgress > 0 && bi === 0 ? {
                        boxShadow: [`0 0 0px ${builder.color}`, `0 0 8px ${builder.color}`, `0 0 0px ${builder.color}`],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {builder.initials}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[7px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {builder.name}
                      </p>
                      <p className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                        {builder.draws.length} draws
                      </p>
                    </div>
                  </div>

                  {/* Draws in batch */}
                  <div className="p-1.5 space-y-0.5">
                    {builder.draws.map((draw, di) => (
                      <motion.div
                        key={draw.id}
                        className="flex items-center justify-between px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-secondary)' }}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delayFactor + 0.05 + di * 0.05 }}
                      >
                        <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                          #{draw.id}
                        </span>
                        <span className="text-[6px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                          ${draw.amount.toLocaleString()}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Batch total */}
                  <div
                    className="px-2 py-1 flex justify-between items-center"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <span className="text-[6px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Wire
                    </span>
                    <motion.span
                      className="text-[8px] font-bold font-mono"
                      style={{ color: builder.color }}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                    >
                      ${builderTotal.toLocaleString()}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Final summary */}
      {wireReadyProgress > 0.5 && (
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="px-4 py-2 rounded-xl flex items-center gap-3"
            style={{
              background: 'color-mix(in srgb, var(--success) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--success)' }}
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] font-semibold" style={{ color: 'var(--success)' }}>
                Staging Complete
              </div>
              <div className="text-[7px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <span>4 batches</span>
                <span>•</span>
                <span className="font-mono font-medium">${totalAmount.toLocaleString()} total</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default StagingStage
