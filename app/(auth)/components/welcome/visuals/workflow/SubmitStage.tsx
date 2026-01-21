'use client'

import { motion } from 'framer-motion'

interface SubmitStageProps {
  progress?: number
}

/**
 * Stage 2: Submit & Match
 * Visualizes draw request submission with invoice matching,
 * connection lines, scanning effects, and checkmark animations
 */
export function SubmitStage({ progress = 0 }: SubmitStageProps) {
  // Derive all values from scroll progress
  const drawSubmitted = progress > 0.1
  const invoiceUploaded = progress > 0.25
  const scanProgress = Math.max(0, Math.min(1, (progress - 0.3) * 2.5)) // 30-70%
  const matchingProgress = Math.max(0, Math.min(1, (progress - 0.45) * 2.5)) // 45-85%
  const matchComplete = progress > 0.85

  const drawLines = [
    { category: 'Framing', requested: '$12,400', match: 92 },
    { category: 'Electrical', requested: '$8,200', match: 88 },
    { category: 'Plumbing', requested: '$6,800', match: 95 },
  ]

  const matchedIndex = Math.floor(matchingProgress * 3)

  // Invoice text extraction (skeleton → text)
  const extractionProgress = Math.max(0, Math.min(1, (progress - 0.35) * 3))

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
      {/* Draw Request Card */}
      <motion.div
        className="absolute left-1 md:left-3 top-2 w-24 md:w-28"
        style={{
          opacity: drawSubmitted ? 1 : progress * 8,
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
                  className="relative flex items-center justify-between px-1 py-0.5 rounded"
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
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] font-mono" style={{ color: 'var(--text-primary)' }}>
                      {line.requested}
                    </span>
                    {/* Checkmark for matched items */}
                    {isMatched && (
                      <motion.div
                        className="w-3 h-3 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--success)' }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  {/* Match confidence badge */}
                  {isMatched && (
                    <motion.span
                      className="absolute -right-2 top-0 text-[5px] px-1 rounded-full font-medium"
                      style={{
                        background: 'var(--success-muted)',
                        color: 'var(--success)',
                      }}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {line.match}%
                    </motion.span>
                  )}
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

      {/* Animated connection lines between cards */}
      {matchingProgress > 0 && !matchComplete && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--info)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="var(--success)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--info)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map((lineIndex) => {
            if (lineIndex > matchedIndex) return null
            const yOffset = 35 + lineIndex * 12
            return (
              <motion.line
                key={lineIndex}
                x1="32%"
                y1={`${yOffset}%`}
                x2="68%"
                y2={`${yOffset}%`}
                stroke="url(#lineGradient)"
                strokeWidth="1"
                strokeDasharray="4 2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: lineIndex < matchedIndex ? 1 : matchingProgress,
                  opacity: 1,
                }}
                transition={{ duration: 0.3 }}
              />
            )
          })}
        </svg>
      )}

      {/* Invoice Card */}
      <motion.div
        className="absolute right-1 md:right-3 top-2 w-20 md:w-24"
        style={{
          opacity: invoiceUploaded ? 1 : 0,
          transform: `translateY(${invoiceUploaded ? 0 : -10}px) scale(${invoiceUploaded ? 1 : 0.9})`,
        }}
      >
        <div
          className="rounded-lg overflow-hidden relative"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {/* Scanning beam effect */}
          {scanProgress > 0 && scanProgress < 1 && (
            <motion.div
              className="absolute left-0 right-0 h-0.5 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, var(--info) 50%, transparent 100%)',
                boxShadow: '0 0 8px var(--info)',
                top: `${scanProgress * 100}%`,
                zIndex: 10,
              }}
            />
          )}

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

          {/* Invoice preview with text extraction animation */}
          <div className="p-2 space-y-1 relative">
            {/* Line 1: Vendor name */}
            <div className="h-1.5 w-full rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0"
                style={{ background: 'var(--border)' }}
              />
              {extractionProgress > 0.2 && (
                <motion.div
                  className="absolute inset-0 flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-[5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    Acme Lumber Co.
                  </span>
                </motion.div>
              )}
            </div>

            {/* Line 2: Description */}
            <div className="h-1.5 w-3/4 rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0"
                style={{ background: 'var(--border)' }}
              />
              {extractionProgress > 0.5 && (
                <motion.div
                  className="absolute inset-0 flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-[5px] truncate" style={{ color: 'var(--text-muted)' }}>
                    Framing materials
                  </span>
                </motion.div>
              )}
            </div>

            {/* Line 3: Date */}
            <div className="h-1.5 w-1/2 rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0"
                style={{ background: 'var(--border)' }}
              />
              {extractionProgress > 0.8 && (
                <motion.div
                  className="absolute inset-0 flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-[5px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    Jan 18, 2026
                  </span>
                </motion.div>
              )}
            </div>

            {/* Total line */}
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
      {matchingProgress > 0 && !matchComplete && (
        <motion.div
          className="absolute left-1/2 bottom-12 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--info)',
                boxShadow: '0 0 8px var(--info)',
              }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--info)' }}>
              Matching {matchedIndex}/3...
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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--success)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <div>
              <div className="text-[8px] font-semibold" style={{ color: 'var(--success)' }}>
                3 Matches Found
              </div>
              <div className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                92% avg confidence
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default SubmitStage
