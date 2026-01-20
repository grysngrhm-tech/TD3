'use client'

import { motion } from 'framer-motion'

interface UnifiedDashboardProps {
  progress?: number
  className?: string
}

export function UnifiedDashboard({ progress = 0, className = '' }: UnifiedDashboardProps) {
  return (
    <div className={`relative w-full h-48 md:h-64 flex items-center justify-center ${className}`}>
      {/* Dashboard frame - styled like actual TD3 interface */}
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
        {/* Header bar - styled like TD3 header */}
        <div
          className="h-8 flex items-center px-3 gap-2"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* TD3 Logo */}
          <div
            className="w-5 h-5 flex items-center justify-center"
            style={{
              background: 'var(--accent)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <span className="text-[8px] font-bold text-white">TD3</span>
          </div>
          <div className="flex-1" />
          {/* User avatar placeholder */}
          <div
            className="w-5 h-5 rounded-full"
            style={{ background: 'var(--bg-hover)' }}
          />
        </div>

        {/* Dashboard content */}
        <div className="p-3 space-y-2">
          {/* Stats row - using TD3 card styling */}
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: progress > 0.2 ? 1 : 0,
              y: progress > 0.2 ? 0 : 10,
            }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {[
              { label: 'Active Loans', value: '12', colorVar: '--accent' },
              { label: 'Pending Draws', value: '8', colorVar: '--info' },
              { label: 'This Week', value: '$2.4M', colorVar: '--success', isMoney: true },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 p-2"
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  className="text-[9px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {stat.label}
                </div>
                <div
                  className={`text-sm font-semibold ${stat.isMoney ? 'font-mono' : ''}`}
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

          {/* Table preview - mimicking TD3 table style */}
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
            {/* Table header - TD3 style */}
            <div
              className="flex text-[9px] font-semibold px-2 py-1.5"
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
            {/* Table rows with TD3 status badges */}
            {[
              { project: 'Oak Heights', status: 'review', statusLabel: 'Review', amount: '$45,200' },
              { project: 'Pine Valley', status: 'staged', statusLabel: 'Staged', amount: '$128,500' },
              { project: 'Cedar Park', status: 'funded', statusLabel: 'Funded', amount: '$89,750' },
            ].map((row, i) => (
              <motion.div
                key={row.project}
                className="flex text-[9px] px-2 py-1.5 items-center"
                style={{
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                  background: i % 2 === 1 ? 'var(--bg-secondary)' : 'transparent',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: progress > 0.5 + (i * 0.1) ? 1 : 0,
                  x: progress > 0.5 + (i * 0.1) ? 0 : -10,
                }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-1/3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {row.project}
                </div>
                <div className="w-1/3">
                  {/* Using TD3 badge styling */}
                  <span
                    className="px-1.5 py-0.5 text-[8px] font-semibold inline-flex items-center"
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
                  {row.amount}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Converging elements (documents flying into dashboard) */}
      {progress < 0.5 && (
        <>
          {[
            { x: -80, y: -40 },
            { x: 80, y: -30 },
            { x: -60, y: 50 },
            { x: 70, y: 40 },
          ].map((el, i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-10"
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

      {/* Success checkmark - using TD3 success color */}
      <motion.div
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
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
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
    </div>
  )
}

export default UnifiedDashboard
