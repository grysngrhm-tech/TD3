'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { ProjectWithDraws, DrawWithProject } from './BuilderTimeline'
import { StagedDrawCell } from './StagedDrawCell'

type TimelineProjectRowProps = {
  project: ProjectWithDraws
  stagedDraws: DrawWithProject[]
  isHovered: boolean
  animationDelay?: number
  rowHeight?: number
}

/**
 * TimelineProjectRow - Fixed left column row for a project in Gantt view
 * 
 * Features:
 * - Clickable project name linking to project page
 * - Mini progress ring showing % of loan drawn (only if > 0%)
 * - Staged draw indicator with pulsing animation
 * - Clean, compact layout without individual collapse
 */
export function TimelineProjectRow({
  project,
  stagedDraws,
  isHovered,
  animationDelay = 0,
  rowHeight = 40
}: TimelineProjectRowProps) {
  const router = useRouter()

  // Calculate progress percentage
  const progress = useMemo(() => {
    const loanAmount = project.loan_amount || 0
    const spent = project.total_spent || 0
    if (loanAmount === 0) return 0
    return Math.min((spent / loanAmount) * 100, 100)
  }, [project.loan_amount, project.total_spent])

  // Progress ring properties
  const ringSize = 24
  const strokeWidth = 2.5
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Determine progress color based on percentage
  const progressColor = useMemo(() => {
    if (progress >= 100) return 'var(--error)'
    if (progress >= 90) return 'var(--warning)'
    return 'var(--accent)'
  }, [progress])

  const handleProjectClick = () => {
    router.push(`/projects/${project.id}`)
  }

  const projectDisplay = project.project_code || project.name || 'Unnamed Project'

  return (
    <motion.div
      className="px-3 flex items-center gap-3 border-b transition-colors"
      style={{ 
        height: rowHeight,
        borderColor: 'var(--border-subtle)',
        background: isHovered ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent'
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
    >
      {/* Progress Ring - only show if progress > 0 */}
      {progress > 0 ? (
        <div className="relative flex-shrink-0">
          <svg
            width={ringSize}
            height={ringSize}
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--bg-hover)"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={progressColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.6, delay: animationDelay + 0.1, ease: 'easeOut' }}
            />
          </svg>
          {/* Percentage text */}
          <div 
            className="absolute inset-0 flex items-center justify-center text-[8px] font-bold"
            style={{ color: progressColor, fontFamily: 'var(--font-mono)' }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      ) : (
        // Placeholder to maintain alignment
        <div className="flex-shrink-0" style={{ width: ringSize }} />
      )}

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={handleProjectClick}
          className="font-medium text-sm truncate block w-full text-left hover:underline transition-colors text-text-primary"
          
          title={`View ${projectDisplay}`}
        >
          {projectDisplay}
        </button>
      </div>

      {/* Staged Draw Indicator */}
      <div className="w-16 flex-shrink-0 flex justify-center">
        {stagedDraws.length > 0 ? (
          <StagedDrawCell 
            draws={stagedDraws} 
            projectId={project.id}
          />
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </div>
    </motion.div>
  )
}
