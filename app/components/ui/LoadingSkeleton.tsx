'use client'

import { motion } from 'framer-motion'

type SkeletonShape = 'text' | 'circle' | 'rectangle' | 'card' | 'avatar' | 'button'

type LoadingSkeletonProps = {
  shape?: SkeletonShape
  width?: string | number
  height?: string | number
  className?: string
  lines?: number
  animated?: boolean
}

/**
 * Loading skeleton with shimmer animation
 * Uses the design system's shimmer animation
 */
export function LoadingSkeleton({
  shape = 'rectangle',
  width,
  height,
  className = '',
  lines = 1,
  animated = true,
}: LoadingSkeletonProps) {
  const getShapeStyles = (): { width: string; height: string; borderRadius: string } => {
    switch (shape) {
      case 'text':
        return {
          width: width ? String(width) : '100%',
          height: height ? String(height) : '16px',
          borderRadius: 'var(--radius-xs)',
        }
      case 'circle':
        const size = width || height || '40px'
        return {
          width: String(size),
          height: String(size),
          borderRadius: 'var(--radius-full)',
        }
      case 'avatar':
        const avatarSize = width || height || '40px'
        return {
          width: String(avatarSize),
          height: String(avatarSize),
          borderRadius: 'var(--radius-full)',
        }
      case 'card':
        return {
          width: width ? String(width) : '100%',
          height: height ? String(height) : '120px',
          borderRadius: 'var(--radius-lg)',
        }
      case 'button':
        return {
          width: width ? String(width) : '80px',
          height: height ? String(height) : '40px',
          borderRadius: 'var(--radius-sm)',
        }
      case 'rectangle':
      default:
        return {
          width: width ? String(width) : '100%',
          height: height ? String(height) : '20px',
          borderRadius: 'var(--radius-sm)',
        }
    }
  }

  const shapeStyles = getShapeStyles()

  // For text with multiple lines
  if (shape === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={animated ? 'skeleton' : ''}
            style={{
              ...shapeStyles,
              width: index === lines - 1 ? '75%' : '100%', // Last line shorter
              background: !animated ? 'var(--bg-hover)' : undefined,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${animated ? 'skeleton' : ''} ${className}`}
      style={{
        ...shapeStyles,
        background: !animated ? 'var(--bg-hover)' : undefined,
      }}
    />
  )
}

/**
 * Skeleton for a project tile/card
 */
export function ProjectTileSkeleton() {
  return (
    <div
      className="p-5 rounded-lg"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <LoadingSkeleton shape="text" width="120px" height="20px" />
          <LoadingSkeleton shape="text" width="80px" height="14px" />
        </div>
        <LoadingSkeleton shape="button" width="60px" height="24px" />
      </div>

      {/* Address */}
      <LoadingSkeleton shape="text" width="180px" className="mb-4" />

      {/* Content */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <LoadingSkeleton shape="text" width="60px" />
          <LoadingSkeleton shape="text" width="80px" />
        </div>
        <LoadingSkeleton shape="rectangle" height="8px" />
        <div className="flex justify-between">
          <LoadingSkeleton shape="text" width="70px" />
          <LoadingSkeleton shape="text" width="90px" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for stats bar
 */
export function StatsBarSkeleton() {
  return (
    <div
      className="flex items-center gap-6 p-4 rounded-lg bg-background-card"
    >
      {/* Stat items */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex-1">
          <LoadingSkeleton shape="text" width="60px" height="12px" className="mb-2" />
          <LoadingSkeleton shape="text" width="100px" height="28px" />
        </div>
      ))}
      {/* Button */}
      <LoadingSkeleton shape="button" width="140px" height="44px" />
    </div>
  )
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <LoadingSkeleton 
            shape="text" 
            width={i === 0 ? '120px' : i === columns - 1 ? '60px' : '80px'} 
          />
        </td>
      ))}
    </tr>
  )
}

/**
 * Skeleton for a full page/section
 */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton shape="text" width="200px" height="28px" />
          <LoadingSkeleton shape="text" width="300px" height="16px" />
        </div>
        <div className="flex gap-3">
          <LoadingSkeleton shape="button" width="100px" />
          <LoadingSkeleton shape="button" width="120px" />
        </div>
      </div>

      {/* Stats bar */}
      <StatsBarSkeleton />

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ProjectTileSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Animated loading spinner
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full text-accent`}
      
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}

/**
 * Full page loading state
 */
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-text-muted">
        {message}
      </p>
    </div>
  )
}

