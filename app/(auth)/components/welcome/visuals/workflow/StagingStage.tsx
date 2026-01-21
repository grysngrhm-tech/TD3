'use client'

import { motion } from 'framer-motion'

interface StagingStageProps {
  progress?: number
}

/**
 * Stage 4: Stage for Funding
 * Visualizes approved draws grouping by builder into wire batches
 */
export function StagingStage({ progress = 0 }: StagingStageProps) {
  // Derive all values from scroll progress
  const cardsAppear = Math.min(1, progress * 2.5) // 0-40%
  const groupingProgress = Math.max(0, Math.min(1, (progress - 0.3) * 2)) // 30-80%
  const batchFormed = progress > 0.7

  const draws = [
    { id: 'D4', builder: 'Oak Heights', amount: '$27,400' },
    { id: 'D5', builder: 'Oak Heights', amount: '$18,200' },
    { id: 'D6', builder: 'Pine Valley', amount: '$34,100' },
  ]

  // Group draws by builder as progress increases
  const oakHeightsDraws = draws.filter(d => d.builder === 'Oak Heights')
  const pineValleyDraws = draws.filter(d => d.builder === 'Pine Valley')

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2">
      {/* Individual draw cards - before grouping */}
      {!batchFormed && (
        <div className="flex flex-wrap gap-2 justify-center">
          {draws.map((draw, i) => {
            const cardOpacity = Math.min(1, Math.max(0, (cardsAppear - i * 0.15) * 3))
            // Move cards toward their group as groupingProgress increases
            const isOakHeights = draw.builder === 'Oak Heights'
            const offsetX = groupingProgress * (isOakHeights ? -20 : 20)
            const offsetY = groupingProgress * (isOakHeights && i === 1 ? 15 : 0)

            return (
              <motion.div
                key={draw.id}
                className="w-20 md:w-24"
                style={{
                  opacity: cardOpacity,
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${1 - groupingProgress * 0.1})`,
                }}
              >
                <div
                  className="rounded-lg p-2"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${groupingProgress > 0.5 && isOakHeights ? 'var(--info)' : 'var(--border-subtle)'}`,
                    boxShadow: groupingProgress > 0.5 && isOakHeights
                      ? '0 0 8px color-mix(in srgb, var(--info) 30%, transparent)'
                      : 'var(--elevation-1)',
                  }}
                >
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
                    <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      #{draw.id}
                    </span>
                  </div>
                  <p className="text-[7px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {draw.builder}
                  </p>
                  <p className="text-[9px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {draw.amount}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Grouped batches - after grouping */}
      {batchFormed && (
        <div className="flex gap-3 md:gap-4">
          {/* Oak Heights Batch */}
          <motion.div
            className="w-28 md:w-32"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--info)',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--info) 20%, transparent)',
              }}
            >
              {/* Batch header */}
              <div
                className="px-2 py-1.5 flex items-center gap-2"
                style={{
                  background: 'color-mix(in srgb, var(--info) 10%, var(--bg-secondary))',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-bold"
                  style={{ background: 'var(--info)', color: 'white' }}
                >
                  OH
                </div>
                <div>
                  <p className="text-[8px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Oak Heights
                  </p>
                  <p className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                    2 draws ready
                  </p>
                </div>
              </div>

              {/* Draws in batch */}
              <div className="p-1.5 space-y-1">
                {oakHeightsDraws.map(draw => (
                  <div
                    key={draw.id}
                    className="flex items-center justify-between px-1.5 py-1 rounded"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                      #{draw.id}
                    </span>
                    <span className="text-[7px] font-mono" style={{ color: 'var(--text-primary)' }}>
                      {draw.amount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Batch total */}
              <div
                className="px-2 py-1.5 flex justify-between"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                  Wire Total
                </span>
                <span className="text-[9px] font-bold font-mono" style={{ color: 'var(--info)' }}>
                  $45,600
                </span>
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
      {progress > 0.5 && !batchFormed && (
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          style={{ opacity: (progress - 0.5) * 4 }}
        >
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--info)' }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
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
