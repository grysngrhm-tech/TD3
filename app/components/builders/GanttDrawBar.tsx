'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DrawRequest, Project } from '@/types/database'

type GanttDrawBarProps = {
  draw: DrawRequest
  project: Project
  previousDate: Date | null
  currentDate: Date
  positionPercent: number  // 0-100, position within the month column
  columnWidth: number
  onClick: () => void
  isHighlighted: boolean
}

/**
 * GanttDrawBar - Interactive Gantt bar for a single draw
 * 
 * Features:
 * - Positioned based on date within month column
 * - Hover effects: scale up, shadow, rich tooltip
 * - Click to open detail panel
 * - Compact pill shape with amount inside
 */
export function GanttDrawBar({
  draw,
  project,
  previousDate,
  currentDate,
  positionPercent,
  columnWidth,
  onClick,
  isHighlighted
}: GanttDrawBarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Bar dimensions - compact
  const barHeight = 20
  const barWidth = Math.max(columnWidth * 0.8, 50)
  
  // Position from left edge of column based on day of month
  const leftOffset = Math.max(2, (positionPercent / 100) * (columnWidth - barWidth / 2) - barWidth / 2)

  // Calculate gradient intensity based on draw amount relative to loan
  const loanAmount = project.loan_amount || 100000
  const amountRatio = Math.min(draw.total_amount / (loanAmount * 0.3), 1)
  const gradientOpacity = 0.8 + (amountRatio * 0.2)

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${Math.round(amount / 1000)}k`
    }
    return `$${amount}`
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
        className="absolute rounded-full cursor-pointer focus:outline-none focus-visible:ring-2"
        style={{
          left: leftOffset,
          width: barWidth,
          height: barHeight,
          background: `linear-gradient(135deg, ${barColor}, ${barColor}dd)`,
          opacity: gradientOpacity,
          boxShadow: isHovered || isHighlighted 
            ? `0 2px 8px ${barColor}40, 0 0 0 1px ${barColor}30`
            : '0 1px 2px rgba(0,0,0,0.1)',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: isHovered ? 10 : 1,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: isHovered ? 1.05 : 1, 
          opacity: gradientOpacity,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25,
          opacity: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
        aria-label={`Draw #${draw.draw_number}: ${formatCurrency(draw.total_amount)}`}
      >
        {/* Draw amount inside bar */}
        <div className="absolute inset-0 flex items-center justify-center px-1">
          <span className="text-[9px] font-bold text-white drop-shadow-sm truncate">
            {formatCurrency(draw.total_amount)}
          </span>
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
              className="rounded-lg shadow-xl overflow-hidden min-w-[200px]"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Header */}
              <div 
                className="px-2.5 py-1.5 flex items-center justify-between"
                style={{ 
                  background: `${barColor}15`,
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Draw #{draw.draw_number}
                </span>
                <span 
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize"
                  style={{ 
                    background: `${barColor}20`,
                    color: barColor
                  }}
                >
                  {draw.status}
                </span>
              </div>

              {/* Content */}
              <div className="px-2.5 py-2 space-y-1.5">
                {/* Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Amount</span>
                  <span className="text-xs font-bold" style={{ color: barColor }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(draw.total_amount)}
                  </span>
                </div>

                {/* Project */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Project</span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {project.project_code || project.name}
                  </span>
                </div>

                {/* Funded Date */}
                {draw.funded_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Funded</span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--success)' }}>
                      {formatDate(draw.funded_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer - Click hint */}
              <div 
                className="px-2.5 py-1 text-center text-[9px]"
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
