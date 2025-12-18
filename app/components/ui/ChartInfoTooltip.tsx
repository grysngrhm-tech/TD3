'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ChartInfoTooltipProps = {
  title: string
  description: string
  formula?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * ChartInfoTooltip - Reusable tooltip for chart explanations
 * Shows an info icon (?) that displays a popover with explanation on hover/click
 */
export function ChartInfoTooltip({
  title,
  description,
  formula,
  position = 'bottom',
}: ChartInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex items-center justify-center w-5 h-5 rounded-full transition-colors"
        style={{
          background: isOpen ? 'var(--accent-muted)' : 'var(--bg-hover)',
          color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
        }}
        aria-label="Chart information"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-64 ${positionClasses[position]}`}
          >
            <div
              className="p-3 rounded-lg shadow-lg"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--elevation-3)',
              }}
            >
              {/* Arrow */}
              <div
                className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
                style={{ borderColor: 'var(--bg-card)' }}
              />

              {/* Title */}
              <div
                className="font-semibold text-sm mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>

              {/* Formula (optional) */}
              {formula && (
                <div
                  className="mt-2 p-2 rounded text-xs font-mono"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                >
                  {formula}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * ChartHeader - Reusable chart header with title, subtitle, and info tooltip
 */
export function ChartHeader({
  title,
  subtitle,
  tooltipTitle,
  tooltipDescription,
  tooltipFormula,
}: {
  title: string
  subtitle: string
  tooltipTitle?: string
  tooltipDescription?: string
  tooltipFormula?: string
}) {
  return (
    <div
      className="px-4 py-3 border-b flex items-start justify-between"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      </div>
      {tooltipTitle && tooltipDescription && (
        <ChartInfoTooltip
          title={tooltipTitle}
          description={tooltipDescription}
          formula={tooltipFormula}
        />
      )}
    </div>
  )
}

