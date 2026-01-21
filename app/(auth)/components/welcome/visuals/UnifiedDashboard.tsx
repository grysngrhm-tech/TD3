'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface UnifiedDashboardProps {
  progress?: number
  className?: string
}

// Extended project data for virtual scrolling effect
const allProjects = [
  { project: 'Oak Heights', status: 'funded', statusLabel: 'Funded', amount: 45200 },
  { project: 'Pine Valley', status: 'staged', statusLabel: 'Staged', amount: 128500 },
  { project: 'Cedar Park', status: 'review', statusLabel: 'Review', amount: 89750 },
  { project: 'Maple Ridge', status: 'funded', statusLabel: 'Funded', amount: 67300 },
  { project: 'Birch Lane', status: 'staged', statusLabel: 'Staged', amount: 112400 },
  { project: 'Elm Court', status: 'funded', statusLabel: 'Funded', amount: 93200 },
  { project: 'Spruce Way', status: 'review', statusLabel: 'Review', amount: 156800 },
  { project: 'Willow Creek', status: 'staged', statusLabel: 'Staged', amount: 78400 },
  { project: 'Aspen Grove', status: 'funded', statusLabel: 'Funded', amount: 201300 },
  { project: 'Hickory Hill', status: 'review', statusLabel: 'Review', amount: 134600 },
]

export function UnifiedDashboard({ progress = 0, className = '' }: UnifiedDashboardProps) {
  // Detect mobile for scaled-up rendering
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past - stats keep growing positively

  // Stats accumulate with scroll progress - growth accelerates past progress=1
  const growthMultiplier = progress > 1 ? 1 + (progress - 1) * 0.5 : 1
  const loanCount = 8 + Math.floor(progress * 20 * growthMultiplier) // 8 to 28+, keeps growing
  const drawCount = 3 + Math.floor(progress * 15 * growthMultiplier) // 3 to 18+, keeps growing
  const weeklyTotal = 1200000 + (progress * 3000000 * growthMultiplier) // $1.2M to $4.2M+, keeps growing

  // Virtual scroll: which rows are visible shifts as progress increases
  // At progress 0, show rows 0-3. As progress increases, window slides down faster
  const rowWindowStart = Math.floor(progress * 8) // slides through data faster with extended progress
  const visibleRowCount = 4
  const visibleRows = allProjects.slice(
    rowWindowStart % allProjects.length,
    (rowWindowStart % allProjects.length) + visibleRowCount
  )
  // Handle wraparound
  if (visibleRows.length < visibleRowCount) {
    visibleRows.push(...allProjects.slice(0, visibleRowCount - visibleRows.length))
  }

  // NO deconstruction for Solutions section - dashboard stays contained and centered

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${(amount / 1000).toFixed(0)}K`
  }

  const stats = [
    { label: 'Active Loans', value: loanCount.toString(), colorVar: '--accent' },
    { label: 'Pending Draws', value: drawCount.toString(), colorVar: '--info' },
    { label: 'This Week', value: formatCurrency(weeklyTotal), colorVar: '--success', isMoney: true },
  ]

  // Mobile: scale up the dashboard for readability
  const mobileScale = isMobile ? 1.15 : 1
  const baseScale = 0.9 + Math.min(progress, 1) * 0.1

  return (
    <div className={`relative w-full h-44 sm:h-52 md:h-64 flex items-center justify-center ${className}`}>
      {/* Dashboard frame - stays centered and contained */}
      <motion.div
        className="relative w-full max-w-xs overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--elevation-3)',
          transform: `scale(${baseScale * mobileScale})`,
          opacity: Math.min(1, progress * 3),
        }}
      >
        {/* Header bar */}
        <div
          className="h-6 flex items-center px-2 gap-2"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="w-3.5 h-3.5 flex items-center justify-center"
            style={{
              background: 'var(--accent)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <span className="text-[10px] sm:text-[5px] font-bold text-white">TD3</span>
          </div>
          <div className="flex-1" />
          {/* Live indicator */}
          <div className="flex items-center gap-1">
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: 'var(--success)' }}
            />
            <span className="text-[10px] sm:text-[6px]" style={{ color: 'var(--text-muted)' }}>Live</span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-1.5 space-y-1">
          {/* Stats row - values grow with scroll */}
          <motion.div
            className="flex gap-1"
            style={{
              opacity: progress > 0.1 ? 1 : progress * 10,
              transform: `translateY(${Math.max(0, (0.2 - progress) * 20)}px)`,
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="flex-1 p-1"
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div className="text-[10px] sm:text-[6px]" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </div>
                <div
                  className={`text-[11px] sm:text-[10px] font-semibold ${stat.isMoney ? 'font-mono' : ''}`}
                  style={{
                    color: `var(${stat.colorVar})`,
                    fontVariantNumeric: stat.isMoney ? 'tabular-nums' : undefined,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Table with virtual scrolling rows */}
          <motion.div
            className="overflow-hidden"
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              opacity: progress > 0.25 ? 1 : Math.max(0, (progress - 0.1) * 6),
            }}
          >
            {/* Table header */}
            <div
              className="flex text-[10px] sm:text-[6px] font-semibold px-1 py-0.5"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div className="w-1/3">Project</div>
              <div className="w-1/3">Status</div>
              <div className="w-1/3 text-right">Amount</div>
            </div>

            {/* Visible rows - scroll through as progress increases */}
            {visibleRows.map((row, i) => {
              // Stagger row appearance based on progress
              const rowDelay = i * 0.08
              const rowOpacity = Math.min(1, Math.max(0, (progress - 0.3 - rowDelay) * 5))

              return (
                <div
                  key={`${row.project}-${rowWindowStart}-${i}`}
                  className="flex text-[10px] sm:text-[6px] px-1 py-0.5 items-center"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                    background: i % 2 === 1 ? 'var(--bg-secondary)' : 'transparent',
                    opacity: rowOpacity,
                  }}
                >
                  <div
                    className="w-1/3 font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {row.project}
                  </div>
                  <div className="w-1/3">
                    <span
                      className="px-1 py-0.5 text-[10px] sm:text-[5px] font-semibold inline-flex items-center"
                      style={{
                        background: row.status === 'funded' ? 'var(--success-muted)' :
                                   row.status === 'staged' ? 'var(--info-muted)' : 'var(--accent-muted)',
                        color: row.status === 'funded' ? 'var(--success)' :
                               row.status === 'staged' ? 'var(--info)' : 'var(--accent)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      {row.statusLabel}
                    </span>
                  </div>
                  <div
                    className="w-1/3 text-right font-mono"
                    style={{
                      color: 'var(--text-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${row.amount.toLocaleString()}
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>
      </motion.div>

      {/* Converging elements at low progress - merge into dashboard */}
      {progress < 0.5 && (
        <>
          {[
            { x: -60, y: -30 },
            { x: 60, y: -25 },
            { x: -50, y: 35 },
            { x: 55, y: 30 },
          ].map((el, i) => (
            <div
              key={i}
              className="absolute w-5 h-7"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--elevation-1)',
                transform: `translate(${el.x * (1 - progress * 2)}px, ${el.y * (1 - progress * 2)}px)`,
                opacity: 1 - (progress * 2),
              }}
            />
          ))}
        </>
      )}

      {/* Success checkmark appears at completion */}
      <motion.div
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--success)',
          boxShadow: '0 2px 8px var(--success-glow)',
          transform: `scale(${progress > 0.7 ? 1 : 0})`,
          opacity: progress > 0.7 ? 1 : 0,
        }}
      >
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

    </div>
  )
}

export default UnifiedDashboard
