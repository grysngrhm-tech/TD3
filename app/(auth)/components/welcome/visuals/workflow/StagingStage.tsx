'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface StagingStageProps {
  progress?: number
}

/**
 * Stage 4: Stage for Funding
 * Visualizes approved draws grouping by builder into wire batches
 * with connection lines, running totals, and magnetic snap effects
 */
export function StagingStage({ progress = 0 }: StagingStageProps) {
  // Derive all values from scroll progress
  const cardsAppear = Math.min(1, progress * 2) // 0-50%
  const groupingProgress = Math.max(0, Math.min(1, (progress - 0.25) * 2)) // 25-75%
  const batchFormed = progress > 0.7

  const draws = [
    { id: 'D4', builder: 'Oak Heights', amount: 27400 },
    { id: 'D5', builder: 'Oak Heights', amount: 18200 },
    { id: 'D6', builder: 'Pine Valley', amount: 34100 },
  ]

  // Running totals that update as cards merge
  const oakHeightsTotal = useMemo(() => {
    if (groupingProgress < 0.3) return draws[0].amount
    if (groupingProgress < 0.6) return draws[0].amount + Math.floor((groupingProgress - 0.3) * draws[1].amount / 0.3)
    return draws[0].amount + draws[1].amount
  }, [groupingProgress])

  // Group draws by builder
  const oakHeightsDraws = draws.filter(d => d.builder === 'Oak Heights')
  const pineValleyDraws = draws.filter(d => d.builder === 'Pine Valley')

  // Magnetic snap effect - cards accelerate as they approach
  const getSnapOffset = (baseOffset: number, progress: number) => {
    // Ease-in effect: slow at start, fast at end
    const eased = progress * progress * progress
    return baseOffset * eased
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
      {/* Connection lines between same-builder cards during grouping */}
      {groupingProgress > 0.1 && !batchFormed && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--info)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--info)" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {/* Line connecting Oak Heights cards */}
          <motion.line
            x1="30%"
            y1="45%"
            x2="45%"
            y2="55%"
            stroke="url(#connectionGradient)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: Math.min(groupingProgress * 2, 1),
              opacity: groupingProgress * 2,
            }}
            style={{
              filter: 'drop-shadow(0 0 4px var(--info))',
            }}
          />
        </svg>
      )}

      {/* Individual draw cards - before grouping */}
      {!batchFormed && (
        <div className="flex flex-wrap gap-2 justify-center relative z-10">
          {draws.map((draw, i) => {
            const cardOpacity = Math.min(1, Math.max(0, (cardsAppear - i * 0.12) * 2.5))
            const isOakHeights = draw.builder === 'Oak Heights'

            // Magnetic snap: cards accelerate as they get closer
            const rawOffsetX = isOakHeights ? -25 : 25
            const rawOffsetY = isOakHeights && i === 1 ? 20 : 0
            const offsetX = getSnapOffset(rawOffsetX, groupingProgress)
            const offsetY = getSnapOffset(rawOffsetY, groupingProgress)

            // Builder badge glow intensity
            const glowIntensity = groupingProgress > 0.3 && isOakHeights ? groupingProgress : 0

            return (
              <motion.div
                key={draw.id}
                className="w-20 md:w-24 relative"
                style={{
                  opacity: cardOpacity,
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${1 - groupingProgress * 0.05})`,
                  zIndex: isOakHeights ? 2 : 1,
                }}
              >
                <div
                  className="rounded-lg p-2 relative overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${groupingProgress > 0.3 && isOakHeights ? 'var(--info)' : 'var(--border-subtle)'}`,
                    boxShadow: groupingProgress > 0.3 && isOakHeights
                      ? `0 0 ${8 + glowIntensity * 8}px color-mix(in srgb, var(--info) ${30 + glowIntensity * 30}%, transparent)`
                      : 'var(--elevation-1)',
                  }}
                >
                  {/* Builder icon badge with glow */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[7px] px-1 py-0.5 rounded"
                      style={{
                        background: 'var(--success-muted)',
                        color: 'var(--success)',
                      }}
                    >
                      Approved
                    </span>
                    <motion.div
                      className="w-4 h-4 rounded flex items-center justify-center text-[5px] font-bold"
                      style={{
                        background: isOakHeights ? 'var(--info)' : 'var(--text-muted)',
                        color: 'white',
                        boxShadow: glowIntensity > 0.5
                          ? `0 0 8px var(--info)`
                          : 'none',
                      }}
                      animate={glowIntensity > 0.5 ? {
                        scale: [1, 1.1, 1],
                      } : {}}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      {isOakHeights ? 'OH' : 'PV'}
                    </motion.div>
                  </div>
                  <p className="text-[7px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {draw.builder}
                  </p>
                  <p className="text-[9px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    ${draw.amount.toLocaleString()}
                  </p>
                  <span className="text-[6px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    #{draw.id}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Running total counter during grouping */}
      {groupingProgress > 0.2 && !batchFormed && (
        <motion.div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="px-3 py-1 rounded-full flex items-center gap-2"
            style={{
              background: 'color-mix(in srgb, var(--info) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)',
            }}
          >
            <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
              Oak Heights:
            </span>
            <motion.span
              className="text-[9px] font-bold font-mono"
              style={{ color: 'var(--info)' }}
              key={oakHeightsTotal}
            >
              ${oakHeightsTotal.toLocaleString()}
            </motion.span>
          </div>
        </motion.div>
      )}

      {/* Grouped batches - after grouping */}
      {batchFormed && (
        <div className="flex gap-3 md:gap-4">
          {/* Oak Heights Batch */}
          <motion.div
            className="w-28 md:w-32"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 400 }}
          >
            <div
              className="rounded-xl overflow-hidden relative"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--info)',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--info) 20%, transparent)',
              }}
            >
              {/* Ready for wire badge */}
              <motion.div
                className="absolute -top-1 -right-1 z-10"
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
              >
                <div
                  className="px-1.5 py-0.5 rounded-full text-[5px] font-bold"
                  style={{
                    background: 'var(--success)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  Ready
                </div>
              </motion.div>

              {/* Batch header */}
              <div
                className="px-2 py-1.5 flex items-center gap-2"
                style={{
                  background: 'color-mix(in srgb, var(--info) 10%, var(--bg-secondary))',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <motion.div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-bold"
                  style={{ background: 'var(--info)', color: 'white' }}
                  animate={{ boxShadow: ['0 0 0px var(--info)', '0 0 8px var(--info)', '0 0 0px var(--info)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  OH
                </motion.div>
                <div>
                  <p className="text-[8px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Oak Heights
                  </p>
                  <p className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                    2 draws batched
                  </p>
                </div>
              </div>

              {/* Draws in batch */}
              <div className="p-1.5 space-y-1">
                {oakHeightsDraws.map((draw, i) => (
                  <motion.div
                    key={draw.id}
                    className="flex items-center justify-between px-1.5 py-1 rounded"
                    style={{ background: 'var(--bg-secondary)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                      #{draw.id}
                    </span>
                    <span className="text-[7px] font-mono" style={{ color: 'var(--text-primary)' }}>
                      ${draw.amount.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Batch total */}
              <div
                className="px-2 py-1.5 flex justify-between items-center"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                  Wire Total
                </span>
                <motion.span
                  className="text-[9px] font-bold font-mono"
                  style={{ color: 'var(--info)' }}
                  initial={{ scale: 1.2 }}
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
            className="w-24 md:w-28"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div
                className="px-2 py-1.5 flex items-center gap-2"
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-bold"
                  style={{ background: 'var(--text-muted)', color: 'white' }}
                >
                  PV
                </div>
                <div>
                  <p className="text-[8px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Pine Valley
                  </p>
                  <p className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                    1 draw ready
                  </p>
                </div>
              </div>

              <div className="p-1.5">
                <div
                  className="flex items-center justify-between px-1.5 py-1 rounded"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                    #D6
                  </span>
                  <span className="text-[7px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    $34,100
                  </span>
                </div>
              </div>

              <div
                className="px-2 py-1.5 flex justify-between"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                  Wire Total
                </span>
                <span className="text-[8px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  $34,100
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Staging indicator */}
      {progress > 0.4 && !batchFormed && (
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: (progress - 0.4) * 3 }}
        >
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--info)' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <span className="text-[8px]" style={{ color: 'var(--info)' }}>
              Grouping by builder...
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default StagingStage
