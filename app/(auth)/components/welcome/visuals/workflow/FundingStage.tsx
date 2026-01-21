'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface FundingStageProps {
  progress?: number
}

/**
 * Stage 5: Fund with Controls
 * Visualizes the controlled funding step with typing animations,
 * field checkmarks, authorization, processing state, and celebration
 */
export function FundingStage({ progress = 0 }: FundingStageProps) {
  // Derive all values from scroll progress
  const panelReveal = Math.min(1, progress * 2.5) // 0-40%
  const dateSelected = progress > 0.25
  const wireRefEntered = progress > 0.45
  const authorizationShown = progress > 0.55
  const processingState = progress > 0.65 && progress < 0.8
  const fundingComplete = progress > 0.8
  const lockReveal = Math.max(0, Math.min(1, (progress - 0.85) * 6.67)) // 85-100%

  // Typing animation progress for wire reference
  const wireRefText = 'WIRE-2026-0120-001'
  const typingProgress = Math.max(0, Math.min(1, (progress - 0.45) * 5))
  const visibleChars = Math.floor(typingProgress * wireRefText.length)
  const displayedWireRef = wireRefText.slice(0, visibleChars)
  const showCursor = wireRefEntered && !authorizationShown

  // Confetti particles for celebration
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.3,
      color: ['var(--success)', 'var(--info)', 'var(--accent)', 'var(--warning)'][i % 4],
      size: 3 + Math.random() * 3,
    }))
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
      {/* Confetti celebration particles */}
      {fundingComplete && lockReveal > 0.3 && (
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
                y: 200,
                opacity: [1, 1, 0],
                rotate: 360,
                x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
              }}
              transition={{
                duration: 1.5,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Funding control panel */}
      <motion.div
        className="w-full max-w-[180px] md:max-w-[200px]"
        style={{
          opacity: panelReveal,
          transform: `translateY(${(1 - panelReveal) * 20}px)`,
        }}
      >
        <div
          className="rounded-xl overflow-hidden relative"
          style={{
            background: 'var(--bg-card)',
            border: fundingComplete
              ? '1px solid var(--success)'
              : '1px solid var(--border-subtle)',
            boxShadow: fundingComplete
              ? '0 4px 16px rgba(16, 185, 129, 0.2)'
              : 'var(--elevation-2)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: fundingComplete
                ? 'color-mix(in srgb, var(--success) 10%, var(--bg-secondary))'
                : 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                style={{ color: fundingComplete ? 'var(--success)' : 'var(--accent)' }}
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
              className="text-[7px] px-1.5 py-0.5 rounded-full"
              style={{
                background: fundingComplete ? 'var(--success-muted)' : 'var(--accent-muted)',
                color: fundingComplete ? 'var(--success)' : 'var(--accent)',
              }}
            >
              {fundingComplete ? 'Complete' : 'Oak Heights'}
            </span>
          </div>

          {/* Form fields */}
          <div className="p-3 space-y-2">
            {/* Amount */}
            <div className="relative">
              <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Wire Amount
              </label>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded font-mono text-[10px] font-semibold"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  $45,600.00
                </div>
                {/* Checkmark for validated field */}
                {panelReveal > 0.5 && (
                  <motion.div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Funding Date */}
            <div className="relative">
              <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Funding Date
              </label>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded text-[9px] flex items-center justify-between"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: dateSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: dateSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <span>{dateSelected ? 'Jan 20, 2026' : 'Select date...'}</span>
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {/* Checkmark for validated field */}
                {dateSelected && (
                  <motion.div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Wire Reference with typing animation */}
            <div className="relative">
              <label className="text-[7px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Wire Reference (optional)
              </label>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded text-[9px] font-mono relative"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: wireRefEntered ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: wireRefEntered ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {wireRefEntered ? displayedWireRef : 'Enter reference...'}
                  {/* Typing cursor */}
                  {showCursor && (
                    <motion.span
                      className="inline-block w-0.5 h-3 ml-0.5"
                      style={{ background: 'var(--accent)' }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </div>
                {/* Checkmark for validated field */}
                {authorizationShown && (
                  <motion.div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--success)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Authorization badge */}
            {authorizationShown && (
              <motion.div
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{
                  background: 'color-mix(in srgb, var(--info) 8%, var(--bg-secondary))',
                  border: '1px solid color-mix(in srgb, var(--info) 20%, transparent)',
                }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* User avatar */}
                <motion.div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--info)' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </motion.div>
                <div>
                  <p className="text-[7px] font-medium" style={{ color: 'var(--info)' }}>
                    Authorized by John Smith
                  </p>
                  <p className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                    fund_draws permission verified
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action button */}
          <div
            className="px-3 py-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              className="w-full py-2 rounded-lg text-[9px] font-semibold flex items-center justify-center gap-1.5"
              style={{
                background: fundingComplete ? 'var(--success)' : 'var(--accent)',
                color: 'white',
                boxShadow: fundingComplete
                  ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                  : '0 4px 12px rgba(149, 6, 6, 0.25)',
              }}
            >
              {processingState ? (
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
                  Processing...
                </>
              ) : fundingComplete ? (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lock indicator for completed funding */}
      {lockReveal > 0 && (
        <motion.div
          className="absolute -top-1 -right-1 md:right-4 md:top-2"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0, opacity: lockReveal }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--success)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Auto-update indicator */}
      {fundingComplete && lockReveal > 0.5 && (
        <motion.div
          className="absolute bottom-1 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--success) 10%, var(--bg-secondary))',
              border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
            }}
          >
            <motion.svg
              className="w-2.5 h-2.5"
              style={{ color: 'var(--success)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </motion.svg>
            <span className="text-[7px]" style={{ color: 'var(--success)' }}>
              Balances updated, data locked
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default FundingStage
