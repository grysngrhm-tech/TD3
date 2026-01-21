'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'

interface ReviewStageProps {
  progress?: number
}

/**
 * Stage 3: Review with Full Context
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-20%:  Panel Reveal (scales up and fades in)
 * - 12-35%: Stats Population (overlaps with reveal)
 * - 25-50%: Budget Bar (overlaps with stats)
 * - 40-65%: Historical Context (overlaps with budget bar)
 * - 55-80%: Flag Analysis (overlaps with history)
 * - 70-88%: Action Ready (overlaps with flags)
 * - 82-100%: Approval (overlaps with action)
 */
export function ReviewStage({ progress = 0 }: ReviewStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Panel Reveal (0-20%)
  const panelReveal = Math.min(1, progress / 0.20)

  // Phase 2: Stats Population (12-35%)
  const statsProgress = Math.max(0, Math.min(1, (progress - 0.12) / 0.23))

  // Phase 3: Budget Bar (25-50%)
  const budgetBarProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.25))

  // Phase 4: Historical Context (40-65%)
  const historyProgress = Math.max(0, Math.min(1, (progress - 0.40) / 0.25))

  // Phase 5: Flag Analysis (55-80%)
  const flagProgress = Math.max(0, Math.min(1, (progress - 0.55) / 0.25))

  // Phase 6: Action Ready (70-88%)
  const actionProgress = Math.max(0, Math.min(1, (progress - 0.70) / 0.18))

  // Phase 7: Approval (82-100%)
  const approvalProgress = Math.max(0, Math.min(1, (progress - 0.82) / 0.18))

  // Financial data
  const requestedAmount = useMemo(() => {
    const target = 27400
    return Math.floor(target * Math.min(statsProgress * 2, 1))
  }, [statsProgress])

  const remainingBudget = useMemo(() => {
    const target = 142600
    return Math.floor(target * Math.min(statsProgress * 2, 1))
  }, [statsProgress])

  const budgetUtilization = 16 // 16%
  const displayedUtilization = Math.floor(budgetUtilization * budgetBarProgress)

  // Review stats data
  const reviewStats = [
    { label: 'Requested Amount', value: `$${requestedAmount.toLocaleString()}`, status: 'neutral' },
    { label: 'Remaining Budget', value: `$${remainingBudget.toLocaleString()}`, status: 'good' },
    { label: 'Invoice Matches', value: '4 of 4', status: 'good' },
    { label: 'Validation Status', value: 'Passed', status: 'good' },
  ]

  // Historical draws data
  const pastDraws = [
    { number: 1, amount: '$24,200', date: 'Nov 15', status: 'funded' },
    { number: 2, amount: '$31,800', date: 'Dec 1', status: 'funded' },
    { number: 3, amount: '$18,400', date: 'Dec 20', status: 'funded' },
  ]

  // Calculate which stats are visible
  const visibleStats = Math.ceil(statsProgress * reviewStats.length)

  // Flag shake animation triggers
  const flagShaking = flagProgress > 0.2 && flagProgress < 0.6

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
      className="relative w-full h-full flex items-center justify-center p-2"
      style={{ transform: `scale(${mobileScale})`, transformOrigin: 'center center' }}
    >
      {/* Grid layout: main panel + sidebar */}
      <div className="w-full max-w-[95%] flex gap-3 lg:gap-4">
        {/* Main review panel */}
        <motion.div
          className="flex-1 min-w-0"
          style={{
            opacity: panelReveal,
            transform: `scale(${0.92 + panelReveal * 0.08})`,
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
              className="text-[7px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
            >
              In Review
            </span>
          </div>

          {/* Summary stats */}
          <div className="p-2 space-y-1">
            {reviewStats.map((stat, i) => {
              const isVisible = i < visibleStats

              return (
                <motion.div
                  key={stat.label}
                  className="flex items-center justify-between px-2 py-1 rounded"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    background: 'var(--bg-secondary)',
                    transform: `translateY(${isVisible ? 0 : 8}px)`,
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    {stat.label}
                  </span>
                  <span
                    className="text-[8px] font-semibold font-mono"
                    style={{
                      color: stat.status === 'good' ? 'var(--success)' : 'var(--text-primary)',
                    }}
                  >
                    {stat.value}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Budget utilization bar */}
          {budgetBarProgress > 0 && (
            <motion.div
              className="mx-2 mb-2 p-2 rounded-lg"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Budget Utilization
                </span>
                <span className="text-[8px] font-mono font-semibold" style={{ color: 'var(--success)' }}>
                  {displayedUtilization}%
                </span>
              </div>
              <div
                className="h-2 w-full rounded-full overflow-hidden"
                style={{ background: 'color-mix(in srgb, var(--success) 20%, var(--bg-primary))' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--success)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayedUtilization}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {budgetBarProgress > 0.5 && (
                <motion.div
                  className="mt-1 flex items-center justify-between"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                    This draw: $27.4K
                  </span>
                  <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                    Avg: $24.2K
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Flag detail with shake animation */}
          {flagProgress > 0 && (
            <motion.div
              className="mx-2 mb-2 p-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--warning) 8%, var(--bg-secondary))',
                border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
              }}
              initial={{ opacity: 0, y: -5 }}
              animate={{
                opacity: flagProgress,
                y: 0,
                x: flagShaking ? [0, -2, 2, -2, 2, 0] : 0,
              }}
              transition={{
                duration: flagShaking ? 0.4 : 0.3,
              }}
            >
              <div className="flex items-start gap-2">
                <motion.svg
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--warning)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={flagShaking ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3, repeat: flagShaking ? 2 : 0 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </motion.svg>
                <div className="flex-1">
                  <p className="text-[7px] font-semibold" style={{ color: 'var(--warning)' }}>
                    Budget Variance Detected
                  </p>
                  <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Framing category is 8% above project average
                  </p>
                  {flagProgress > 0.6 && (
                    <motion.div
                      className="mt-1 pt-1 flex items-center gap-2"
                      style={{ borderTop: '1px solid color-mix(in srgb, var(--warning) 20%, transparent)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <span className="text-[5px] px-1 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' }}>
                        Non-blocking
                      </span>
                      <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                        May proceed with approval
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Audit trail hint */}
          {actionProgress > 0 && (
            <motion.div
              className="mx-2 mb-2 flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ background: 'var(--bg-secondary)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: actionProgress }}
            >
              <svg className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                Last reviewed by <span style={{ color: 'var(--text-secondary)' }}>J. Smith</span> • 2h ago
              </span>
            </motion.div>
          )}

          {/* Action buttons */}
          <div
            className="px-2 py-2 flex gap-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <motion.button
              className="flex-1 py-1.5 rounded text-[7px] font-medium"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                opacity: actionProgress,
              }}
            >
              Request Changes
            </motion.button>
            <motion.button
              className="relative flex-1 py-1.5 rounded text-[7px] font-semibold overflow-hidden"
              style={{
                background: approvalProgress > 0.4 ? 'var(--success)' : 'var(--bg-secondary)',
                border: approvalProgress > 0.4 ? 'none' : '1px solid var(--border)',
                color: approvalProgress > 0.4 ? 'white' : 'var(--text-secondary)',
                boxShadow: approvalProgress > 0.4 ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
                opacity: actionProgress,
              }}
            >
              {/* Cursor animation before activation */}
              {actionProgress > 0.5 && approvalProgress < 0.4 && (
                <motion.div
                  className="absolute w-4 h-4 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
                    opacity: 0.4,
                  }}
                  initial={{ left: '20%', top: '50%', y: '-50%' }}
                  animate={{ left: '75%' }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              )}
              {approvalProgress > 0.4 ? (
                <span className="flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Approved
                </span>
              ) : (
                'Approve'
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

        {/* Historical context sidebar - inline, not absolute */}
        {historyProgress > 0 && (
          <motion.div
            className="w-24 md:w-28 lg:w-32 flex-shrink-0"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: historyProgress, x: 0 }}
          >
            <div
              className="rounded-lg p-2 h-full"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div className="flex items-center gap-1 mb-2">
                <svg className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[7px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Draw History
                </span>
              </div>
              <div className="space-y-1.5">
                {pastDraws.map((draw, i) => {
                  const drawVisible = historyProgress > (i + 1) * 0.25

                  return (
                    <motion.div
                      key={draw.number}
                      className="flex items-center gap-1.5"
                      style={{
                        opacity: drawVisible ? 1 : 0,
                        transform: `translateX(${drawVisible ? 0 : 8}px)`,
                        transition: 'all 0.3s ease-out',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: 'var(--success)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[6px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            #{draw.number}
                          </span>
                          <span className="text-[6px] font-mono" style={{ color: 'var(--success)' }}>
                            {draw.amount}
                          </span>
                        </div>
                        <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                          {draw.date}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              {historyProgress > 0.8 && (
                <motion.div
                  className="mt-2 pt-1.5 text-center"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-[6px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Total: $74,400
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ReviewStage
