'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFeedbackAnimation } from '@/lib/polymorphic'

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading'

type FeedbackAnimationProps = {
  type: FeedbackType
  show: boolean
  children?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

/**
 * FeedbackAnimation - Polymorphic animated feedback component
 * 
 * Provides emotionally responsive visual feedback:
 * - Success: Scale-in with green checkmark
 * - Error: Shake with red X
 * - Warning: Pulse with amber triangle
 * - Info: Fade-in with blue info icon
 * - Loading: Spin animation
 */
export function FeedbackAnimation({
  type,
  show,
  children,
  className = '',
  size = 'md',
  pulse = false,
}: FeedbackAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <motion.svg 
            className={sizeClasses[size]}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            />
          </motion.svg>
        )
      case 'error':
        return (
          <motion.svg 
            className={sizeClasses[size]}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </motion.svg>
        )
      case 'warning':
        return (
          <motion.svg 
            className={sizeClasses[size]}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </motion.svg>
        )
      case 'info':
        return (
          <motion.svg 
            className={sizeClasses[size]}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </motion.svg>
        )
      case 'loading':
        return (
          <motion.div
            className={`${sizeClasses[size]} border-2 rounded-full`}
            style={{
              borderColor: 'var(--border-subtle)',
              borderTopColor: 'var(--accent)',
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )
    }
  }

  const getColor = () => {
    switch (type) {
      case 'success': return 'var(--success)'
      case 'error': return 'var(--error)'
      case 'warning': return 'var(--warning)'
      case 'info': return 'var(--accent)'
      case 'loading': return 'var(--accent)'
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'var(--success-muted)'
      case 'error': return 'var(--error-muted)'
      case 'warning': return 'var(--warning-muted)'
      case 'info': return 'var(--accent-muted)'
      case 'loading': return 'var(--bg-hover)'
    }
  }

  const getGlow = () => {
    switch (type) {
      case 'success': return 'var(--success-glow)'
      case 'error': return 'var(--error-glow)'
      case 'warning': return 'var(--warning-glow)'
      case 'info': return 'var(--accent-glow)'
      case 'loading': return 'none'
    }
  }

  const animations = {
    success: {
      initial: { scale: 0, opacity: 0 },
      animate: { 
        scale: 1, 
        opacity: 1,
        boxShadow: `0 0 20px ${getGlow()}`,
      },
      exit: { scale: 0.8, opacity: 0 },
      transition: { type: 'spring', stiffness: 500, damping: 25 },
    },
    error: {
      initial: { scale: 1, x: 0 },
      animate: { 
        scale: 1, 
        opacity: 1,
        x: [0, -4, 4, -4, 4, 0],
        boxShadow: `0 0 20px ${getGlow()}`,
      },
      exit: { scale: 0.8, opacity: 0 },
      transition: { duration: 0.4 },
    },
    warning: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { 
        scale: pulse ? [1, 1.05, 1] : 1, 
        opacity: 1,
        boxShadow: `0 0 20px ${getGlow()}`,
      },
      exit: { scale: 0.8, opacity: 0 },
      transition: pulse 
        ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
        : { type: 'spring', stiffness: 400, damping: 20 },
    },
    info: {
      initial: { y: 10, opacity: 0 },
      animate: { 
        y: 0, 
        opacity: 1,
        boxShadow: `0 0 15px ${getGlow()}`,
      },
      exit: { y: -10, opacity: 0 },
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    loading: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
  }

  const animation = animations[type]

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={`flex items-center justify-center ${containerSizes[size]} rounded-full ${className}`}
          style={{
            color: getColor(),
            background: getBgColor(),
          }}
          initial={animation.initial}
          animate={animation.animate}
          exit={animation.exit}
          transition={animation.transition}
        >
          {children || getIcon()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Inline feedback indicator for form fields
 */
type InlineFeedbackProps = {
  type: 'success' | 'error' | 'warning' | null
  message?: string
  show: boolean
}

export function InlineFeedback({ type, message, show }: InlineFeedbackProps) {
  if (!show || !type) return null

  const colors = {
    success: { text: 'var(--success)', icon: '✓' },
    error: { text: 'var(--error)', icon: '✕' },
    warning: { text: 'var(--warning)', icon: '!' },
  }

  const { text, icon } = colors[type]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="flex items-center gap-1.5 mt-1.5 text-sm"
          style={{ color: text }}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          <span className="font-bold">{icon}</span>
          {message && <span>{message}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Success celebration animation (confetti-like)
 */
type CelebrationProps = {
  show: boolean
  onComplete?: () => void
}

export function Celebration({ show, onComplete }: CelebrationProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Central success icon */}
          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--success)',
              boxShadow: '0 0 40px var(--success-glow)',
            }}
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.6, 1],
              ease: 'easeOut',
            }}
          >
            <motion.svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </motion.div>

          {/* Radiating rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute rounded-full"
              style={{
                width: 80 + ring * 40,
                height: 80 + ring * 40,
                border: '2px solid var(--success)',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{
                scale: [0, 1.5, 2],
                opacity: [0.6, 0.3, 0],
              }}
              transition={{
                duration: 1,
                delay: 0.2 + ring * 0.15,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

