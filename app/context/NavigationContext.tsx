'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

type Dashboard = 'portfolio' | 'draw'

type NavigationContextType = {
  lastDashboard: Dashboard
  setLastDashboard: (d: Dashboard) => void
  getDashboardHref: () => string
  getDashboardLabel: () => string
}

const NavigationContext = createContext<NavigationContextType>({
  lastDashboard: 'portfolio',
  setLastDashboard: () => {},
  getDashboardHref: () => '/',
  getDashboardLabel: () => 'Portfolio',
})

type NavigationProviderProps = {
  children: ReactNode
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [lastDashboard, setLastDashboardState] = useState<Dashboard>('portfolio')
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('lastDashboard') as Dashboard | null
    if (stored === 'portfolio' || stored === 'draw') {
      setLastDashboardState(stored)
    }
    setIsHydrated(true)
  }, [])

  // Persist changes to localStorage - memoized to prevent useEffect loops
  const setLastDashboard = useCallback((d: Dashboard) => {
    setLastDashboardState(d)
    localStorage.setItem('lastDashboard', d)
  }, [])

  // Get the href for the last dashboard - memoized for stable reference
  const getDashboardHref = useCallback(() => {
    return lastDashboard === 'draw' ? '/staging' : '/'
  }, [lastDashboard])

  // Get a friendly label for the last dashboard - memoized for stable reference
  const getDashboardLabel = useCallback(() => {
    return lastDashboard === 'draw' ? 'Draw Dashboard' : 'Portfolio'
  }, [lastDashboard])

  return (
    <NavigationContext.Provider 
      value={{ 
        lastDashboard, 
        setLastDashboard, 
        getDashboardHref,
        getDashboardLabel,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export const useNavigation = () => useContext(NavigationContext)

