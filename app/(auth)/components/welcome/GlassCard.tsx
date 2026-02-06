'use client'

import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Enable hover border + scale effect. Default: true */
  hover?: boolean
  /** Enable maroon box-shadow glow. Default: false */
  glow?: boolean
}

/**
 * GlassCard — Reusable glassmorphism card for the welcome page.
 *
 * Provides a frosted-glass surface with optional hover effects
 * and maroon accent glow. Scoped to work inside `.welcome-dark`.
 */
export function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
}: GlassCardProps) {
  return (
    <div
      className={[
        // Base glassmorphism
        'backdrop-blur-xl rounded-2xl',
        'transition-all duration-300 ease-out',
        // Hover styles via group or direct
        hover ? 'glass-card-hover' : '',
        // Glow
        glow ? 'glass-card-glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: 'var(--welcome-surface)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        ...(glow ? { boxShadow: 'var(--welcome-glow)' } : {}),
      }}
    >
      {children}
    </div>
  )
}
