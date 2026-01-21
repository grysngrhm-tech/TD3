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
 * - 0-18%:  Dashboard Reveal (main panel scales in)
 * - 10-32%: Project Cards (overlaps with reveal)
 * - 25-50%: Stats Cards (overlaps with projects)
 * - 42-68%: Donut Chart (overlaps with stats)
 * - 58-82%: Activity Feed (overlaps with chart)
 * - 72-92%: Live Updates (overlaps with activity)
 * - 85-100%: Completion (overlaps with live)
 */
export function TrackingStage({ progress = 0 }: TrackingStageProps) {
  // Phase progress calculations with OVERLAPPING timing

  // Phase 1: Dashboard Reveal (0-18%)
  const dashboardReveal = Math.min(1, progress / 0.18)

  // Phase 2: Project Cards (10-32%)
  const projectsProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.22))

  // Phase 3: Stats Cards (25-50%)
  const statsProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.25))

  // Phase 4: Donut Chart (42-68%)
  const chartProgress = Math.max(0, Math.min(1, (progress - 0.42) / 0.26))

  // Phase 5: Activity Feed (58-82%)
  const activityProgress = Math.max(0, Math.min(1, (progress - 0.58) / 0.24))

  // Phase 6: Live Updates (72-92%)
  const liveProgress = Math.max(0, Math.min(1, (progress - 0.72) / 0.20))

  // Phase 7: Completion (85-100%)
  const completeProgress = Math.max(0, Math.min(1, (progress - 0.85) / 0.15))

  // Projects data
  const projects = [
    { name: 'Oak Heights', status: 'active', utilization: 68, health: 'good', draws: 4 },
    { name: 'Pine Valley', status: 'active', utilization: 45, health: 'good', draws: 3 },
    { name: 'Maple Ridge', status: 'pending', utilization: 0, health: 'neutral', draws: 0 },
  ]

  // Animated counter values
  const activeLoans = useMemo(() => {
    const target = 12
    return Math.floor(8 + statsProgress * (target - 8))
  }, [statsProgress])

  const totalFunded = useMemo(() => {
    const target = 3.6
    return (2.4 + statsProgress * (target - 2.4)).toFixed(1)
  }, [statsProgress])

  // Donut chart allocation data
  const allocations = [
    { category: 'Structure', percent: 45, color: 'var(--accent)' },
    { category: 'MEP', percent: 28, color: 'var(--success)' },
    { category: 'Finishes', percent: 15, color: 'var(--warning)' },
    { category: 'Site Work', percent: 12, color: 'var(--info)' },
  ]

  // Activity feed items
  const activityItems = [
    { action: 'Draw funded', project: 'Oak Heights', amount: '$27.4K', time: '2m', icon: 'success' },
    { action: 'Draw staged', project: 'Pine Valley', amount: '$34.1K', time: '15m', icon: 'info' },
    { action: 'Budget imported', project: 'Maple Lane', amount: '$245K', time: '1h', icon: 'accent' },
    { action: 'Invoice matched', project: 'Oak Heights', amount: '$12.4K', time: '2h', icon: 'success' },
  ]

  // Stats configuration
  const stats = [
    { label: 'Active', value: activeLoans.toString(), color: '--accent' },
    { label: 'Funded', value: `$${totalFunded}M`, color: '--success' },
  ]

  // Calculate donut path
  const getDonutPath = (startPercent: number, endPercent: number, radius: number = 40) => {
    const start = (startPercent / 100) * Math.PI * 2 - Math.PI / 2
    const end = (endPercent / 100) * Math.PI * 2 - Math.PI / 2
    const largeArc = endPercent - startPercent > 50 ? 1 : 0
    const x1 = 50 + radius * Math.cos(start)
    const y1 = 50 + radius * Math.sin(start)
    const x2 = 50 + radius * Math.cos(end)
    const y2 = 50 + radius * Math.sin(end)
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
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
              {/* Status counts */}
              <span className="text-[6px]" style={{ color: 'var(--text-muted)' }}>
                12 Active • 3 Pending • 2 Complete
              </span>
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

          {/* Main content */}
          <div className="p-2">
            {/* Project cards row */}
            {projectsProgress > 0 && (
              <motion.div
                className="flex gap-1.5 mb-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {projects.map((project, i) => {
                  const projectVisible = projectsProgress > i * 0.3
                  const healthColor = project.health === 'good' ? 'var(--success)' : 'var(--text-muted)'

                  return (
                    <motion.div
                      key={project.name}
                      className="flex-1 p-1.5 rounded-lg relative overflow-hidden"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        opacity: projectVisible ? 1 : 0,
                        transform: `translateY(${projectVisible ? 0 : 8}px)`,
                        transition: 'all 0.3s ease-out',
                      }}
                    >
                      {/* Health indicator dot */}
                      <div
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                        style={{ background: healthColor }}
                      />
                      <p className="text-[7px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {project.name}
                      </p>
                      <p className="text-[5px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        {project.status === 'active' ? `${project.draws} draws` : 'Pending'}
                      </p>
                      {/* Utilization bar */}
                      <div
                        className="h-1 w-full rounded-full overflow-hidden"
                        style={{ background: 'var(--border)' }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: healthColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${project.utilization}%` }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                        />
                      </div>
                      <p className="text-[5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {project.utilization}% utilized
                      </p>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {/* Stats + Chart row */}
            <div className="flex gap-2 mb-2">
              {/* Stats cards */}
              <div className="flex flex-col gap-1 w-16">
                {stats.map((stat, i) => {
                  const statVisible = statsProgress > i * 0.4

                  return (
                    <motion.div
                      key={stat.label}
                      className="p-1.5 rounded-lg"
                      style={{
                        background: 'var(--bg-secondary)',
                        opacity: statVisible ? 1 : 0,
                        transform: `translateX(${statVisible ? 0 : -10}px)`,
                        transition: 'all 0.3s ease-out',
                      }}
                    >
                      <p className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                        {stat.label}
                      </p>
                      <motion.p
                        className="text-[10px] font-bold font-mono"
                        style={{ color: `var(${stat.color})` }}
                        key={stat.value}
                        initial={{ y: 3, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {stat.value}
                      </motion.p>
                    </motion.div>
                  )
                })}
              </div>

              {/* Donut chart with legend */}
              {chartProgress > 0 && (
                <motion.div
                  className="flex-1 flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {/* Donut */}
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {allocations.map((alloc, i) => {
                        const startPercent = allocations.slice(0, i).reduce((sum, a) => sum + a.percent, 0)
                        const endPercent = startPercent + alloc.percent
                        const animatedEnd = startPercent + alloc.percent * chartProgress

                        return (
                          <motion.path
                            key={alloc.category}
                            d={getDonutPath(startPercent, animatedEnd)}
                            fill="none"
                            stroke={alloc.color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                          />
                        )
                      })}
                    </svg>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        $3.6M
                      </span>
                      <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                        Total
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-col gap-0.5">
                    {allocations.map((alloc, i) => {
                      const legendVisible = chartProgress > 0.3 + i * 0.15

                      return (
                        <motion.div
                          key={alloc.category}
                          className="flex items-center gap-1"
                          style={{
                            opacity: legendVisible ? 1 : 0,
                            transform: `translateX(${legendVisible ? 0 : 5}px)`,
                            transition: 'all 0.2s ease-out',
                          }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-sm"
                            style={{ background: alloc.color }}
                          />
                          <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                            {alloc.category}
                          </span>
                          <span className="text-[5px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {alloc.percent}%
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Activity feed */}
            {activityProgress > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[7px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Recent Activity
                  </p>
                  {liveProgress > 0.3 && (
                    <motion.span
                      className="text-[5px] px-1 py-0.5 rounded"
                      style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Busier than usual
                    </motion.span>
                  )}
                </div>
                <div className="space-y-0.5 max-h-16 overflow-hidden">
                  {activityItems.map((activity, i) => {
                    const itemVisible = activityProgress > i * 0.2
                    const iconColor = activity.icon === 'success'
                      ? '--success'
                      : activity.icon === 'info'
                      ? '--info'
                      : '--accent'

                    return (
                      <motion.div
                        key={i}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded"
                        style={{
                          background: 'var(--bg-secondary)',
                          opacity: itemVisible ? 1 : 0,
                          transform: `translateX(${itemVisible ? 0 : -10}px)`,
                          transition: 'all 0.3s ease-out',
                        }}
                      >
                        {/* Project avatar */}
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[5px] font-bold"
                          style={{
                            background: `var(${iconColor}-muted)`,
                            color: `var(${iconColor})`,
                          }}
                        >
                          {activity.project.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[6px] truncate" style={{ color: 'var(--text-primary)' }}>
                            {activity.action}
                          </p>
                          <p className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                            {activity.project}
                          </p>
                        </div>
                        <span className="text-[6px] font-mono font-medium" style={{ color: `var(${iconColor})` }}>
                          {activity.amount}
                        </span>
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

          {/* Quick actions footer */}
          {completeProgress > 0 && (
            <motion.div
              className="px-2 py-1.5 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center gap-2">
                {[
                  { icon: 'M12 4v16m8-8H4', label: 'New Draw' },
                  { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Report' },
                  { icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', label: 'Export' },
                ].map((action, i) => (
                  <motion.div
                    key={action.label}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ background: 'var(--border)' }}
                  >
                    <svg className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                    <span className="text-[5px]" style={{ color: 'var(--text-secondary)' }}>
                      {action.label}
                    </span>
                  </motion.div>
                ))}
              </div>
              {/* Date range */}
              <span className="text-[5px]" style={{ color: 'var(--text-muted)' }}>
                Jan 2026
              </span>
            </motion.div>
          )}
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
    </div>
  )
}

export default TrackingStage
