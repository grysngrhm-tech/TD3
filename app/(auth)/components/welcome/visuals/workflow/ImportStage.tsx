'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface ImportStageProps {
  progress?: number
}

/**
 * Stage 1: Import & Standardize
 * Visualizes Excel/CSV upload transforming into NAHB-categorized budget lines
 * with upload animation, structure detection, data particles, and rich results
 *
 * Timing phases (0-1 progress) - OVERLAPPING for fluid animation:
 * - 0-15%:   File upload animation
 * - 8-30%:   Structure detection (overlaps with upload)
 * - 22-55%:  Cell scanning (overlaps with structure)
 * - 45-75%:  AI mapping with particles (overlaps with scanning)
 * - 65-95%:  Results display (overlaps with mapping)
 * - 88-100%: Summary/completion (overlaps with results)
 */
export function ImportStage({ progress = 0 }: ImportStageProps) {
  // Phase calculations with OVERLAPPING timing for fluid animation
  const uploadProgress = Math.min(1, progress / 0.15) // 0-15%
  const uploadComplete = progress > 0.08

  const structureDetectProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.22)) // 8-30%
  const structureComplete = progress > 0.22

  const scanProgress = Math.max(0, Math.min(1, (progress - 0.22) / 0.33)) // 22-55%
  const scanComplete = progress > 0.45

  const mappingProgress = Math.max(0, Math.min(1, (progress - 0.45) / 0.30)) // 45-75%
  const mappingComplete = progress > 0.65

  const resultsProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.30)) // 65-95%
  const showSummary = progress > 0.88

  // Budget lines - expanded to 8 for richer content
  const budgetLines = [
    { category: 'Site Work', code: '01.00', amount: '$12,400', confidence: 96 },
    { category: 'Foundation', code: '02.00', amount: '$38,200', confidence: 98 },
    { category: 'Framing', code: '03.00', amount: '$45,200', confidence: 98 },
    { category: 'Roofing', code: '04.00', amount: '$18,900', confidence: 99 },
    { category: 'Plumbing', code: '06.00', amount: '$32,100', confidence: 97 },
    { category: 'Electrical', code: '07.00', amount: '$28,500', confidence: 95 },
    { category: 'HVAC', code: '08.00', amount: '$41,800', confidence: 92 },
    { category: 'Insulation', code: '09.00', amount: '$14,600', confidence: 94 },
  ]

  // Progressive line reveal (8 lines over 70-92% = 22% of progress)
  const visibleLines = Math.min(8, Math.floor(resultsProgress * 8.5))

  // Calculate which Excel cell is being scanned (0-11 for 4x3 grid)
  const scanningCellIndex = structureComplete ? Math.floor(scanProgress * 12) : -1

  // Generate particle positions for data flow animation
  const particles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      delay: i * 0.1,
      offsetY: (i % 4 - 1.5) * 6,
    }))
  }, [])

  // Mapping counter
  const mappingCount = Math.min(visibleLines, 8)

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden">
      {/* Source file (Excel/CSV) */}
      <motion.div
        className="absolute left-[5%] md:left-[8%] top-1/2 -translate-y-1/2 w-[25%] min-w-[80px]"
        style={{
          opacity: Math.min(1, uploadProgress * 2),
          transform: `translateY(-50%) translateX(${mappingComplete ? 10 : 0}px) scale(${mappingComplete ? 0.95 : 1})`,
        }}
      >
        <div
          className="relative p-2 rounded-lg"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${structureComplete ? 'var(--success)' : 'var(--border-subtle)'}`,
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {/* File icon with upload animation */}
          <div className="flex items-center gap-1 mb-1">
            <motion.svg
              className="w-4 h-4"
              style={{ color: uploadComplete ? 'var(--success)' : 'var(--text-muted)' }}
              fill="currentColor"
              viewBox="0 0 24 24"
              initial={{ y: -5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </motion.svg>
            <span className="text-[8px] font-medium" style={{ color: 'var(--text-muted)' }}>
              budget.xlsx
            </span>
          </div>

          {/* Upload progress bar */}
          {!uploadComplete && (
            <div className="mb-1">
              <div
                className="h-1 w-full rounded-full overflow-hidden"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--info)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress * 100}%` }}
                />
              </div>
              <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                Uploading...
              </span>
            </div>
          )}

          {/* Grid representation with sequential highlighting */}
          <div className="space-y-0.5">
            {[...Array(4)].map((_, row) => (
              <div key={row} className="flex gap-0.5">
                {[...Array(3)].map((_, col) => {
                  const cellIndex = row * 3 + col
                  const isScanning = scanningCellIndex === cellIndex
                  const isScanned = structureComplete && cellIndex < scanningCellIndex
                  const isStructureDetected = structureDetectProgress > 0 && !structureComplete

                  return (
                    <motion.div
                      key={col}
                      className="h-1.5 flex-1 rounded-sm"
                      style={{
                        background: isScanning
                          ? 'var(--info)'
                          : isScanned
                          ? 'var(--success-muted)'
                          : isStructureDetected
                          ? 'var(--info-muted)'
                          : row === 0
                          ? 'var(--accent-muted)'
                          : 'var(--border)',
                      }}
                      animate={isScanning ? {
                        opacity: [1, 0.5, 1],
                      } : isStructureDetected ? {
                        opacity: [0.5, 1, 0.5],
                      } : {}}
                      transition={isScanning ? {
                        duration: 0.2,
                        repeat: Infinity,
                      } : isStructureDetected ? {
                        duration: 0.8,
                        repeat: Infinity,
                      } : {}}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Structure detection status */}
          {uploadComplete && !structureComplete && (
            <motion.div
              className="mt-1 flex items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--info)' }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              <span className="text-[6px]" style={{ color: 'var(--info)' }}>
                Detecting structure...
              </span>
            </motion.div>
          )}

          {/* Structure detected badge */}
          {structureComplete && !scanComplete && (
            <motion.div
              className="mt-1 flex items-center gap-1"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <svg className="w-2.5 h-2.5" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[6px]" style={{ color: 'var(--success)' }}>
                32 rows detected
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Data particles flowing from Excel to NAHB panel */}
      {scanComplete && !showSummary && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => {
            const particleProgress = Math.max(0, Math.min(1,
              (mappingProgress - particle.delay) * 1.5
            ))
            if (particleProgress <= 0 || particleProgress >= 1) return null

            return (
              <motion.div
                key={particle.id}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--info)',
                  boxShadow: '0 0 6px var(--info)',
                  left: `${18 + particleProgress * 54}%`,
                  top: `calc(50% + ${particle.offsetY}px)`,
                  opacity: particleProgress < 0.15
                    ? particleProgress * 6.67
                    : particleProgress > 0.85
                    ? (1 - particleProgress) * 6.67
                    : 1,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Central processing indicator */}
      {scanComplete && !showSummary && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            opacity: mappingComplete ? Math.max(0, 1 - (resultsProgress - 0.5) * 4) : 1,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
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
              <span className="text-[9px] font-medium" style={{ color: 'var(--info)' }}>
                AI Mapping
              </span>
            </div>
            {/* Progress counter */}
            {mappingComplete && (
              <motion.span
                className="text-[8px] font-mono"
                style={{ color: 'var(--text-muted)' }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Mapping {mappingCount}/8...
              </motion.span>
            )}
          </div>
        </motion.div>
      )}

      {/* Output: NAHB categorized list */}
      <motion.div
        className="absolute right-[5%] md:right-[8%] top-1/2 -translate-y-1/2 w-[45%] min-w-[160px]"
        style={{
          opacity: mappingComplete ? 1 : 0,
          transform: `translateY(-50%) scale(${0.95 + (mappingComplete ? 0.05 : 0)})`,
        }}
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: showSummary ? '1px solid var(--success)' : '1px solid var(--border-subtle)',
            boxShadow: showSummary ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'var(--elevation-2)',
          }}
        >
          {/* Header */}
          <div
            className="px-2 py-1 flex items-center justify-between"
            style={{
              background: showSummary
                ? 'color-mix(in srgb, var(--success) 8%, var(--bg-secondary))'
                : 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1">
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
            {showSummary && (
              <motion.span
                className="text-[6px] px-1 py-0.5 rounded-full"
                style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                Ready
              </motion.span>
            )}
          </div>

          {/* Budget lines - scrollable container for 8 lines */}
          <div className="p-1 space-y-0.5 max-h-28 overflow-hidden">
            {budgetLines.map((line, i) => {
              const isVisible = i < visibleLines
              const isLatest = i === visibleLines - 1 && !showSummary
              const showConfidence = isVisible && resultsProgress > (i + 1) * 0.11

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
                  animate={isVisible ? { x: 0, opacity: 1 } : { x: 10, opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                      transition={{ duration: 0.5 }}
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

          {/* Summary footer */}
          {showSummary && (
            <motion.div
              className="px-2 py-1.5 space-y-1"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Stats row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
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
                    8 categories mapped
                  </span>
                </div>
                <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  96% avg
                </span>
              </div>
              {/* Total */}
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                  Total Budget
                </span>
                <span className="text-[8px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  $231,700
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ImportStage
