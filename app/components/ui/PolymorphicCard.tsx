'use client'

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { 
  getStatusTint, 
  getLifecycleStyles,
  getElevation,
  type WorkflowStatus, 
  type LifecycleStage,
  type ElevationLevel 
} from '@/lib/polymorphic'
import { useTheme } from '@/app/hooks/useTheme'

type PolymorphicCardProps = {
  children: ReactNode
  status?: WorkflowStatus
  lifecycleStage?: LifecycleStage
  elevation?: ElevationLevel
  elevationHover?: ElevationLevel
  interactive?: boolean
  selected?: boolean
  className?: string
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'button'
} & Omit<HTMLMotionProps<'div'>, 'children'>

/**
 * PolymorphicCard - A status-aware card component
 * 
 * Automatically adapts its appearance based on:
 * - Workflow status (pending, approved, etc.)
 * - Lifecycle stage (pending, active, historic)
 * - Theme (light/dark)
 * - Interactive state (hover, selected)
 */
export const PolymorphicCard = forwardRef<HTMLDivElement, PolymorphicCardProps>(
  function PolymorphicCard(
    {
      children,
      status,
      lifecycleStage,
      elevation = 2,
      elevationHover = 3,
      interactive = false,
      selected = false,
      className = '',
      onClick,
      as = 'div',
      ...motionProps
    },
    ref
  ) {
    const { theme } = useTheme()
    const themeMode = theme === 'light' ? 'light' : 'dark'

    // Calculate status tint
    const statusTint = status ? getStatusTint(status, themeMode) : 'transparent'
    
    // Calculate lifecycle adjustments
    const lifecycleStyles = lifecycleStage 
      ? getLifecycleStyles(lifecycleStage) 
      : { opacity: 1, saturation: '100%', tint: 'transparent' }

    // Combine tints (status takes precedence over lifecycle)
    const backgroundTint = status ? statusTint : lifecycleStyles.tint

    // Base styles
    const baseStyles = {
      background: `linear-gradient(${backgroundTint}, ${backgroundTint}), var(--bg-card)`,
      border: selected 
        ? '1px solid var(--accent)' 
        : '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: getElevation(elevation),
      opacity: lifecycleStyles.opacity,
      filter: lifecycleStyles.saturation !== '100%' 
        ? `saturate(${lifecycleStyles.saturation})` 
        : undefined,
    }

    // Hover styles for interactive cards
    const hoverStyles = interactive ? {
      boxShadow: getElevation(elevationHover),
      borderColor: selected ? 'var(--accent)' : 'var(--border)',
      y: -2,
    } : {}

    // Tap styles for interactive cards
    const tapStyles = interactive ? {
      scale: 0.98,
    } : {}

    // Animation variants
    const variants = {
      initial: { 
        opacity: 0, 
        y: 10 
      },
      animate: { 
        opacity: lifecycleStyles.opacity, 
        y: 0 
      },
      hover: hoverStyles,
      tap: tapStyles,
    }

    const Component = motion[as] || motion.div

    return (
      <Component
        ref={ref}
        className={`p-5 transition-all ${className}`}
        style={baseStyles}
        variants={variants}
        initial="initial"
        animate="animate"
        whileHover={interactive ? "hover" : undefined}
        whileTap={interactive && onClick ? "tap" : undefined}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25,
          opacity: { duration: 0.2 }
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        {...motionProps}
      >
        {children}
      </Component>
    )
  }
)

/**
 * Interactive tile variant - commonly used for project tiles
 */
export function InteractiveTile({
  children,
  onClick,
  status,
  lifecycleStage,
  selected,
  className = '',
  ...props
}: Omit<PolymorphicCardProps, 'interactive' | 'elevation' | 'elevationHover'>) {
  return (
    <PolymorphicCard
      interactive
      elevation={2}
      elevationHover={3}
      status={status}
      lifecycleStage={lifecycleStage}
      selected={selected}
      onClick={onClick}
      className={`cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </PolymorphicCard>
  )
}

/**
 * Static card variant - for display-only content
 */
export function StaticCard({
  children,
  status,
  elevation = 1,
  className = '',
  ...props
}: Omit<PolymorphicCardProps, 'interactive' | 'onClick' | 'elevationHover'>) {
  return (
    <PolymorphicCard
      interactive={false}
      elevation={elevation}
      status={status}
      className={className}
      {...props}
    >
      {children}
    </PolymorphicCard>
  )
}

/**
 * Section card variant - for grouping related content
 */
export function SectionCard({
  children,
  title,
  className = '',
  ...props
}: Omit<PolymorphicCardProps, 'interactive'> & { title?: string }) {
  return (
    <PolymorphicCard
      interactive={false}
      elevation={1}
      className={className}
      {...props}
    >
      {title && (
        <h3 
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </h3>
      )}
      {children}
    </PolymorphicCard>
  )
}

