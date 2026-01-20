'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface UnifiedDashboardProps {
  progress?: number
  className?: string
}

// Project data that keeps growing
const baseProjects = [
  { project: 'Oak Heights', status: 'funded', statusLabel: 'Funded', baseAmount: 45200 },
  { project: 'Pine Valley', status: 'staged', statusLabel: 'Staged', baseAmount: 128500 },
  { project: 'Cedar Park', status: 'review', statusLabel: 'Review', baseAmount: 89750 },
  { project: 'Maple Ridge', status: 'funded', statusLabel: 'Funded', baseAmount: 67300 },
  { project: 'Birch Lane', status: 'staged', statusLabel: 'Staged', baseAmount: 112400 },
]

export function UnifiedDashboard({ progress = 0, className = '' }: UnifiedDashboardProps) {
  // Continuous counters that keep incrementing
  const [loanCount, setLoanCount] = useState(12)
  const [drawCount, setDrawCount] = useState(8)
  const [weeklyTotal, setWeeklyTotal] = useState(2400000)
  const [visibleRows, setVisibleRows] = useState(3)
  const isVisible = useRef(false)

  useEffect(() => {
    isVisible.current = progress > 0.2

    const interval = setInterval(() => {
      if (isVisible.current) {
        // Slowly increment stats
        setWeeklyTotal(w => w + Math.random() * 5000)

        // Occasionally add a new loan or draw
        if (Math.random() < 0.02) setLoanCount(l => l + 1)
        if (Math.random() < 0.03) setDrawCount(d => d + 1)

        // Gradually reveal more rows
        if (visibleRows < baseProjects.length && Math.random() < 0.01) {
          setVisibleRows(v => Math.min(v + 1, baseProjects.length))
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [progress, visibleRows])

  useEffect(() => {
    isVisible.current = progress > 0.2
  }, [progress])

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

  return (
    <div className={`relative w-full h-32 md:h-36 flex items-center justify-center ${className}`}>
      {/* Dashboard frame */}
      <motion.div
        className="relative w-full max-w-xs overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--elevation-3)',
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: Math.min(1, progress * 2),
          scale: 0.9 + (progress * 0.1),
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Header bar */}
        <div
          className="h-7 flex items-center px-2.5 gap-2"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="w-4 h-4 flex items-center justify-center"
            style={{
              background: 'var(--accent)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <span className="text-[6px] font-bold text-white">TD3</span>
          </div>
          <div className="flex-1" />
          {/* Live indicator */}
          <motion.div
            className="flex items-center gap-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>Live</span>
          </motion.div>
        </div>

        {/* Dashboard content */}
        <div className="p-2 space-y-1.5">
          {/* Stats row with counting numbers */}
          <motion.div
            className="flex gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: progress > 0.2 ? 1 : 0,
              y: progress > 0.2 ? 0 : 10,
            }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex-1 p-1.5"
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  className="text-[7px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {stat.label}
                </div>
                <motion.div
                  className={`text-xs font-semibold ${stat.isMoney ? 'font-mono' : ''}`}
                  style={{
                    color: `var(${stat.colorVar})`,
                    fontVariantNumeric: stat.isMoney ? 'tabular-nums' : undefined,
                  }}
                  key={stat.value}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  {stat.value}
                </motion.div>
              </div>
            ))}
          </motion.div>

          {/* Table with accumulating rows */}
          <motion.div
            className="overflow-hidden"
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: progress > 0.4 ? 1 : 0,
              y: progress > 0.4 ? 0 : 10,
            }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {/* Table header */}
            <div
              className="flex text-[7px] font-semibold px-1.5 py-1"
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

            {/* Animated rows */}
            <AnimatePresence>
              {baseProjects.slice(0, visibleRows).map((row, i) => (
                <motion.div
                  key={row.project}
                  className="flex text-[7px] px-1.5 py-1 items-center"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                    background: i % 2 === 1 ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <div className="w-1/3 font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {row.project}
                  </div>
                  <div className="w-1/3">
                    <span
                      className="px-1 py-0.5 text-[6px] font-semibold inline-flex items-center"
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
                    ${row.baseAmount.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Converging elements */}
      {progress < 0.5 && (
        <>
          {[
            { x: -70, y: -35 },
            { x: 70, y: -25 },
            { x: -55, y: 40 },
            { x: 60, y: 35 },
          ].map((el, i) => (
            <motion.div
              key={i}
              className="absolute w-6 h-8"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--elevation-1)',
              }}
              initial={{ x: el.x, y: el.y, opacity: 1 }}
              animate={{
                x: el.x * (1 - progress * 2),
                y: el.y * (1 - progress * 2),
                opacity: 1 - progress * 2,
                scale: 1 - progress,
              }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </>
      )}

      {/* Success checkmark */}
      <motion.div
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--success)',
          boxShadow: '0 2px 8px var(--success-glow)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: progress > 0.8 ? 1 : 0,
          opacity: progress > 0.8 ? 1 : 0,
        }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
    </div>
  )
}

export default UnifiedDashboard
