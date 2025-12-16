'use client'

import { motion } from 'framer-motion'
import React from 'react'

type DashboardHeaderProps = {
  title: string
  subtitle: string
  toggleElement: React.ReactNode
  actions: React.ReactNode
}

export function DashboardHeader({ title, subtitle, toggleElement, actions }: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left: Title & Subtitle */}
        <div className="flex-shrink-0">
          <h1 
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
          <p 
            className="text-sm mt-0.5"
            style={{ color: 'var(--text-muted)' }}
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

