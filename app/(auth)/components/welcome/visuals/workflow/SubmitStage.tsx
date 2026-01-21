'use client'

import { motion } from 'framer-motion'

interface SubmitStageProps {
  progress?: number
}

/**
 * Stage 2: Submit & Match
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-20%:  Draw Card Entry (slides in from left)
 * - 10-30%: Draw Population (overlaps with entry)
 * - 20-45%: Invoice Upload (overlaps with population)
 * - 35-60%: Invoice Scanning (overlaps with upload)
 * - 50-80%: Matching Process (overlaps with scanning)
 * - 70-92%: Validation (overlaps with matching)
 * - 85-100%: Match Complete (overlaps with validation)
 */
export function SubmitStage({ progress = 0 }: SubmitStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Draw Card Entry (0-20%)
  const drawEntryProgress = Math.min(1, progress / 0.20)

  // Phase 2: Draw Population (10-30%)
  const drawPopProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.20))

  // Phase 3: Invoice Upload (20-45%)
  const invoiceUploadProgress = Math.max(0, Math.min(1, (progress - 0.20) / 0.25))

  // Phase 4: Invoice Scanning (35-60%)
  const scanProgress = Math.max(0, Math.min(1, (progress - 0.35) / 0.25))

  // Phase 5: Matching Process (50-80%)
  const matchingProgress = Math.max(0, Math.min(1, (progress - 0.50) / 0.30))

  // Phase 6: Validation (70-92%)
  const validationProgress = Math.max(0, Math.min(1, (progress - 0.70) / 0.22))

  // Phase 7: Match Complete (85-100%)
  const completeProgress = Math.max(0, Math.min(1, (progress - 0.85) / 0.15))

  // Draw lines data - 4 items for richer content
  const drawLines = [
    { category: 'Framing', requested: '$12,400', match: 96 },
    { category: 'Electrical', requested: '$8,200', match: 88 },
    { category: 'Plumbing', requested: '$6,800', match: 95 },
    { category: 'Roofing', requested: '$4,500', match: 92 },
  ]

  // Calculate which line items are visible during population phase
  const visibleLines = Math.ceil(drawPopProgress * drawLines.length)

  // Calculate which items are matched during matching phase
  const matchedCount = Math.floor(matchingProgress * drawLines.length)

  // Invoice extraction phases
  const extractVendor = scanProgress > 0.3
  const extractDescription = scanProgress > 0.5
  const extractDate = scanProgress > 0.7
  const extractAmount = scanProgress > 0.9

  // Validation state
  const showValidating = validationProgress > 0 && validationProgress < 0.6
  const showValidated = validationProgress >= 0.6

  // Total
  const total = drawLines.reduce((sum, line) => {
    const num = parseFloat(line.requested.replace(/[$,]/g, ''))
    return sum + num
  }, 0)

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
      {/* Draw Request Card */}
      <motion.div
        className="absolute left-[3%] md:left-[5%] top-2 w-[35%] min-w-[120px]"
        style={{
          opacity: drawEntryProgress,
          transform: `translateX(${(1 - drawEntryProgress) * -30}px)`,
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
            className="px-2 py-1.5 flex items-center justify-between"
            style={{
              background: 'color-mix(in srgb, var(--info) 10%, var(--bg-secondary))',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3 h-3"
                style={{ color: 'var(--info)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-[7px] font-semibold" style={{ color: 'var(--info)' }}>
                Draw #4
              </span>
            </div>
            <span
              className="text-[6px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: 'var(--info-muted)',
                color: 'var(--info)',
              }}
            >
              Submitted
            </span>
          </div>

          {/* Line items - appear progressively */}
          <div className="p-1.5 space-y-0.5">
            {drawLines.map((line, i) => {
              const isVisible = i < visibleLines
              const isMatched = i < matchedCount && progress >= 0.55
              const isCurrentlyMatching = i === matchedCount && matchingProgress > 0 && matchedCount < drawLines.length
              const isValidated = showValidated && isMatched

              return (
                <motion.div
                  key={line.category}
                  className="relative flex items-center justify-between px-1.5 py-0.5 rounded"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    background: isValidated
                      ? 'color-mix(in srgb, var(--success) 10%, transparent)'
                      : isCurrentlyMatching
                      ? 'color-mix(in srgb, var(--info) 8%, transparent)'
                      : 'transparent',
                    transform: `translateX(${isVisible ? 0 : -10}px)`,
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  <span className="text-[6px]" style={{ color: 'var(--text-secondary)' }}>
                    {line.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <motion.span
                      className="text-[6px] font-mono"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {line.requested}
                    </motion.span>

                    {/* Match confidence badge */}
                    {isMatched && (
                      <motion.span
                        className="text-[5px] px-1 rounded-full font-medium"
                        style={{
                          background: isValidated ? 'var(--success-muted)' : 'var(--info-muted)',
                          color: isValidated ? 'var(--success)' : 'var(--info)',
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * i }}
                      >
                        {line.match}%
                      </motion.span>
                    )}

                    {/* Checkmark for validated items */}
                    {isValidated && (
                      <motion.div
                        className="w-3 h-3 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--success)' }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 * i }}
                      >
                        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Total */}
          <div
            className="px-2 py-1 flex justify-between"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              opacity: visibleLines >= drawLines.length ? 1 : 0.3,
              transition: 'opacity 0.3s',
            }}
          >
            <span className="text-[7px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Total
            </span>
            <span className="text-[7px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
              ${total.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Animated connection lines between cards */}
      {matchingProgress > 0 && completeProgress < 1 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            <linearGradient id="submitLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--info)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="var(--success)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--info)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {drawLines.map((_, lineIndex) => {
            if (lineIndex >= matchedCount) return null
            const yOffset = 26 + lineIndex * 8
            return (
              <motion.line
                key={lineIndex}
                x1="38%"
                y1={`${yOffset}%`}
                x2="62%"
                y2={`${yOffset + 12}%`}
                stroke="url(#submitLineGradient)"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: showValidated ? 0.3 : 0.8,
                }}
                transition={{ duration: 0.4, delay: lineIndex * 0.1 }}
              />
            )
          })}
        </svg>
      )}

      {/* Invoice Card */}
      <motion.div
        className="absolute right-[3%] md:right-[5%] top-4 w-[32%] min-w-[100px]"
        style={{
          opacity: invoiceUploadProgress,
          transform: `translateY(${(1 - invoiceUploadProgress) * -20}px) scale(${0.9 + invoiceUploadProgress * 0.1})`,
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
                boxShadow: '0 0 10px var(--info)',
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
              {scanProgress >= 1 && (
                <motion.span
                  className="text-[5px] px-1 rounded-full ml-auto"
                  style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Extracted
                </motion.span>
              )}
            </div>
          </div>

          {/* Invoice preview with text extraction animation */}
          <div className="p-2 space-y-1.5 relative">
            {/* Line 1: Vendor name */}
            <div className="h-2 w-full rounded overflow-hidden relative">
              <div
                className="absolute inset-0 rounded"
                style={{ background: 'var(--border)' }}
              />
              {extractVendor && (
                <motion.div
                  className="absolute inset-0 flex items-center px-1 rounded"
                  style={{ background: 'var(--bg-card)' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-[6px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    Acme Lumber Co.
                  </span>
                </motion.div>
              )}
            </div>

            {/* Line 2: Description */}
            <div className="h-2 w-3/4 rounded overflow-hidden relative">
              <div
                className="absolute inset-0 rounded"
                style={{ background: 'var(--border)' }}
              />
              {extractDescription && (
                <motion.div
                  className="absolute inset-0 flex items-center px-1 rounded"
                  style={{ background: 'var(--bg-card)' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-[5px] truncate" style={{ color: 'var(--text-muted)' }}>
                    Framing materials
                  </span>
                </motion.div>
              )}
            </div>

            {/* Line 3: Date */}
            <div className="h-2 w-1/2 rounded overflow-hidden relative">
              <div
                className="absolute inset-0 rounded"
                style={{ background: 'var(--border)' }}
              />
              {extractDate && (
                <motion.div
                  className="absolute inset-0 flex items-center px-1 rounded"
                  style={{ background: 'var(--bg-card)' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
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
              <motion.span
                className="text-[7px] font-mono font-semibold"
                style={{
                  color: extractAmount ? 'var(--text-primary)' : 'var(--border)',
                }}
              >
                {extractAmount ? '$12,380' : '$--,---'}
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Center status indicator */}
      <div className="absolute left-1/2 bottom-4 -translate-x-1/2">
        {/* Matching in progress */}
        {matchingProgress > 0 && validationProgress === 0 && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--info) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--info)',
                boxShadow: '0 0 8px var(--info)',
              }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--info)' }}>
              Matching {matchedCount}/{drawLines.length}...
            </span>
          </motion.div>
        )}

        {/* Validating */}
        {showValidating && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--warning) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--warning)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--warning)' }}>
              Validating amounts...
            </span>
          </motion.div>
        )}

        {/* Validated / Ready for match complete */}
        {showValidated && completeProgress === 0 && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--success) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div
              className="w-3 h-3 rounded-full flex items-center justify-center"
              style={{ background: 'var(--success)' }}
            >
              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[8px] font-medium" style={{ color: 'var(--success)' }}>
              All amounts validated
            </span>
          </motion.div>
        )}

        {/* Final match complete state */}
        {completeProgress > 0 && (
          <motion.div
            className="px-4 py-2 rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--success) 12%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--success)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <div>
                <div className="text-[9px] font-semibold" style={{ color: 'var(--success)' }}>
                  Matching Complete
                </div>
                <div className="text-[7px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <span>4/4 matched</span>
                  <span>•</span>
                  <span>0 flags</span>
                  <span>•</span>
                  <span>93% avg</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default SubmitStage
