'use client'

const sizes = {
  xs: 'h-3 w-3 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-12 w-12 border-4',
}

type SpinnerSize = keyof typeof sizes

interface LoadingSpinnerProps {
  size?: SpinnerSize
  variant?: 'accent' | 'white'
  className?: string
}

export function LoadingSpinner({ size = 'lg', variant = 'accent', className }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-t-transparent ${sizes[size]} ${variant === 'white' ? 'border-white' : ''} ${className ?? ''}`}
      style={variant === 'accent' ? { borderColor: 'var(--accent)', borderTopColor: 'transparent' } : undefined}
    />
  )
}
