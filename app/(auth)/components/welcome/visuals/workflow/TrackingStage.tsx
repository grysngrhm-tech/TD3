'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface TrackingStageProps {
  progress?: number
}

/**
 * Stage 6: Track Across the Portfolio
 * Visualizes portfolio-level dashboards with animated counters,
 * sparklines, trend charts, and live activity feed
 */
export function TrackingStage({ progress = 0 }: TrackingStageProps) {
  // Derive all values from scroll progress
  const dashboardReveal = Math.min(1, progress * 2) // 0-50%
  const dataFill = Math.max(0, Math.min(1, (progress - 0.15) * 1.8)) // 15-70%
  const chartReveal = Math.max(0, Math.min(1, (progress - 0.35) * 2.5)) // 35-75%
  const metricsUpdate = Math.max(0, Math.min(1, (progress - 0.55) * 2.5)) // 55-95%

  // Animated counter values (odometer style)
  const activeLoans = useMemo(() => {
    const target = 12
    return Math.floor(8 + dataFill * (target - 8))
  }, [dataFill])

  const totalFunded = useMemo(() => {
    const target = 3.6
    return (2.4 + dataFill * (target - 2.4)).toFixed(1)
  }, [dataFill])

  const avgUtilization = useMemo(() => {
    const target = 70
    return Math.floor(62 + dataFill * (target - 62))
  }, [dataFill])

  // Mini sparkline data for each stat card
  const sparklineData = {
    loans: [6, 7, 8, 9, 10, 11, 12],
    funded: [1.8, 2.1, 2.4, 2.8, 3.1, 3.4, 3.6],
    utilization: [55, 58, 62, 65, 67, 69, 70],
  }

  // Bar chart data
  const barData = [
    { month: 'Oct', value: 45, color: '--accent' },
    { month: 'Nov', value: 68, color: '--accent' },
    { month: 'Dec', value: 52, color: '--accent' },
    { month: 'Jan', value: 85, color: '--success' },
  ]

  // Line chart points (trend overlay)
  const lineChartPoints = useMemo(() => {
    const heights = [45, 68, 52, 85]
    return heights.map((h, i) => ({
      x: (i / 3) * 100,
      y: 100 - h,
    }))
  }, [])

  // Activity feed items
  const activityItems = [
    { action: 'Draw funded', project: 'Oak Heights', time: '2m ago', icon: 'success' },
    { action: 'Draw staged', project: 'Pine Valley', time: '15m ago', icon: 'info' },
    { action: 'Budget imported', project: 'Maple Lane', time: '1h ago', icon: 'accent' },
    { action: 'Invoice matched', project: 'Oak Heights', time: '2h ago', icon: 'success' },
  ]

  // Render mini sparkline SVG
  const renderSparkline = (data: number[], color: string, delay: number) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((val - min) / range) * 100
      return `${x},${y}`
    }).join(' ')

    const visiblePoints = Math.floor((dataFill - delay) * data.length * 2)

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <motion.polyline
          points={points}
          fill="none"
          stroke={`var(${color})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(1, visiblePoints / data.length) }}
          transition={{ duration: 0.5 }}
          style={{ opacity: 0.6 }}
        />
        {/* Latest point pulse */}
        {dataFill > 0.8 && (
          <motion.circle
            cx="100"
            cy={100 - ((data[data.length - 1] - min) / range) * 100}
            r="6"
            fill={`var(${color})`}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </svg>
    )
  }

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
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--success)' }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                Live
              </span>
            </div>
          </div>

          {/* Stats row with sparklines */}
          <div className="p-2">
            <div className="flex gap-1.5 mb-2">
              {[
                { label: 'Active Loans', value: activeLoans.toString(), color: '--accent', sparkline: sparklineData.loans, delay: 0 },
                { label: 'Total Funded', value: `$${totalFunded}M`, color: '--success', sparkline: sparklineData.funded, delay: 0.1 },
                { label: 'Avg Util.', value: `${avgUtilization}%`, color: '--info', sparkline: sparklineData.utilization, delay: 0.2 },
              ].map((stat, i) => {
                const statOpacity = Math.min(1, Math.max(0, (dataFill - i * 0.08) * 3))

                return (
                  <motion.div
                    key={stat.label}
                    className="flex-1 p-1.5 rounded relative overflow-hidden"
                    style={{
                      background: 'var(--bg-secondary)',
                      opacity: statOpacity,
                    }}
                  >
                    {/* Mini sparkline background */}
                    <div className="absolute inset-0 opacity-30 p-1">
                      {renderSparkline(stat.sparkline, stat.color, stat.delay)}
                    </div>

                    <p className="text-[6px] relative z-10" style={{ color: 'var(--text-muted)' }}>
                      {stat.label}
                    </p>
                    <motion.p
                      className="text-[10px] font-bold font-mono relative z-10"
                      style={{ color: `var(${stat.color})` }}
                      key={stat.value}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {stat.value}
                    </motion.p>
                  </motion.div>
                )
              })}
            </div>

            {/* Mini bar chart with trend line overlay */}
            <motion.div
              className="p-2 rounded-lg relative"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                opacity: chartReveal,
              }}
            >
              <p className="text-[7px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Monthly Funding ($K)
              </p>
              <div className="relative h-12">
                {/* Bar chart */}
                <div className="absolute inset-0 flex items-end justify-between gap-1">
                  {barData.map((bar, i) => {
                    const barHeight = chartReveal * bar.value
                    const isLatest = i === barData.length - 1

                    return (
                      <div key={bar.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex-1 flex items-end">
                          <motion.div
                            className="w-full rounded-t relative"
                            style={{
                              height: `${barHeight}%`,
                              background: isLatest
                                ? 'var(--success)'
                                : 'var(--accent)',
                            }}
                            initial={{ height: 0 }}
                            animate={{ height: `${barHeight}%` }}
                            transition={{ duration: 0.3, delay: i * 0.08 }}
                          >
                            {/* Pulse on latest bar */}
                            {isLatest && metricsUpdate > 0.5 && (
                              <motion.div
                                className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                                style={{
                                  background: 'var(--success)',
                                  boxShadow: '0 0 8px var(--success)',
                                }}
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            )}
                          </motion.div>
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

                {/* Trend line overlay */}
                {chartReveal > 0.5 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ bottom: '14px', height: 'calc(100% - 14px)' }}
                  >
                    <motion.polyline
                      points={lineChartPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="var(--warning)"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      style={{ opacity: 0.7 }}
                    />
                  </svg>
                )}
              </div>
            </motion.div>

            {/* Recent activity feed */}
            {metricsUpdate > 0.2 && (
              <motion.div
                className="mt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[7px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Recent Activity
                  </p>
                  <motion.div
                    className="w-1 h-1 rounded-full"
                    style={{ background: 'var(--success)' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="space-y-1 max-h-16 overflow-hidden">
                  {activityItems.map((activity, i) => {
                    const itemProgress = metricsUpdate - 0.2
                    const itemVisible = itemProgress > i * 0.15
                    const iconColor = activity.icon === 'success'
                      ? '--success'
                      : activity.icon === 'info'
                      ? '--info'
                      : '--accent'

                    return (
                      <motion.div
                        key={i}
                        className="flex items-center gap-2 px-1.5 py-1 rounded"
                        style={{
                          background: 'var(--bg-secondary)',
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{
                          opacity: itemVisible ? 1 : 0,
                          x: itemVisible ? 0 : -10,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `var(${iconColor}-muted)`,
                          }}
                          animate={itemVisible && i === 0 ? {
                            boxShadow: [`0 0 0px var(${iconColor})`, `0 0 6px var(${iconColor})`, `0 0 0px var(${iconColor})`],
                          } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <svg
                            className="w-2 h-2"
                            style={{ color: `var(${iconColor})` }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {activity.icon === 'success' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : activity.icon === 'info' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            )}
                          </svg>
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[6px] truncate" style={{ color: 'var(--text-primary)' }}>
                            {activity.action} - {activity.project}
                          </p>
                        </div>
                        <span className="text-[5px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {activity.time}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Real-time update indicator */}
      {metricsUpdate > 0.7 && (
        <motion.div
          className="absolute bottom-1 right-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
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
