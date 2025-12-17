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
  isStaged?: boolean
}

/**
 * GanttDrawBar - Interactive Gantt bar for a single draw
 * 
 * Features:
 * - Solid accent color for high visibility
 * - Amount displayed inside bar (rounded to nearest $1k)
 * - Pill shape with proper sizing
 * - Hover effects with rich tooltip
 */
export function GanttDrawBar({
  draw,
  project,
  previousDate,
  currentDate,
  positionPercent,
  columnWidth,
  onClick,
  isHighlighted,
  isStaged = false
}: GanttDrawBarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Bar dimensions - sized for readability
  const barHeight = 24
  const minBarWidth = 50
  const barWidth = Math.max(columnWidth * 0.85, minBarWidth)
  
  // Position from left edge of column
  const leftOffset = Math.max(4, (positionPercent / 100) * (columnWidth - barWidth) )

  // Format currency - round to nearest $1k for compact display
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${Math.round(amount / 1000)}k`
    }
    return `$${amount}`
  }

  const formatFullCurrency = (amount: number) => {
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

  // Solid colors for visibility - using CSS variables
  const barColor = isStaged ? 'var(--warning)' : 'var(--accent)'
  const displayAmount = formatCompactCurrency(draw.total_amount)

  return (
    <>
      <motion.button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        className="absolute cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{
          left: leftOffset,
          width: barWidth,
          height: barHeight,
          // Solid background color for visibility
          background: barColor,
          borderRadius: '9999px', // Pill shape
          boxShadow: isHovered || isHighlighted 
            ? `0 4px 12px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.2)`
            : '0 2px 4px rgba(0,0,0,0.15)',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: isHovered ? 10 : 1,
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: isHovered ? 1.05 : 1, 
          opacity: 1,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25,
        }}
        whileTap={{ scale: 0.98 }}
        aria-label={`Draw #${draw.draw_number}: ${formatFullCurrency(draw.total_amount)}`}
      >
        {/* Staged draw pulse animation */}
        {isStaged && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: barColor }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Amount text inside bar */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span 
            className="text-[11px] font-bold text-white tracking-tight"
            style={{ 
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {displayAmount}
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
              className="rounded-lg overflow-hidden min-w-[200px]"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--elevation-4)',
              }}
            >
              {/* Header */}
              <div 
                className="px-3 py-2 flex items-center justify-between"
                style={{ 
                  background: barColor,
                }}
              >
                <span className="font-semibold text-sm text-white">
                  Draw #{draw.draw_number}
                </span>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{ 
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }}
                >
                  {isStaged ? 'staged' : draw.status}
                </span>
              </div>

              {/* Content */}
              <div className="px-3 py-2.5 space-y-2">
                {/* Amount - prominent */}
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Amount</span>
                  <span 
                    className="text-sm font-bold"
                    style={{ 
                      color: barColor,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {formatFullCurrency(draw.total_amount)}
                  </span>
                </div>

                {/* Project */}
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Project</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {project.project_code || project.name}
                  </span>
                </div>

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

              {/* Footer */}
              <div 
                className="px-3 py-1.5 text-center text-[10px]"
                style={{ 
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)'
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
