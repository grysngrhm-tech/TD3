'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface StagingStageProps {
  progress?: number
}

/**
 * Stage 4: Stage for Funding
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-20%:  Cards Entry (3 draw cards fly in from different angles)
 * - 10-35%: Status Display (overlaps with entry)
 * - 25-55%: Builder Detection (overlaps with status)
 * - 45-75%: Grouping Animation (overlaps with detection)
 * - 65-90%: Batch Formation (overlaps with grouping)
 * - 80-100%: Wire Ready (overlaps with batch)
 */
export function StagingStage({ progress = 0 }: StagingStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Cards Entry (0-20%)
  const cardsEntryProgress = Math.min(1, progress / 0.20)

  // Phase 2: Status Display (10-35%)
  const statusProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.25))

  // Phase 3: Builder Detection (25-55%)
  const builderDetectProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.30))

  // Phase 4: Grouping Animation (45-75%)
  const groupingProgress = Math.max(0, Math.min(1, (progress - 0.45) / 0.30))

  // Phase 5: Batch Formation (65-90%)
  const batchProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.25))

  // Phase 6: Wire Ready (80-100%)
  const wireReadyProgress = Math.max(0, Math.min(1, (progress - 0.80) / 0.20))

  // Draw data
  const draws = [
    { id: 'D4', builder: 'Oak Heights', amount: 27400, initials: 'OH', color: 'var(--info)' },
    { id: 'D5', builder: 'Oak Heights', amount: 18200, initials: 'OH', color: 'var(--info)' },
    { id: 'D6', builder: 'Pine Valley', amount: 34100, initials: 'PV', color: 'var(--accent)' },
  ]

  // Entry angles for cards flying in
  const entryAngles = [
    { x: -40, y: -20, rotate: -10 },
    { x: 30, y: 30, rotate: 5 },
    { x: 50, y: -15, rotate: 8 },
  ]

  // Calculate visible status badges
  const visibleBadges = Math.ceil(statusProgress * draws.length)

  // Running total during grouping
  const runningTotal = useMemo(() => {
    const oakHeightsBase = draws[0].amount
    if (groupingProgress < 0.5) return oakHeightsBase
    const addedAmount = Math.floor((groupingProgress - 0.5) * 2 * draws[1].amount)
    return oakHeightsBase + addedAmount
  }, [groupingProgress])

  // Show batches after grouping
  const showBatches = batchProgress > 0
  const showIndividualCards = !showBatches

  // Magnetic snap calculation
  const getSnapPosition = (index: number) => {
    if (groupingProgress === 0) return { x: 0, y: 0 }

    const isOakHeights = index < 2
    const targetX = isOakHeights ? -20 : 30
    const targetY = isOakHeights && index === 1 ? 15 : 0

    // Ease-in-out for magnetic snap
    const eased = groupingProgress < 0.5
      ? 2 * groupingProgress * groupingProgress
      : 1 - Math.pow(-2 * groupingProgress + 2, 2) / 2

    return {
      x: targetX * eased,
      y: targetY * eased,
    }
  }

  // Builder detection glow
  const builderGlowing = builderDetectProgress > 0.3

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
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
              3 draws ready for staging
            </span>
          </div>
        </motion.div>
      )}

      {/* Connection lines during grouping */}
      {builderDetectProgress > 0.2 && !showBatches && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <linearGradient id="stagingConnGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--info)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--info)" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <motion.line
            x1="35%"
            y1="45%"
            x2="48%"
            y2="55%"
            stroke="url(#stagingConnGradient)"
            strokeWidth="2"
            strokeDasharray="4 3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: Math.min(groupingProgress * 2, 1),
              opacity: builderDetectProgress,
            }}
            style={{
              filter: builderGlowing ? 'drop-shadow(0 0 6px var(--info))' : 'none',
            }}
          />
        </svg>
      )}

      {/* Individual draw cards - before batch formation */}
      {showIndividualCards && (
        <div className="flex flex-wrap gap-2 justify-center relative z-10">
          {draws.map((draw, i) => {
            const entryVisible = cardsEntryProgress > i * 0.25
            const entry = entryAngles[i]
            const snap = getSnapPosition(i)
            const isOakHeights = draw.builder === 'Oak Heights'
            const showBadge = i < visibleBadges

            return (
              <motion.div
                key={draw.id}
                className="w-22 md:w-26 relative"
                style={{
                  opacity: entryVisible ? 1 : 0,
                  transform: entryVisible
                    ? `translate(${snap.x}px, ${snap.y}px) scale(${1 - groupingProgress * 0.1})`
                    : `translate(${entry.x}px, ${entry.y}px) rotate(${entry.rotate}deg) scale(0.8)`,
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: isOakHeights ? 2 : 1,
                }}
              >
                <div
                  className="rounded-lg p-2 relative overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${builderGlowing && isOakHeights ? 'var(--info)' : 'var(--border-subtle)'}`,
                    boxShadow: builderGlowing && isOakHeights
                      ? `0 0 12px color-mix(in srgb, var(--info) 40%, transparent)`
                      : 'var(--elevation-1)',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}
                >
                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    {showBadge ? (
                      <motion.span
                        className="text-[6px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: 'var(--success-muted)',
                          color: 'var(--success)',
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        Approved
                      </motion.span>
                    ) : (
                      <span className="text-[6px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        ---
                      </span>
                    )}

                    {/* Builder badge */}
                    <motion.div
                      className="w-5 h-5 rounded flex items-center justify-center text-[6px] font-bold"
                      style={{
                        background: draw.color,
                        color: 'white',
                      }}
                      animate={builderGlowing && isOakHeights ? {
                        scale: [1, 1.15, 1],
                        boxShadow: [`0 0 0px ${draw.color}`, `0 0 10px ${draw.color}`, `0 0 0px ${draw.color}`],
                      } : {}}
                      transition={{ duration: 0.8, repeat: builderGlowing && isOakHeights ? Infinity : 0 }}
                    >
                      {draw.initials}
                    </motion.div>
                  </div>

                  <p className="text-[7px] truncate mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {draw.builder}
                  </p>
                  <p className="text-[10px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    ${draw.amount.toLocaleString()}
                  </p>
                  <span className="text-[6px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    Draw #{draw.id}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Grouping indicator */}
      {builderDetectProgress > 0.5 && !showBatches && (
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
            {groupingProgress > 0.3 && (
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

      {/* Batch cards - after formation */}
      {showBatches && (
        <div className="flex gap-3 md:gap-4">
          {/* Oak Heights Batch */}
          <motion.div
            className="w-30 md:w-36"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div
              className="rounded-xl overflow-hidden relative"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--info)',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--info) 25%, transparent)',
              }}
            >
              {/* Ready badge */}
              {wireReadyProgress > 0.3 && (
                <motion.div
                  className="absolute -top-1.5 -right-1.5 z-10"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <div
                    className="px-2 py-0.5 rounded-full text-[6px] font-bold"
                    style={{
                      background: 'var(--success)',
                      color: 'white',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.5)',
                    }}
                  >
                    Ready for Wire
                  </div>
                </motion.div>
              )}

              {/* Batch header */}
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{
                  background: 'color-mix(in srgb, var(--info) 10%, var(--bg-secondary))',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <motion.div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold"
                  style={{ background: 'var(--info)', color: 'white' }}
                  animate={wireReadyProgress > 0 ? {
                    boxShadow: ['0 0 0px var(--info)', '0 0 12px var(--info)', '0 0 0px var(--info)'],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  OH
                </motion.div>
                <div>
                  <p className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Oak Heights
                  </p>
                  <p className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    2 draws batched
                  </p>
                </div>
              </div>

              {/* Draws in batch */}
              <div className="p-2 space-y-1">
                {draws.filter(d => d.builder === 'Oak Heights').map((draw, i) => (
                  <motion.div
                    key={draw.id}
                    className="flex items-center justify-between px-2 py-1 rounded"
                    style={{ background: 'var(--bg-secondary)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                      Draw #{draw.id}
                    </span>
                    <span className="text-[8px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                      ${draw.amount.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Batch total */}
              <div
                className="px-3 py-2 flex justify-between items-center"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[8px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Wire Total
                </span>
                <motion.span
                  className="text-[11px] font-bold font-mono"
                  style={{ color: 'var(--info)' }}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                >
                  $45,600
                </motion.span>
              </div>
            </div>
          </motion.div>

          {/* Pine Valley Batch */}
          <motion.div
            className="w-26 md:w-30"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              {/* Batch header */}
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  PV
                </div>
                <div>
                  <p className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Pine Valley
                  </p>
                  <p className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    1 draw ready
                  </p>
                </div>
              </div>

              <div className="p-2">
                <div
                  className="flex items-center justify-between px-2 py-1 rounded"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    Draw #D6
                  </span>
                  <span className="text-[8px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                    $34,100
                  </span>
                </div>
              </div>

              <div
                className="px-3 py-2 flex justify-between"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[8px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Wire Total
                </span>
                <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  $34,100
                </span>
              </div>
            </div>
          </motion.div>
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
                <span>2 batches</span>
                <span>•</span>
                <span className="font-mono font-medium">$79,700 total</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default StagingStage
