'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface SubmitStageProps {
  progress?: number
}

/**
 * Stage 2: Submit & Match
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-18%:  Draw Card Entry (slides in from left)
 * - 10-28%: Draw Population (overlaps with entry)
 * - 20-42%: Invoice Upload (3 invoices cascade in)
 * - 32-58%: Invoice Scanning (overlaps with upload)
 * - 48-75%: Matching Process (overlaps with scanning)
 * - 65-88%: Validation (overlaps with matching)
 * - 80-100%: Match Complete (overlaps with validation)
 */
export function SubmitStage({ progress = 0 }: SubmitStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Draw Card Entry (0-18%)
  const drawEntryProgress = Math.min(1, progress / 0.18)

  // Phase 2: Draw Population (10-28%)
  const drawPopProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.18))

  // Phase 3: Invoice Upload (20-42%)
  const invoiceUploadProgress = Math.max(0, Math.min(1, (progress - 0.20) / 0.22))

  // Phase 4: Invoice Scanning (32-58%)
  const scanProgress = Math.max(0, Math.min(1, (progress - 0.32) / 0.26))

  // Phase 5: Matching Process (48-75%)
  const matchingProgress = Math.max(0, Math.min(1, (progress - 0.48) / 0.27))

  // Phase 6: Validation (65-88%)
  const validationProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.23))

  // Phase 7: Match Complete (80-100%)
  const completeProgress = Math.max(0, Math.min(1, (progress - 0.80) / 0.20))

  // Draw lines data - 4 items
  const drawLines = [
    { category: 'Framing', requested: '$12,400', match: 96 },
    { category: 'Electrical', requested: '$8,200', match: 88 },
    { category: 'Plumbing', requested: '$6,800', match: 95 },
    { category: 'Roofing', requested: '$4,500', match: 92 },
  ]

  // 3 invoices that match to draw lines
  const invoices = [
    { vendor: 'Acme Lumber Co.', amount: '$12,380', category: 'Framing', matchLine: 0, color: 'var(--info)' },
    { vendor: 'City Electric', amount: '$8,180', category: 'Electrical', matchLine: 1, color: 'var(--accent)' },
    { vendor: 'Pro Plumbing', amount: '$6,750', category: 'Plumbing', matchLine: 2, color: 'var(--success)' },
  ]

  // Calculate which line items are visible during population phase
  const visibleLines = Math.ceil(drawPopProgress * drawLines.length)

  // Calculate which invoices are visible
  const visibleInvoices = Math.ceil(invoiceUploadProgress * invoices.length)

  // Which invoice is currently being scanned
  const scanningInvoiceIndex = scanProgress < 0.33 ? 0 : scanProgress < 0.66 ? 1 : 2
  const invoiceScanComplete = (index: number) => scanProgress > (index + 1) * 0.33

  // Calculate which items are matched during matching phase
  const matchedCount = Math.floor(matchingProgress * 3) // Only 3 invoices to match

  // Validation state
  const showValidating = validationProgress > 0 && validationProgress < 0.5
  const showValidated = validationProgress >= 0.5

  // Total
  const total = drawLines.reduce((sum, line) => {
    const num = parseFloat(line.requested.replace(/[$,]/g, ''))
    return sum + num
  }, 0)

  // Mobile detection for scaling
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const mobileScale = isMobile ? 1.15 : 1

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden"
      style={{ transform: `scale(${mobileScale})`, transformOrigin: 'center center' }}
    >
      {/* Draw Request Card */}
      <motion.div
        className="absolute left-[2%] md:left-[3%] top-2 w-[38%] min-w-[130px]"
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
              <span className="text-[8px] font-semibold" style={{ color: 'var(--info)' }}>
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
              const isMatched = i < matchedCount && matchingProgress > 0
              const isValidated = showValidated && isMatched

              return (
                <motion.div
                  key={line.category}
                  className="relative flex items-center justify-between px-1.5 py-0.5 rounded"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    background: isValidated
                      ? 'color-mix(in srgb, var(--success) 10%, transparent)'
                      : isMatched
                      ? 'color-mix(in srgb, var(--info) 8%, transparent)'
                      : 'transparent',
                    transform: `translateX(${isVisible ? 0 : -10}px)`,
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  <span className="text-[7px]" style={{ color: 'var(--text-secondary)' }}>
                    {line.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <motion.span
                      className="text-[7px] font-mono"
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
            <span className="text-[8px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
              ${total.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Animated connection lines with curved paths */}
      {matchingProgress > 0 && completeProgress < 0.8 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            {invoices.map((inv, i) => (
              <linearGradient key={`grad${i}`} id={`lineGrad${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={inv.color} stopOpacity="0.9" />
                <stop offset="50%" stopColor="var(--success)" stopOpacity="1" />
                <stop offset="100%" stopColor={inv.color} stopOpacity="0.9" />
              </linearGradient>
            ))}
          </defs>
          {invoices.map((inv, i) => {
            if (i >= matchedCount) return null
            // Draw Y positions (percentage-based)
            const drawY = 18 + i * 8
            // Invoice Y positions
            const invY = 22 + i * 20
            // Curved path from draw line to invoice
            const midX = 50
            const midY = (drawY + invY) / 2

            return (
              <motion.path
                key={i}
                d={`M 40 ${drawY} Q ${midX} ${midY} 60 ${invY}`}
                fill="none"
                stroke={`url(#lineGrad${i})`}
                strokeWidth="0.4"
                strokeDasharray="2 1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: showValidated ? 0.4 : 0.8,
                }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              />
            )
          })}
        </svg>
      )}

      {/* Invoice Cards - stacked/cascaded */}
      <div className="absolute right-[2%] md:right-[3%] top-2 w-[35%] min-w-[110px]">
        {invoices.map((invoice, i) => {
          const invProgress = Math.max(0, Math.min(1, (invoiceUploadProgress - i * 0.25) * 2))
          const isScanning = scanningInvoiceIndex === i && scanProgress > 0 && !invoiceScanComplete(i)
          const isExtracted = invoiceScanComplete(i)
          const isMatched = i < matchedCount
          const isValidated = showValidated && isMatched

          return (
            <motion.div
              key={invoice.vendor}
              className="absolute w-full"
              style={{
                top: `${i * 48}px`,
                opacity: invProgress,
                transform: `translateY(${(1 - invProgress) * -15}px) scale(${0.92 + invProgress * 0.08})`,
                zIndex: 3 - i,
              }}
            >
              <div
                className="rounded-lg overflow-hidden relative"
                style={{
                  background: 'var(--bg-card)',
                  border: isValidated
                    ? '1px solid var(--success)'
                    : isMatched
                    ? `1px solid ${invoice.color}`
                    : '1px solid var(--border-subtle)',
                  boxShadow: isValidated
                    ? '0 2px 8px rgba(16, 185, 129, 0.2)'
                    : 'var(--elevation-1)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
                {/* Scanning beam effect */}
                {isScanning && (
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, ${invoice.color} 50%, transparent 100%)`,
                      boxShadow: `0 0 8px ${invoice.color}`,
                      zIndex: 10,
                    }}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                {/* Header */}
                <div
                  className="px-1.5 py-1 flex items-center justify-between"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-2.5 h-2.5"
                      style={{ color: isExtracted ? invoice.color : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[6px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                      Invoice {i + 1}
                    </span>
                  </div>
                  {isExtracted && (
                    <motion.span
                      className="text-[5px] px-1 rounded-full"
                      style={{ background: `color-mix(in srgb, ${invoice.color} 20%, transparent)`, color: invoice.color }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {invoice.category}
                    </motion.span>
                  )}
                </div>

                {/* Invoice content */}
                <div className="p-1.5 space-y-0.5">
                  {/* Vendor line */}
                  <div className="h-2 relative rounded overflow-hidden">
                    <div
                      className="absolute inset-0 rounded"
                      style={{ background: 'var(--border)' }}
                    />
                    {isExtracted && (
                      <motion.div
                        className="absolute inset-0 flex items-center px-1 rounded"
                        style={{ background: 'var(--bg-card)' }}
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.25 }}
                      >
                        <span className="text-[6px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {invoice.vendor}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Amount line */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>Total</span>
                    <span
                      className="text-[7px] font-mono font-semibold"
                      style={{ color: isExtracted ? 'var(--text-primary)' : 'var(--border)' }}
                    >
                      {isExtracted ? invoice.amount : '$--,---'}
                    </span>
                  </div>
                </div>

                {/* Match indicator */}
                {isValidated && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Center status indicator */}
      <div className="absolute left-1/2 bottom-4 -translate-x-1/2">
        {/* Scanning in progress */}
        {scanProgress > 0 && scanProgress < 1 && matchingProgress === 0 && (
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
              style={{ background: invoices[scanningInvoiceIndex]?.color || 'var(--info)' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <span className="text-[8px] font-medium" style={{ color: 'var(--info)' }}>
              Scanning invoice {scanningInvoiceIndex + 1}/3...
            </span>
          </motion.div>
        )}

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
              Matching {matchedCount}/3...
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

        {/* Validated */}
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
              All invoices matched
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
                  <span>3 invoices</span>
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
