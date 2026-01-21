'use client'

import { motion } from 'framer-motion'

interface TrackingStageProps {
  progress?: number
}

/**
 * Stage 6: Track Across the Portfolio
 * Visualizes portfolio-level dashboards with real-time visibility
 */
export function TrackingStage({ progress = 0 }: TrackingStageProps) {
  // Derive all values from scroll progress
  const dashboardReveal = Math.min(1, progress * 2) // 0-50%
  const dataFill = Math.max(0, Math.min(1, (progress - 0.2) * 2)) // 20-70%
  const chartReveal = Math.max(0, Math.min(1, (progress - 0.4) * 2.5)) // 40-80%
  const metricsUpdate = Math.max(0, Math.min(1, (progress - 0.6) * 2.5)) // 60-100%

  // Metrics that grow with progress
  const activeLoans = 8 + Math.floor(dataFill * 4)
  const totalFunded = 2.4 + dataFill * 1.2
  const avgUtilization = 62 + Math.floor(dataFill * 8)

  // Bar chart data
  const barData = [
    { month: 'Oct', value: 45, color: '--accent' },
    { month: 'Nov', value: 68, color: '--accent' },
    { month: 'Dec', value: 52, color: '--accent' },
    { month: 'Jan', value: 85, color: '--success' },
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2">
      <motion.div
        className="w-full max-w-[200px] md:max-w-[240px]"
        style={{
          opacity: dashboardReveal,
          transform: `scale(${0.9 + dashboardReveal * 0.1})`,
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
              <div
                className="w-4 h-4 rounded flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <span className="text-[6px] font-bold text-white">TD3</span>
              </div>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Portfolio Overview
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--success)' }}
              />
              <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                Live
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="p-2">
            <div className="flex gap-1.5 mb-2">
              {[
                { label: 'Active Loans', value: activeLoans.toString(), color: '--accent' },
                { label: 'Total Funded', value: `$${totalFunded.toFixed(1)}M`, color: '--success' },
                { label: 'Avg Util.', value: `${avgUtilization}%`, color: '--info' },
              ].map((stat, i) => {
                const statOpacity = Math.min(1, Math.max(0, (dataFill - i * 0.1) * 3))

                return (
                  <motion.div
                    key={stat.label}
                    className="flex-1 p-1.5 rounded"
                    style={{
                      background: 'var(--bg-secondary)',
                      opacity: statOpacity,
                    }}
                  >
                    <p className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                      {stat.label}
                    </p>
                    <p
                      className="text-[10px] font-bold font-mono"
                      style={{ color: `var(${stat.color})` }}
                    >
                      {stat.value}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            {/* Mini bar chart */}
            <motion.div
              className="p-2 rounded-lg"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                opacity: chartReveal,
              }}
            >
              <p className="text-[7px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Monthly Funding ($K)
              </p>
              <div className="flex items-end justify-between gap-1 h-12">
                {barData.map((bar, i) => {
                  const barHeight = chartReveal * bar.value
                  const isLatest = i === barData.length - 1

                  return (
                    <div key={bar.month} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex-1 flex items-end">
                        <motion.div
                          className="w-full rounded-t"
                          style={{
                            height: `${barHeight}%`,
                            background: isLatest
                              ? 'var(--success)'
                              : 'var(--accent)',
                            boxShadow: isLatest && metricsUpdate > 0.5
                              ? '0 0 8px rgba(16, 185, 129, 0.4)'
                              : 'none',
                          }}
                        />
                      </div>
                      <span
                        className="text-[6px] mt-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {bar.month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Recent activity */}
            {metricsUpdate > 0.3 && (
              <motion.div
                className="mt-2 space-y-1"
                style={{ opacity: metricsUpdate }}
              >
                <p className="text-[7px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Recent Activity
                </p>
                {[
                  { action: 'Draw funded', project: 'Oak Heights', time: '2m ago', icon: 'success' },
                  { action: 'Draw staged', project: 'Pine Valley', time: '15m ago', icon: 'info' },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-1.5 py-1 rounded"
                    style={{
                      background: 'var(--bg-secondary)',
                      opacity: metricsUpdate > 0.5 + i * 0.2 ? 1 : 0,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex items-center justify-center"
                      style={{
                        background: activity.icon === 'success'
                          ? 'var(--success-muted)'
                          : 'var(--info-muted)',
                      }}
                    >
                      <svg
                        className="w-2 h-2"
                        style={{
                          color: activity.icon === 'success'
                            ? 'var(--success)'
                            : 'var(--info)',
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {activity.icon === 'success' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[6px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {activity.action} - {activity.project}
                      </p>
                    </div>
                    <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                      {activity.time}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Real-time update indicator */}
      {metricsUpdate > 0.7 && (
        <motion.div
          className="absolute bottom-1 right-2"
          style={{ opacity: (metricsUpdate - 0.7) * 3 }}
        >
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--success) 10%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--success)' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[6px]" style={{ color: 'var(--success)' }}>
              Auto-updating
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default TrackingStage
