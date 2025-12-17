'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DrawRequest, Project } from '@/types/database'

type GanttDrawBarProps = {
  draw: DrawRequest
  project: Project
  previousDate: Date | null
  currentDate: Date
  columnWidth: number
  onClick: () => void
  isHighlighted: boolean
}

/**
 * GanttDrawBar - Interactive Gantt bar for a single draw
 * 
 * Features:
 * - Visual bar spanning from previous draw date to current
 * - Hover effects: scale up, shadow, rich tooltip
 * - Click to open detail panel
 * - Gradient intensity based on amount
 */
export function GanttDrawBar({
  draw,
  project,
  previousDate,
  currentDate,
  columnWidth,
  onClick,
  isHighlighted
}: GanttDrawBarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Calculate bar width based on time span (visual representation)
  // For simplicity, we'll use a fixed minimum width that looks good
  const barWidth = Math.max(columnWidth * 0.7, 60)
  const barHeight = 28

  // Calculate gradient intensity based on draw amount relative to loan
  const loanAmount = project.loan_amount || 100000
  const amountRatio = Math.min(draw.total_amount / (loanAmount * 0.3), 1) // Cap at 30% of loan for max intensity
  const gradientOpacity = 0.7 + (amountRatio * 0.3) // Range from 0.7 to 1.0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }, [])

  // Get status color
  const statusColors: Record<string, string> = {
    funded: 'var(--accent)',
    approved: 'var(--success)',
    staged: 'var(--warning)',
    review: 'var(--info)',
    draft: 'var(--text-muted)',
  }
  const barColor = statusColors[draw.status || 'draft'] || 'var(--accent)'

  return (
    <>
      <motion.button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        className="relative rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          width: barWidth,
          height: barHeight,
          background: `linear-gradient(135deg, ${barColor}, ${barColor}dd)`,
          opacity: gradientOpacity,
          boxShadow: isHovered || isHighlighted 
            ? `0 4px 12px ${barColor}40, 0 0 0 2px ${barColor}30`
            : '0 1px 3px rgba(0,0,0,0.1)',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: isHovered ? 1.05 : 1, 
          opacity: gradientOpacity,
          y: isHovered ? -2 : 0
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25,
          opacity: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.98 }}
        aria-label={`Draw #${draw.draw_number}: ${formatCurrency(draw.total_amount)}`}
      >
        {/* Draw number and amount */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white drop-shadow-sm">
            #{draw.draw_number}
          </span>
        </div>

        {/* Amount badge */}
        <div 
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full text-[9px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded"
          style={{ 
            background: 'var(--bg-card)',
            color: barColor,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            opacity: isHovered || isHighlighted ? 1 : 0.7,
          }}
        >
          {formatCurrency(draw.total_amount)}
        </div>
      </motion.button>

      {/* Rich Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="fixed z-[100] pointer-events-none"
            style={{
              left: tooltipPosition.x + 15,
              top: tooltipPosition.y - 10,
            }}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            <div 
              className="rounded-lg shadow-xl overflow-hidden min-w-[220px]"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Header */}
              <div 
                className="px-3 py-2 flex items-center justify-between"
                style={{ 
                  background: `${barColor}20`,
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Draw #{draw.draw_number}
                </span>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                  style={{ 
                    background: `${barColor}20`,
                    color: barColor
                  }}
                >
                  {draw.status}
                </span>
              </div>

              {/* Content */}
              <div className="px-3 py-2 space-y-2">
                {/* Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Amount</span>
                  <span className="text-sm font-bold" style={{ color: barColor }}>
                    {formatCurrency(draw.total_amount)}
                  </span>
                </div>

                {/* Project */}
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Project</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {project.project_code || project.name}
                  </span>
                </div>

                {/* Date Range */}
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Period</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {previousDate ? formatDate(previousDate) : 'Start'} → {formatDate(currentDate)}
                  </span>
                </div>

                {/* Request Date */}
                {draw.request_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Requested</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(draw.request_date)}
                    </span>
                  </div>
                )}

                {/* Funded Date */}
                {draw.funded_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Funded</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                      {formatDate(draw.funded_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer - Click hint */}
              <div 
                className="px-3 py-1.5 text-center text-[10px]"
                style={{ 
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)'
                }}
              >
                Click to view details
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

