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
  isExpanded: boolean
  hasDraws: boolean
  onToggleExpand: () => void
  animationDelay?: number
  rowHeight?: number
}

/**
 * TimelineProjectRow - Fixed left column row for a project
 * 
 * Features:
 * - Collapsible with chevron toggle
 * - Clickable project name linking to project page
 * - Mini progress ring showing % of loan drawn (only if > 0%)
 * - Staged draw indicator with pulsing animation
 * - Compact layout
 */
export function TimelineProjectRow({
  project,
  stagedDraws,
  isHovered,
  isExpanded,
  hasDraws,
  onToggleExpand,
  animationDelay = 0,
  rowHeight = 36
}: TimelineProjectRowProps) {
  const router = useRouter()

  // Calculate progress percentage
  const progress = useMemo(() => {
    const loanAmount = project.loan_amount || 0
    const spent = project.total_spent || 0
    if (loanAmount === 0) return 0
    return Math.min((spent / loanAmount) * 100, 100)
  }, [project.loan_amount, project.total_spent])

  // Progress ring properties - smaller for compact view
  const ringSize = 22
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

  const handleProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/projects/${project.id}`)
  }

  const projectDisplay = project.project_code || project.name || 'Unnamed Project'

  return (
    <motion.div
      className="px-2 flex items-center gap-2 border-b transition-colors cursor-pointer"
      style={{ 
        height: rowHeight,
        borderColor: 'var(--border-subtle)',
        background: isHovered ? 'rgba(var(--accent-rgb), 0.03)' : 'transparent'
      }}
      onClick={hasDraws ? onToggleExpand : undefined}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
    >
      {/* Expand/Collapse Chevron */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); if (hasDraws) onToggleExpand() }}
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
        style={{ 
          color: hasDraws ? 'var(--text-muted)' : 'transparent',
          cursor: hasDraws ? 'pointer' : 'default'
        }}
        animate={{ rotate: isExpanded ? 0 : -90 }}
        transition={{ duration: 0.15 }}
      >
        {hasDraws && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </motion.button>

      {/* Progress Ring - only show if progress > 0 */}
      {progress > 0 && (
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
              transition={{ duration: 0.5, delay: animationDelay + 0.1, ease: 'easeOut' }}
            />
          </svg>
          {/* Percentage text */}
          <div 
            className="absolute inset-0 flex items-center justify-center text-[7px] font-bold"
            style={{ color: progressColor }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      )}

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={handleProjectClick}
          className="font-medium text-xs truncate block w-full text-left hover:underline transition-colors"
          style={{ color: 'var(--text-primary)' }}
          title={`View ${projectDisplay}`}
        >
          {projectDisplay}
        </button>
      </div>

      {/* Staged Draw Indicator */}
      <div className="w-14 flex-shrink-0 flex justify-center">
        {stagedDraws.length > 0 ? (
          <StagedDrawCell 
            draws={stagedDraws} 
            projectId={project.id}
          />
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </div>
    </motion.div>
  )
}
