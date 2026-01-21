'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'

interface TrackingStageProps {
  progress?: number
}

/**
 * Stage 6: Track Across the Portfolio
 *
 * Timing phases - OVERLAPPING for fluid animation:
 * - 0-20%:  Dashboard Reveal (main panel scales in)
 * - 12-35%: Stats Cards (overlaps with reveal)
 * - 25-55%: Sparklines (overlaps with stats)
 * - 45-75%: Main Chart (overlaps with sparklines)
 * - 65-88%: Activity Feed (overlaps with chart)
 * - 80-97%: Live Updates (overlaps with activity)
 * - 92-100%: Completion (overlaps with live)
 */
export function TrackingStage({ progress = 0 }: TrackingStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Dashboard Reveal (0-20%)
  const dashboardReveal = Math.min(1, progress / 0.20)

  // Phase 2: Stats Cards (12-35%)
  const statsProgress = Math.max(0, Math.min(1, (progress - 0.12) / 0.23))

  // Phase 3: Sparklines (25-55%)
  const sparklineProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.30))

  // Phase 4: Main Chart (45-75%)
  const chartProgress = Math.max(0, Math.min(1, (progress - 0.45) / 0.30))

  // Phase 5: Activity Feed (65-88%)
  const activityProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.23))

  // Phase 6: Live Updates (80-97%)
  const liveProgress = Math.max(0, Math.min(1, (progress - 0.80) / 0.17))

  // Phase 7: Completion (92-100%)
  const completeProgress = Math.max(0, Math.min(1, (progress - 0.92) / 0.08))

  // Animated counter values (4 stats now)
  const activeLoans = useMemo(() => {
    const target = 12
    return Math.floor(8 + statsProgress * (target - 8))
  }, [statsProgress])

  const totalFunded = useMemo(() => {
    const target = 3.6
    return (2.4 + statsProgress * (target - 2.4)).toFixed(1)
  }, [statsProgress])

  const avgUtilization = useMemo(() => {
    const target = 70
    return Math.floor(62 + statsProgress * (target - 62))
  }, [statsProgress])

  const avgDaysToFund = useMemo(() => {
    const target = 3.2
    return (4.5 - statsProgress * (4.5 - target)).toFixed(1)
  }, [statsProgress])

  // Sparkline data for each stat (expanded)
  const sparklineData = {
    loans: [6, 7, 8, 9, 10, 11, 12],
    funded: [1.8, 2.1, 2.4, 2.8, 3.1, 3.4, 3.6],
    utilization: [55, 58, 62, 65, 67, 69, 70],
    days: [5.2, 4.8, 4.4, 4.1, 3.8, 3.5, 3.2],
  }

  // Bar chart data
  const barData = [
    { month: 'Oct', value: 45 },
    { month: 'Nov', value: 68 },
    { month: 'Dec', value: 52 },
    { month: 'Jan', value: 85 },
  ]

  // Activity feed items (expanded to 6)
  const activityItems = [
    { action: 'Draw funded', project: 'Oak Heights', time: '2m ago', icon: 'success' },
    { action: 'Draw staged', project: 'Pine Valley', time: '15m ago', icon: 'info' },
    { action: 'Budget imported', project: 'Maple Lane', time: '1h ago', icon: 'accent' },
    { action: 'Invoice matched', project: 'Oak Heights', time: '2h ago', icon: 'success' },
    { action: 'Draw approved', project: 'Cedar Ridge', time: '3h ago', icon: 'success' },
    { action: 'Wire initiated', project: 'Pine Valley', time: '4h ago', icon: 'info' },
  ]

  // Stats configuration
  const stats = [
    { label: 'Active Loans', value: activeLoans.toString(), color: '--accent', sparkline: sparklineData.loans },
    { label: 'Total Funded', value: `$${totalFunded}M`, color: '--success', sparkline: sparklineData.funded },
    { label: 'Avg Util.', value: `${avgUtilization}%`, color: '--info', sparkline: sparklineData.utilization },
    { label: 'Avg Days', value: avgDaysToFund, color: '--warning', sparkline: sparklineData.days },
  ]

  // Render mini sparkline
  const renderSparkline = (data: number[], color: string) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((val - min) / range) * 100
      return `${x},${y}`
    }).join(' ')

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
          animate={{ pathLength: sparklineProgress }}
          transition={{ duration: 0.6 }}
          style={{ opacity: 0.5 }}
        />
        {sparklineProgress > 0.8 && (
          <motion.circle
            cx="100"
            cy={100 - ((data[data.length - 1] - min) / range) * 100}
            r="6"
            fill={`var(${color})`}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </svg>
    )
  }

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
      <motion.div
        className="w-full max-w-[95%]"
        style={{
          opacity: dashboardReveal,
          transform: `scale(${0.88 + dashboardReveal * 0.12})`,
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
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <span className="text-[7px] font-bold text-white">TD3</span>
              </div>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Portfolio Overview
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Alert indicator */}
              {liveProgress > 0.3 && (
                <motion.div
                  className="relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ background: 'var(--success)' }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
              )}
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
          </div>

          {/* Stats row - 4 cards now */}
          <div className="p-2">
            <div className="grid grid-cols-4 gap-1 mb-2">
              {stats.map((stat, i) => {
                const statVisible = statsProgress > i * 0.2
                const showSparkline = sparklineProgress > 0

                return (
                  <motion.div
                    key={stat.label}
                    className="p-1.5 rounded relative overflow-hidden"
                    style={{
                      background: 'var(--bg-secondary)',
                      opacity: statVisible ? 1 : 0,
                      transform: `translateY(${statVisible ? 0 : 10}px)`,
                      transition: 'all 0.3s ease-out',
                    }}
                  >
                    {/* Sparkline background */}
                    {showSparkline && (
                      <div className="absolute inset-0 opacity-30 p-1">
                        {renderSparkline(stat.sparkline, stat.color)}
                      </div>
                    )}

                    <p className="text-[5px] relative z-10 truncate" style={{ color: 'var(--text-muted)' }}>
                      {stat.label}
                    </p>
                    <motion.p
                      className="text-[9px] font-bold font-mono relative z-10"
                      style={{ color: `var(${stat.color})` }}
                      key={stat.value}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {stat.value}
                    </motion.p>
                  </motion.div>
                )
              })}
            </div>

            {/* Bar chart */}
            {chartProgress > 0 && (
              <motion.div
                className="p-2 rounded-lg relative"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[7px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Monthly Funding ($K)
                  </p>
                  {chartProgress > 0.6 && (
                    <motion.span
                      className="text-[5px] px-1 py-0.5 rounded"
                      style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      +18% MoM
                    </motion.span>
                  )}
                </div>
                <div className="relative h-14">
                  {/* Bar chart */}
                  <div className="absolute inset-0 flex items-end justify-between gap-1.5">
                    {barData.map((bar, i) => {
                      const barVisible = chartProgress > i * 0.2
                      const barHeight = barVisible ? bar.value : 0
                      const isLatest = i === barData.length - 1

                      return (
                        <div key={bar.month} className="flex-1 flex flex-col items-center">
                          <div className="w-full flex-1 flex items-end">
                            <motion.div
                              className="w-full rounded-t relative"
                              style={{
                                background: isLatest ? 'var(--success)' : 'var(--accent)',
                              }}
                              initial={{ height: 0 }}
                              animate={{ height: `${barHeight}%` }}
                              transition={{ duration: 0.4, delay: i * 0.1 }}
                            >
                              {/* Pulse on latest */}
                              {isLatest && liveProgress > 0 && (
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
                          <span className="text-[6px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            {bar.month}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Trend line */}
                  {chartProgress > 0.5 && (
                    <svg
                      className="absolute inset-0 w-full pointer-events-none"
                      viewBox="0 0 100 85"
                      preserveAspectRatio="none"
                      style={{ top: 0, height: 'calc(100% - 16px)' }}
                    >
                      <motion.polyline
                        points="0,55 33,32 66,48 100,15"
                        fill="none"
                        stroke="var(--warning)"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        style={{ opacity: 0.7 }}
                      />
                    </svg>
                  )}
                </div>
              </motion.div>
            )}

            {/* Activity feed */}
            {activityProgress > 0 && (
              <motion.div
                className="mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[7px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Recent Activity
                  </p>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--success)' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="space-y-1 max-h-20 overflow-hidden">
                  {activityItems.map((activity, i) => {
                    const itemVisible = activityProgress > i * 0.15
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
                          opacity: itemVisible ? 1 : 0,
                          transform: `translateX(${itemVisible ? 0 : -10}px)`,
                          transition: 'all 0.3s ease-out',
                        }}
                      >
                        <motion.div
                          className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `var(${iconColor}-muted)`,
                          }}
                          animate={itemVisible && i === 0 && liveProgress > 0 ? {
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

      {/* Auto-updating badge */}
      {liveProgress > 0.5 && (
        <motion.div
          className="absolute bottom-2 right-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full"
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
            <span className="text-[6px] font-medium" style={{ color: 'var(--success)' }}>
              Auto-updating
            </span>
          </div>
        </motion.div>
      )}

      {/* Generate Report hint */}
      {completeProgress > 0 && (
        <motion.div
          className="absolute bottom-2 left-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <svg className="w-3 h-3" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[6px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Generate Report
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default TrackingStage
