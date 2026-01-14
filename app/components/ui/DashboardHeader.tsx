'use client'

import { motion } from 'framer-motion'
import React from 'react'

type DashboardHeaderProps = {
  title: string
  subtitle: string
  toggleElement: React.ReactNode
  actions: React.ReactNode
}

/**
 * Unified dashboard header component
 * Used for both Portfolio and Draw dashboards
 */
export function DashboardHeader({ title, subtitle, toggleElement, actions }: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-6"
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left: Title & Subtitle */}
        <div className="flex-shrink-0">
          <h1 
            className="font-bold"
            style={{ 
              color: 'var(--text-primary)',
              fontSize: 'var(--text-2xl)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <p 
            className="mt-1"
            style={{ 
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Center: Toggle Selector */}
        <div className="flex-1 flex justify-center">
          {toggleElement}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      </div>
    </motion.div>
  )
}

