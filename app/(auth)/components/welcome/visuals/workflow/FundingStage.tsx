'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface FundingStageProps {
  progress?: number
}

/**
 * Stage 5: Fund with Controls
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-18%:  Panel Entry (funding form slides up)
 * - 10-30%: Amount Display (overlaps with entry)
 * - 22-45%: Date Selection (overlaps with amount)
 * - 35-58%: Reference Entry (overlaps with date)
 * - 50-72%: Authorization (overlaps with reference)
 * - 65-85%: Processing (overlaps with auth)
 * - 78-95%: Success (overlaps with processing)
 * - 88-100%: Lock (overlaps with success)
 */
export function FundingStage({ progress = 0 }: FundingStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Panel Entry (0-18%)
  const panelEntryProgress = Math.min(1, progress / 0.18)

  // Phase 2: Amount Display (10-30%)
  const amountProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.20))

  // Phase 3: Date Selection (22-45%)
  const dateProgress = Math.max(0, Math.min(1, (progress - 0.22) / 0.23))

  // Phase 4: Reference Entry (35-58%)
  const refProgress = Math.max(0, Math.min(1, (progress - 0.35) / 0.23))

  // Phase 5: Authorization (50-72%)
  const authProgress = Math.max(0, Math.min(1, (progress - 0.50) / 0.22))

  // Phase 6: Processing (65-85%)
  const processingProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.20))

  // Phase 7: Success (78-95%)
  const successProgress = Math.max(0, Math.min(1, (progress - 0.78) / 0.17))

  // Phase 8: Lock (88-100%)
  const lockProgress = Math.max(0, Math.min(1, (progress - 0.88) / 0.12))

  // Amount counting animation
  const targetAmount = 45600
  const displayedAmount = Math.floor(targetAmount * Math.min(amountProgress * 1.5, 1))

  // Wire reference typing animation
  const wireRefText = 'WIRE-2026-0120-001'
  const visibleChars = Math.floor(refProgress * wireRefText.length)
  const displayedWireRef = wireRefText.slice(0, visibleChars)
  const showCursor = refProgress > 0 && refProgress < 1

  // Date selection states
  const showCalendar = dateProgress > 0.2 && dateProgress < 0.7
  const dateSelected = dateProgress > 0.6

  // Processing states
  const showProcessing = processingProgress > 0
  const processingStep = Math.floor(processingProgress * 3)

  // Final states
  const showSuccess = successProgress > 0
  const showLock = lockProgress > 0

  // Confetti particles
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: ['var(--success)', 'var(--info)', 'var(--accent)', 'var(--warning)'][i % 4],
      size: 3 + Math.random() * 4,
    }))
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
      {/* Confetti celebration */}
      {showSuccess && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                background: particle.color,
                left: `${particle.x}%`,
                top: '-10px',
              }}
              initial={{ y: 0, opacity: 1, rotate: 0 }}
              animate={{
                y: 250,
                opacity: [1, 1, 0],
                rotate: 720,
                x: [0, Math.random() * 50 - 25, Math.random() * 80 - 40],
              }}
              transition={{
                duration: 2,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Funding control panel */}
      <motion.div
        className="w-full max-w-[200px] md:max-w-[220px]"
        style={{
          opacity: panelEntryProgress,
          transform: `translateY(${(1 - panelEntryProgress) * 30}px)`,
        }}
      >
        <div
          className="rounded-xl overflow-hidden relative"
          style={{
            background: 'var(--bg-card)',
            border: showSuccess
              ? '1px solid var(--success)'
              : '1px solid var(--border-subtle)',
            boxShadow: showSuccess
              ? '0 4px 20px rgba(16, 185, 129, 0.25)'
              : 'var(--elevation-2)',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: showSuccess
                ? 'color-mix(in srgb, var(--success) 10%, var(--bg-secondary))'
                : 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              transition: 'background 0.3s',
            }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                style={{ color: showSuccess ? 'var(--success)' : 'var(--accent)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Fund Batch
              </span>
            </div>
            <span
              className="text-[7px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: showSuccess ? 'var(--success-muted)' : 'var(--accent-muted)',
                color: showSuccess ? 'var(--success)' : 'var(--accent)',
              }}
            >
              {showSuccess ? 'Complete' : 'Oak Heights'}
            </span>
          </div>

          {/* Form fields */}
          <div className="p-3 space-y-2">
            {/* Amount field */}
            <div className="relative">
              <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Wire Amount
              </label>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded font-mono text-[10px] font-semibold"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: amountProgress > 0.5 ? '1px solid var(--success)' : '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  ${displayedAmount.toLocaleString()}.00
                </div>
                {amountProgress > 0.8 && (
                  <motion.div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
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
            </div>

            {/* Date field */}
            <div className="relative">
              <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Funding Date
              </label>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded text-[9px] flex items-center justify-between relative"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: dateSelected ? '1px solid var(--success)' : dateProgress > 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: dateSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <span>{dateSelected ? 'Jan 20, 2026' : 'Select date...'}</span>
                  <svg
                    className="w-3 h-3"
                    style={{ color: dateProgress > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>

                  {/* Mini calendar picker animation */}
                  {showCalendar && (
                    <motion.div
                      className="absolute -bottom-10 left-0 right-0 p-1 rounded-lg z-10"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--elevation-2)',
                      }}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <div className="grid grid-cols-7 gap-0.5">
                        {[18, 19, 20, 21, 22, 23, 24].map((day) => (
                          <motion.div
                            key={day}
                            className="w-3 h-3 rounded text-[5px] flex items-center justify-center"
                            style={{
                              background: day === 20 ? 'var(--accent)' : 'transparent',
                              color: day === 20 ? 'white' : 'var(--text-muted)',
                            }}
                            animate={day === 20 ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            {day}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
                {dateSelected && (
                  <motion.div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
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
            </div>

            {/* Wire reference field */}
            <div className="relative">
              <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Wire Reference
              </label>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded text-[9px] font-mono relative"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: refProgress > 0.9 ? '1px solid var(--success)' : refProgress > 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: refProgress > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {refProgress > 0 ? displayedWireRef : 'Enter reference...'}
                  {showCursor && (
                    <motion.span
                      className="inline-block w-0.5 h-3 ml-0.5"
                      style={{ background: 'var(--accent)' }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  )}
                </div>
                {refProgress >= 1 && (
                  <motion.div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
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
            </div>

            {/* Authorization section */}
            {authProgress > 0 && (
              <motion.div
                className="p-2 rounded-lg"
                style={{
                  background: 'color-mix(in srgb, var(--info) 8%, var(--bg-secondary))',
                  border: '1px solid color-mix(in srgb, var(--info) 25%, transparent)',
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--info)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-[8px] font-semibold" style={{ color: 'var(--info)' }}>
                      {authProgress < 0.6 ? 'Verifying authorization...' : 'Authorized by John Smith'}
                    </p>
                    <p className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                      {authProgress < 0.6 ? 'Checking permissions' : 'fund_draws permission verified'}
                    </p>
                  </div>
                  {authProgress > 0.6 && (
                    <motion.div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--success)' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Processing timeline */}
            {showProcessing && !showSuccess && (
              <motion.div
                className="p-2 rounded-lg"
                style={{
                  background: 'color-mix(in srgb, var(--warning) 8%, var(--bg-secondary))',
                  border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-3">
                  {['Initiated', 'Processing', 'Complete'].map((step, i) => (
                    <div key={step} className="flex items-center gap-1.5">
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: i <= processingStep ? 'var(--warning)' : 'var(--border)',
                        }}
                        animate={i === processingStep ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.5, repeat: i === processingStep ? Infinity : 0 }}
                      />
                      <span
                        className="text-[6px]"
                        style={{
                          color: i <= processingStep ? 'var(--warning)' : 'var(--text-muted)',
                          fontWeight: i === processingStep ? 600 : 400,
                        }}
                      >
                        {step}
                      </span>
                      {i < 2 && (
                        <div className="w-3 h-px" style={{ background: i < processingStep ? 'var(--warning)' : 'var(--border)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Action button */}
          <div
            className="px-3 py-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <motion.button
              className="w-full py-2 rounded-lg text-[9px] font-semibold flex items-center justify-center gap-1.5"
              style={{
                background: showSuccess ? 'var(--success)' : 'var(--accent)',
                color: 'white',
                boxShadow: showSuccess
                  ? '0 4px 16px rgba(16, 185, 129, 0.35)'
                  : '0 4px 12px rgba(149, 6, 6, 0.25)',
              }}
            >
              {showProcessing && !showSuccess ? (
                <>
                  <motion.svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </motion.svg>
                  Initiating Wire...
                </>
              ) : showSuccess ? (
                <>
                  <motion.svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </motion.svg>
                  Funded Successfully
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Mark as Funded
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Lock indicator */}
      {showLock && (
        <motion.div
          className="absolute right-2 md:right-6 top-3"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--success)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.5)',
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Final status */}
      {lockProgress > 0.3 && (
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="px-4 py-2 rounded-xl flex items-center gap-3"
            style={{
              background: 'color-mix(in srgb, var(--success) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}
          >
            <motion.svg
              className="w-4 h-4"
              style={{ color: 'var(--success)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </motion.svg>
            <div>
              <div className="text-[8px] font-semibold" style={{ color: 'var(--success)' }}>
                Transaction Recorded
              </div>
              <div className="text-[6px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <span>Balances updated</span>
                <span>•</span>
                <span>Data locked</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default FundingStage
