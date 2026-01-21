'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface ImportStageProps {
  progress?: number
}

/**
 * Stage 1: Import & Standardize
 * Visualizes Excel/CSV upload transforming into NAHB-categorized budget lines
 * with data particles, progress counter, and confidence badges
 */
export function ImportStage({ progress = 0 }: ImportStageProps) {
  // Derive all values from scroll progress
  const uploadComplete = progress > 0.15
  const parsingProgress = Math.max(0, Math.min(1, (progress - 0.15) * 2)) // 15-65%
  const categorizeProgress = Math.max(0, Math.min(1, (progress - 0.4) * 1.67)) // 40-100%

  // Budget lines appear progressively
  const visibleLines = Math.floor(categorizeProgress * 5)

  const budgetLines = [
    { category: 'Framing', code: '03.00', amount: '$45,200', confidence: 98 },
    { category: 'Electrical', code: '07.00', amount: '$28,500', confidence: 95 },
    { category: 'Plumbing', code: '06.00', amount: '$32,100', confidence: 97 },
    { category: 'HVAC', code: '08.00', amount: '$41,800', confidence: 92 },
    { category: 'Roofing', code: '04.00', amount: '$18,900', confidence: 99 },
  ]

  // Calculate which Excel cell is being scanned (0-11 for 4x3 grid)
  const scanningCellIndex = Math.floor(parsingProgress * 12)

  // Generate particle positions for data flow animation
  const particles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      delay: i * 0.15,
      offsetY: (i % 3 - 1) * 8,
    }))
  }, [])

  // Progress counter text
  const mappingCount = Math.min(visibleLines, 5)
  const showMappingCounter = parsingProgress > 0.3 && categorizeProgress < 1

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden">
      {/* Source file (Excel/CSV) */}
      <motion.div
        className="absolute left-4 top-1/2 -translate-y-1/2 w-16 md:w-20"
        style={{
          opacity: 1 - parsingProgress * 0.3,
          transform: `translateY(-50%) translateX(${parsingProgress * 20}px)`,
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
          {/* Grid representation with sequential highlighting */}
          <div className="space-y-0.5">
            {[...Array(4)].map((_, row) => (
              <div key={row} className="flex gap-0.5">
                {[...Array(3)].map((_, col) => {
                  const cellIndex = row * 3 + col
                  const isScanning = parsingProgress > 0 && cellIndex === scanningCellIndex
                  const isScanned = parsingProgress > 0 && cellIndex < scanningCellIndex

                  return (
                    <motion.div
                      key={col}
                      className="h-1.5 flex-1 rounded-sm"
                      style={{
                        background: isScanning
                          ? 'var(--info)'
                          : isScanned
                          ? 'var(--success-muted)'
                          : row === 0
                          ? 'var(--accent-muted)'
                          : 'var(--border)',
                      }}
                      animate={isScanning ? {
                        opacity: [1, 0.5, 1],
                      } : {}}
                      transition={isScanning ? {
                        duration: 0.3,
                        repeat: Infinity,
                      } : {}}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Data particles flowing from Excel to NAHB panel */}
      {parsingProgress > 0.2 && categorizeProgress < 0.9 && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => {
            const particleProgress = Math.max(0, Math.min(1,
              (parsingProgress - 0.2 - particle.delay) * 2
            ))
            if (particleProgress <= 0 || particleProgress >= 1) return null

            return (
              <motion.div
                key={particle.id}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--info)',
                  boxShadow: '0 0 6px var(--info)',
                  left: `${25 + particleProgress * 45}%`,
                  top: `calc(50% + ${particle.offsetY}px)`,
                  opacity: particleProgress < 0.1
                    ? particleProgress * 10
                    : particleProgress > 0.9
                    ? (1 - particleProgress) * 10
                    : 1,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Processing indicator with counter */}
      {parsingProgress > 0 && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            opacity: categorizeProgress < 0.8 ? 1 : 1 - (categorizeProgress - 0.8) * 5,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <motion.svg
                className="w-5 h-5"
                style={{ color: 'var(--info)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
              <span
                className="text-[9px] font-medium"
                style={{ color: 'var(--info)' }}
              >
                AI Mapping
              </span>
            </div>
            {/* Progress counter */}
            {showMappingCounter && (
              <motion.span
                className="text-[8px] font-mono"
                style={{ color: 'var(--text-muted)' }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Mapping {mappingCount}/5...
              </motion.span>
            )}
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
              const isVisible = i < visibleLines
              const isLatest = i === visibleLines - 1 && categorizeProgress < 1
              // Confidence badge appears slightly after line appears
              const showConfidence = isVisible && categorizeProgress > (i + 1) * 0.2 + 0.1

              return (
                <motion.div
                  key={line.code}
                  className="relative flex items-center gap-1 px-1 py-0.5 rounded"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    background: isLatest
                      ? 'color-mix(in srgb, var(--success) 10%, transparent)'
                      : 'transparent',
                    border: isLatest
                      ? '1px solid color-mix(in srgb, var(--success) 30%, transparent)'
                      : '1px solid transparent',
                  }}
                  initial={false}
                  animate={isVisible ? { x: 0 } : { x: 10 }}
                  transition={{ duration: 0.2 }}
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

                  {/* Confidence badge */}
                  {showConfidence && (
                    <motion.span
                      className="absolute -right-1 -top-1 text-[5px] px-1 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'var(--success-muted)',
                        color: 'var(--success)',
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      {line.confidence}%
                    </motion.span>
                  )}

                  {/* Sparkle effect on newly mapped items */}
                  {isLatest && (
                    <motion.div
                      className="absolute -right-0.5 -top-0.5 w-2 h-2"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.6 }}
                    >
                      <svg viewBox="0 0 24 24" fill="var(--success)" className="w-full h-full">
                        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                      </svg>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Confidence indicator */}
          {categorizeProgress > 0.7 && (
            <motion.div
              className="px-2 py-1 flex items-center gap-1"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ImportStage
