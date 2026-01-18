'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // ms, default 5000
}

const TOAST_DURATION = 5000

let toastListeners: ((toast: Omit<Toast, 'id'>) => void)[] = []

// Global toast function
export function toast(options: Omit<Toast, 'id'>) {
  toastListeners.forEach(listener => listener(options))
}

// Convenience methods
toast.success = (title: string, message?: string) => toast({ type: 'success', title, message })
toast.error = (title: string, message?: string) => toast({ type: 'error', title, message })
toast.warning = (title: string, message?: string) => toast({ type: 'warning', title, message })
toast.info = (title: string, message?: string) => toast({ type: 'info', title, message })

/**
 * Individual Toast Item with progress bar
 */
function ToastItem({ 
  toast: t, 
  onRemove 
}: { 
  toast: Toast
  onRemove: () => void 
}) {
  const duration = t.duration || TOAST_DURATION
  const [progress, setProgress] = useState(100)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      
      if (remaining <= 0) {
        onRemove()
      }
    }

    const interval = setInterval(updateProgress, 50)
    timerRef.current = setTimeout(onRemove, duration)

    return () => {
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [duration, onRemove])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <motion.svg 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </motion.svg>
        )
      case 'error':
        return (
          <motion.svg 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            initial={{ rotate: -90 }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </motion.svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { 
          bg: 'var(--bg-card)', 
          border: 'var(--success)', 
          icon: 'var(--success)',
          progress: 'var(--success)',
        }
      case 'error':
        return { 
          bg: 'var(--bg-card)', 
          border: 'var(--error)', 
          icon: 'var(--error)',
          progress: 'var(--error)',
        }
      case 'warning':
        return { 
          bg: 'var(--bg-card)', 
          border: 'var(--warning)', 
          icon: 'var(--warning)',
          progress: 'var(--warning)',
        }
      case 'info':
        return { 
          bg: 'var(--bg-card)', 
          border: 'var(--accent)', 
          icon: 'var(--accent)',
          progress: 'var(--accent)',
        }
    }
  }

  const colors = getColors(t.type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative overflow-hidden min-w-[320px] max-w-[400px]"
      style={{ 
        background: colors.bg,
        borderRadius: 'var(--radius-lg)',
        borderLeft: `4px solid ${colors.border}`,
        boxShadow: 'var(--elevation-4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        <div style={{ color: colors.icon }} className="flex-shrink-0 mt-0.5">
          {getIcon(t.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t.title}
          </p>
          {t.message && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {t.message}
            </p>
          )}
        </div>
        <motion.button
          onClick={onRemove}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center touch-target"
          style={{ borderRadius: 'var(--radius-sm)' }}
          whileHover={{ backgroundColor: 'var(--bg-hover)' }}
          whileTap={{ scale: 0.9 }}
        >
          <svg 
            className="w-4 h-4" 
            style={{ color: 'var(--text-muted)' }} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      </div>

      {/* Progress bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'var(--bg-hover)' }}
      >
        <motion.div
          className="h-full"
          style={{ 
            background: colors.progress,
            width: `${progress}%`,
          }}
          initial={{ width: '100%' }}
        />
      </div>
    </motion.div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(7)
      setToasts(prev => [...prev, { ...toast, id }])
    }
    
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onRemove={() => removeToast(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
