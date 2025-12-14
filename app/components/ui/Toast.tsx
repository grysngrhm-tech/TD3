'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: string
  type: ToastType
  title: string
  message?: string
}

type ToastContextValue = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

let toastListeners: ((toast: Omit<Toast, 'id'>) => void)[] = []

// Global toast function
export function toast(options: Omit<Toast, 'id'>) {
  toastListeners.forEach(listener => listener(options))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(7)
      setToasts(prev => [...prev, { ...toast, id }])
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 5000)
    }
    
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
        return { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', icon: '#4ade80' }
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', icon: '#f87171' }
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', icon: '#fbbf24' }
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', icon: '#60a5fa' }
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => {
          const colors = getColors(t.type)
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className="flex items-start gap-3 p-4 rounded-ios shadow-lg min-w-[300px] max-w-[400px]"
              style={{ 
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                backdropFilter: 'blur(8px)'
              }}
            >
              <div style={{ color: colors.icon }} className="flex-shrink-0 mt-0.5">
                {getIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t.title}
                </p>
                {t.message && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--bg-hover)]"
              >
                <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
