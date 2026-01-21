'use client'

import { motion } from 'framer-motion'

interface SubmitStageProps {
  progress?: number
}

/**
 * Stage 2: Submit & Match
 * Visualizes draw request submission with invoice matching
 */
export function SubmitStage({ progress = 0 }: SubmitStageProps) {
  // Derive all values from scroll progress
  const drawSubmitted = progress > 0.15
  const invoiceUploaded = progress > 0.35
  const matchingProgress = Math.max(0, Math.min(1, (progress - 0.4) * 2.5)) // 40-80%
  const matchComplete = progress > 0.8

  const drawLines = [
    { category: 'Framing', requested: '$12,400', match: 85 },
    { category: 'Electrical', requested: '$8,200', match: 92 },
    { category: 'Plumbing', requested: '$6,800', match: 78 },
  ]

  const matchedIndex = Math.floor(matchingProgress * 3)

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2">
      {/* Draw Request Card */}
      <motion.div
        className="absolute left-1 md:left-3 top-2 w-24 md:w-28"
        style={{
          opacity: drawSubmitted ? 1 : progress * 6,
          transform: `translateY(${drawSubmitted ? 0 : 10}px)`,
        }}
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {/* Header */}
          <div
            className="px-2 py-1 flex items-center justify-between"
            style={{
              background: 'color-mix(in srgb, var(--info) 10%, var(--bg-secondary))',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span className="text-[7px] font-semibold" style={{ color: 'var(--info)' }}>
              Draw #4
            </span>
            <span
              className="text-[6px] px-1 py-0.5 rounded-full"
              style={{
                background: 'var(--info-muted)',
                color: 'var(--info)',
              }}
            >
              New
            </span>
          </div>

          {/* Line items */}
          <div className="p-1.5 space-y-1">
            {drawLines.map((line, i) => {
              const isMatched = i < matchedIndex
              const isMatching = i === matchedIndex && matchingProgress > 0 && !matchComplete

              return (
                <div
                  key={line.category}
                  className="flex items-center justify-between px-1 py-0.5 rounded"
                  style={{
                    background: isMatched
                      ? 'color-mix(in srgb, var(--success) 8%, transparent)'
                      : isMatching
                      ? 'color-mix(in srgb, var(--info) 8%, transparent)'
                      : 'transparent',
                  }}
                >
                  <span className="text-[6px]" style={{ color: 'var(--text-secondary)' }}>
                    {line.category}
                  </span>
                  <span className="text-[6px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    {line.requested}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Total */}
          <div
            className="px-2 py-1 flex justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span className="text-[7px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Total
            </span>
            <span className="text-[7px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
              $27,400
            </span>
          </div>
        </div>
      </motion.div>

      {/* Invoice Card */}
      <motion.div
        className="absolute right-1 md:right-3 top-2 w-20 md:w-24"
        style={{
          opacity: invoiceUploaded ? 1 : 0,
          transform: `translateY(${invoiceUploaded ? 0 : -10}px) scale(${invoiceUploaded ? 1 : 0.9})`,
        }}
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {/* Header */}
          <div
            className="px-2 py-1"
            style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[7px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Invoice
              </span>
            </div>
          </div>

          {/* Invoice preview */}
          <div className="p-2 space-y-1">
            <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--border)' }} />
            <div className="h-1.5 w-3/4 rounded-full" style={{ background: 'var(--border)' }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'var(--border)' }} />
            <div
              className="flex items-center justify-between pt-1"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>Total</span>
              <span className="text-[7px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                $12,380
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Matching visualization */}
      {matchingProgress > 0 && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: matchComplete ? 0 : 1 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--info)',
                boxShadow: '0 0 8px var(--info)',
              }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--info)' }}>
              Matching...
            </span>
          </div>
        </motion.div>
      )}

      {/* Match result */}
      {matchComplete && (
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--success) 10%, var(--bg-card))',
            border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
            boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5"
              style={{ color: 'var(--success)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-[8px] font-semibold" style={{ color: 'var(--success)' }}>
                3 Matches Found
              </div>
              <div className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                85% avg confidence
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default SubmitStage
