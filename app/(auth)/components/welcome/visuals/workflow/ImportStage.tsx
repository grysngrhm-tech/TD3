'use client'

import { motion } from 'framer-motion'

interface ImportStageProps {
  progress?: number
}

/**
 * Stage 1: Import & Standardize
 * Visualizes Excel/CSV upload transforming into NAHB-categorized budget lines
 */
export function ImportStage({ progress = 0 }: ImportStageProps) {
  // Derive all values from scroll progress
  const uploadComplete = progress > 0.2
  const parsingProgress = Math.max(0, Math.min(1, (progress - 0.2) * 2.5)) // 20-60%
  const categorizeProgress = Math.max(0, Math.min(1, (progress - 0.5) * 2)) // 50-100%

  // Budget lines appear progressively
  const visibleLines = Math.floor(categorizeProgress * 5)

  const budgetLines = [
    { category: 'Framing', code: '03.00', amount: '$45,200', confidence: 98 },
    { category: 'Electrical', code: '07.00', amount: '$28,500', confidence: 95 },
    { category: 'Plumbing', code: '06.00', amount: '$32,100', confidence: 97 },
    { category: 'HVAC', code: '08.00', amount: '$41,800', confidence: 92 },
    { category: 'Roofing', code: '04.00', amount: '$18,900', confidence: 99 },
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      {/* Source file (Excel/CSV) */}
      <motion.div
        className="absolute left-4 top-1/2 -translate-y-1/2 w-16 md:w-20"
        style={{
          opacity: 1 - parsingProgress * 0.5,
          transform: `translateY(-50%) translateX(${parsingProgress * 30}px)`,
        }}
      >
        <div
          className="relative p-2 rounded-lg"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {/* File icon */}
          <div className="flex items-center gap-1 mb-1">
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--success)' }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
            <span className="text-[8px] font-medium" style={{ color: 'var(--text-muted)' }}>
              .xlsx
            </span>
          </div>
          {/* Grid representation */}
          <div className="space-y-0.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-0.5">
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="h-1.5 flex-1 rounded-sm"
                    style={{
                      background: i === 0 ? 'var(--accent-muted)' : 'var(--border)',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Processing arrow */}
      {parsingProgress > 0 && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            opacity: parsingProgress < 1 ? 1 : 1 - (categorizeProgress * 0.5),
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              style={{
                color: 'var(--info)',
                transform: `rotate(${parsingProgress * 360}deg)`,
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span
              className="text-[9px] font-medium"
              style={{ color: 'var(--info)' }}
            >
              AI Mapping
            </span>
          </div>
        </motion.div>
      )}

      {/* Output: NAHB categorized list */}
      <motion.div
        className="absolute right-2 top-1/2 -translate-y-1/2 w-28 md:w-36"
        style={{
          opacity: categorizeProgress > 0 ? 1 : 0,
          transform: `translateY(-50%) scale(${0.9 + categorizeProgress * 0.1})`,
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
            className="px-2 py-1 flex items-center gap-1"
            style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="w-3 h-3 rounded flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <span className="text-[5px] font-bold text-white">TD3</span>
            </div>
            <span className="text-[7px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              NAHB Budget
            </span>
          </div>

          {/* Budget lines */}
          <div className="p-1 space-y-0.5">
            {budgetLines.map((line, i) => {
              const lineOpacity = i < visibleLines ? 1 : 0
              const isLatest = i === visibleLines - 1 && categorizeProgress < 1

              return (
                <motion.div
                  key={line.code}
                  className="flex items-center gap-1 px-1 py-0.5 rounded"
                  style={{
                    opacity: lineOpacity,
                    background: isLatest
                      ? 'color-mix(in srgb, var(--success) 10%, transparent)'
                      : 'transparent',
                    border: isLatest
                      ? '1px solid color-mix(in srgb, var(--success) 30%, transparent)'
                      : '1px solid transparent',
                  }}
                >
                  <span
                    className="text-[6px] font-mono w-6"
                    style={{ color: 'var(--accent)' }}
                  >
                    {line.code}
                  </span>
                  <span
                    className="text-[6px] flex-1 truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {line.category}
                  </span>
                  <span
                    className="text-[6px] font-mono"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {line.amount}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Confidence indicator */}
          {categorizeProgress > 0.5 && (
            <div
              className="px-2 py-1 flex items-center gap-1"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <svg
                className="w-2.5 h-2.5"
                style={{ color: 'var(--success)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[7px]" style={{ color: 'var(--success)' }}>
                96% avg confidence
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ImportStage
