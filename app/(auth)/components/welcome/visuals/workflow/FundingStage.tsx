'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'

interface FundingStageProps {
  progress?: number
}

/**
 * Stage 5: Fund with Controls
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-15%:  Panel Entry (funding form slides up)
 * - 8-25%:  Wire Breakdown (overlaps with entry)
 * - 18-38%: Amount Display (overlaps with breakdown)
 * - 30-48%: Bank Info (overlaps with amount)
 * - 40-58%: Memo Entry (overlaps with bank)
 * - 50-70%: Authorization (overlaps with memo)
 * - 62-82%: Processing (overlaps with auth)
 * - 75-92%: Success (overlaps with processing)
 * - 85-100%: Lock (overlaps with success)
 */
export function FundingStage({ progress = 0 }: FundingStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Panel Entry (0-15%)
  const panelEntryProgress = Math.min(1, progress / 0.15)

  // Phase 2: Wire Breakdown (8-25%)
  const breakdownProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.17))

  // Phase 3: Amount Display (18-38%)
  const amountProgress = Math.max(0, Math.min(1, (progress - 0.18) / 0.20))

  // Phase 4: Bank Info (30-48%)
  const bankProgress = Math.max(0, Math.min(1, (progress - 0.30) / 0.18))

  // Phase 5: Memo Entry (40-58%)
  const memoProgress = Math.max(0, Math.min(1, (progress - 0.40) / 0.18))

  // Phase 6: Authorization (50-70%)
  const authProgress = Math.max(0, Math.min(1, (progress - 0.50) / 0.20))

  // Phase 7: Processing (62-82%)
  const processingProgress = Math.max(0, Math.min(1, (progress - 0.62) / 0.20))

  // Phase 8: Success (75-92%)
  const successProgress = Math.max(0, Math.min(1, (progress - 0.75) / 0.17))

  // Phase 9: Lock (85-100%)
  const lockProgress = Math.max(0, Math.min(1, (progress - 0.85) / 0.15))

  // Wire breakdown data
  const wireBreakdown = [
    { id: 'D4', amount: 27400 },
    { id: 'D5', amount: 18200 },
  ]
  const wireTotal = wireBreakdown.reduce((sum, d) => sum + d.amount, 0)

  // Amount counting animation
  const displayedAmount = Math.floor(wireTotal * Math.min(amountProgress * 1.5, 1))

  // Memo typing animation
  const memoText = 'Oak Heights - Draws 4,5 - Jan 2026'
  const visibleMemoChars = Math.floor(memoProgress * memoText.length)
  const displayedMemo = memoText.slice(0, visibleMemoChars)
  const showMemoCursor = memoProgress > 0 && memoProgress < 1

  // Processing states - now 5 steps
  const showProcessing = processingProgress > 0
  const processingSteps = ['Initiating', 'Validating', 'Sending', 'Confirming', 'Complete']
  const processingStep = Math.min(Math.floor(processingProgress * 5), 4)

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
        className="w-full max-w-[90%]"
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
          <div className="p-2.5 space-y-2">
            {/* Wire breakdown section - shows draws being funded */}
            {breakdownProgress > 0 && (
              <motion.div
                className="p-1.5 rounded-lg"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <p className="text-[6px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  Wire Breakdown
                </p>
                <div className="space-y-0.5">
                  {wireBreakdown.map((draw, i) => {
                    const lineVisible = breakdownProgress > (i + 1) * 0.4
                    return (
                      <motion.div
                        key={draw.id}
                        className="flex items-center justify-between"
                        style={{
                          opacity: lineVisible ? 1 : 0,
                          transform: `translateX(${lineVisible ? 0 : -8}px)`,
                          transition: 'all 0.2s ease-out',
                        }}
                      >
                        <span className="text-[7px]" style={{ color: 'var(--text-secondary)' }}>
                          Draw #{draw.id}
                        </span>
                        <span className="text-[7px] font-mono" style={{ color: 'var(--text-primary)' }}>
                          ${draw.amount.toLocaleString()}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
                {breakdownProgress > 0.8 && (
                  <motion.div
                    className="flex items-center justify-between pt-1 mt-1"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-[7px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Wire Total
                    </span>
                    <span className="text-[8px] font-bold font-mono" style={{ color: 'var(--accent)' }}>
                      ${wireTotal.toLocaleString()}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

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

            {/* Bank info section */}
            {bankProgress > 0 && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Recipient Bank
                </label>
                <div
                  className="px-2 py-1.5 rounded flex items-center gap-2"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: bankProgress > 0.5 ? '1px solid var(--success)' : '1px solid var(--border)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--info)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  <div className="flex-1">
                    <span className="text-[8px] font-medium block" style={{ color: 'var(--text-primary)' }}>
                      First National Bank
                    </span>
                    <span className="text-[6px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      ****4521 • Verified
                    </span>
                  </div>
                  {bankProgress > 0.7 && (
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

            {/* Memo field */}
            {memoProgress > 0 && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Wire Memo
                </label>
                <div
                  className="px-2 py-1.5 rounded text-[8px] font-mono relative"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: memoProgress > 0.9 ? '1px solid var(--success)' : memoProgress > 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: memoProgress > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {memoProgress > 0 ? displayedMemo : 'Enter memo...'}
                  {showMemoCursor && (
                    <motion.span
                      className="inline-block w-0.5 h-3 ml-0.5"
                      style={{ background: 'var(--accent)' }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  )}
                </div>
              </motion.div>
            )}

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
                {/* Dual control indicator for large amounts */}
                {authProgress > 0.7 && (
                  <motion.div
                    className="mt-1.5 pt-1.5 flex items-center gap-1"
                    style={{ borderTop: '1px solid color-mix(in srgb, var(--info) 20%, transparent)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <svg className="w-2.5 h-2.5" style={{ color: 'var(--info)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                      Single approval sufficient (&lt;$100K)
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Processing timeline - expanded steps */}
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
                <div className="flex items-center justify-between">
                  {processingSteps.slice(0, 4).map((step, i) => (
                    <div key={step} className="flex items-center gap-1">
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: i <= processingStep ? 'var(--warning)' : 'var(--border)',
                        }}
                        animate={i === processingStep ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.5, repeat: i === processingStep ? Infinity : 0 }}
                      />
                      <span
                        className="text-[5px]"
                        style={{
                          color: i <= processingStep ? 'var(--warning)' : 'var(--text-muted)',
                          fontWeight: i === processingStep ? 600 : 400,
                        }}
                      >
                        {step}
                      </span>
                      {i < 3 && (
                        <div
                          className="w-2 h-px"
                          style={{ background: i < processingStep ? 'var(--warning)' : 'var(--border)' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {/* Wire type indicator */}
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[5px] px-1 py-0.5 rounded" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
                    ACH/Wire
                  </span>
                  <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                    Same-day processing
                  </span>
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
