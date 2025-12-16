'use client'

import { useEffect, useState, useCallback } from 'react'

export type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'td3-theme'

/**
 * Get the system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Theme hook with system preference support
 * 
 * - Persists preference to localStorage
 * - Supports 'system' option to follow OS preference
 * - Provides resolved theme for actual styling
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    
    if (stored && ['dark', 'light', 'system'].includes(stored)) {
      setThemeState(stored)
      setResolvedTheme(stored === 'system' ? getSystemTheme() : stored)
    } else {
      // Default to dark mode
      setThemeState('dark')
      setResolvedTheme('dark')
    }
  }, [])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'light' : 'dark')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return
    
    const root = document.documentElement
    if (resolvedTheme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, resolvedTheme, mounted])

  // Set theme handler
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme)
  }, [])

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }, [resolvedTheme, setTheme])

  // Cycle through all three options
  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system']
    const currentIndex = order.indexOf(theme)
    const nextIndex = (currentIndex + 1) % order.length
    setTheme(order[nextIndex])
  }, [theme, setTheme])

  return { 
    theme,           // User preference: 'dark' | 'light' | 'system'
    resolvedTheme,   // Actual theme in use: 'dark' | 'light'
    setTheme, 
    toggleTheme,
    cycleTheme,
    mounted,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  }
}
