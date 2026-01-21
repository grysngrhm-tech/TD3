'use client'

import { motion } from 'framer-motion'

interface ReviewStageProps {
  progress?: number
}

/**
 * Stage 3: Review with Full Context
 * Visualizes the unified review dashboard showing all data in context
 */
export function ReviewStage({ progress = 0 }: ReviewStageProps) {
  // Derive all values from scroll progress
  const panelReveal = Math.min(1, progress * 3) // 0-33%
  const dataPopulate = Math.max(0, Math.min(1, (progress - 0.2) * 2)) // 20-70%
  const flagsReveal = Math.max(0, Math.min(1, (progress - 0.5) * 2.5)) // 50-90%
  const approveReveal = Math.max(0, Math.min(1, (progress - 0.8) * 5)) // 80-100%

  const reviewItems = [
    { label: 'Requested', value: '$27,400', status: 'neutral' },
    { label: 'Remaining Budget', value: '$142,600', status: 'good' },
    { label: 'Invoice Match', value: '3 of 3', status: 'good' },
    { label: 'Flags', value: '1 warning', status: 'warning' },
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2">
      {/* Main review panel */}
      <motion.div
        className="w-full max-w-[180px] md:max-w-[220px]"
        style={{
          opacity: panelReveal,
          transform: `scale(${0.95 + panelReveal * 0.05})`,
        }}
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--elevation-3)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5"
                style={{ color: 'var(--accent)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Draw #4 Review
              </span>
            </div>
            <span
              className="text-[7px] px-1.5 py-0.5 rounded-full"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
            >
              In Review
            </span>
          </div>

          {/* Summary stats */}
          <div className="p-2 space-y-1.5">
            {reviewItems.map((item, i) => {
              const itemOpacity = Math.min(1, Math.max(0, (dataPopulate - i * 0.15) * 4))
              const isFlag = item.status === 'warning'

              return (
                <motion.div
                  key={item.label}
                  className="flex items-center justify-between px-2 py-1 rounded"
                  style={{
                    opacity: itemOpacity,
                    background: isFlag && flagsReveal > 0.5
                      ? 'color-mix(in srgb, var(--warning) 10%, transparent)'
                      : 'var(--bg-secondary)',
                    border: isFlag && flagsReveal > 0.5
                      ? '1px solid color-mix(in srgb, var(--warning) 30%, transparent)'
                      : '1px solid transparent',
                  }}
                >
                  <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                  <span
                    className="text-[8px] font-semibold"
                    style={{
                      color: item.status === 'good'
                        ? 'var(--success)'
                        : item.status === 'warning'
                        ? 'var(--warning)'
                        : 'var(--text-primary)',
                    }}
                  >
                    {item.value}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Flag detail */}
          {flagsReveal > 0.3 && (
            <motion.div
              className="mx-2 mb-2 p-2 rounded-lg"
              style={{
                opacity: flagsReveal,
                background: 'color-mix(in srgb, var(--warning) 8%, var(--bg-secondary))',
                border: '1px solid color-mix(in srgb, var(--warning) 20%, transparent)',
              }}
            >
              <div className="flex items-start gap-1.5">
                <svg
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--warning)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-[7px] font-medium" style={{ color: 'var(--warning)' }}>
                    Budget variance detected
                  </p>
                  <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Framing +8% over category avg
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div
            className="px-2 py-2 flex gap-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              className="flex-1 py-1 rounded text-[7px] font-medium"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                opacity: approveReveal,
              }}
            >
              Request Changes
            </button>
            <button
              className="flex-1 py-1 rounded text-[7px] font-medium"
              style={{
                background: approveReveal > 0.5 ? 'var(--success)' : 'var(--bg-secondary)',
                color: approveReveal > 0.5 ? 'white' : 'var(--text-secondary)',
                boxShadow: approveReveal > 0.5 ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                opacity: approveReveal,
              }}
            >
              Approve
            </button>
          </div>
        </div>
      </motion.div>

      {/* Historical context sidebar hint */}
      {dataPopulate > 0.7 && (
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-12 md:w-16"
          style={{ opacity: dataPopulate - 0.7 }}
        >
          <div
            className="rounded-l-lg p-1.5"
            style={{
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            <div className="text-[6px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              History
            </div>
            <div className="space-y-0.5">
              {['#1', '#2', '#3'].map((draw, i) => (
                <div
                  key={draw}
                  className="flex items-center gap-1"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--success)' }}
                  />
                  <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                    Draw {draw}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ReviewStage
