'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

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

  // Persist changes to localStorage
  const setLastDashboard = (d: Dashboard) => {
    setLastDashboardState(d)
    localStorage.setItem('lastDashboard', d)
  }

  // Get the href for the last dashboard
  const getDashboardHref = () => {
    return lastDashboard === 'draw' ? '/staging' : '/'
  }

  // Get a friendly label for the last dashboard
  const getDashboardLabel = () => {
    return lastDashboard === 'draw' ? 'Draw Dashboard' : 'Portfolio'
  }

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

