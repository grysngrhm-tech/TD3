'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/app/hooks/useTheme'

/**
 * Theme toggle button with smooth icon rotation animation
 * Supports dark, light, and system modes
 */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme, mounted, isDark } = useTheme()

  if (!mounted) {
    return (
      <div 
        className="w-10 h-10 skeleton" 
        style={{ borderRadius: 'var(--radius-sm)' }}
      />
    )
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center touch-target"
      style={{ 
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)',
      }}
      whileHover={{ 
        backgroundColor: 'var(--bg-hover)',
        color: 'var(--text-primary)',
      }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.15 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          // Sun icon for switching to light
          <motion.svg
            key="sun"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </motion.svg>
        ) : (
          // Moon icon for switching to dark
          <motion.svg
            key="moon"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
