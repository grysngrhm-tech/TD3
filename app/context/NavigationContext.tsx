'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type Dashboard = 'portfolio' | 'draw'

type PageHistoryEntry = {
  path: string
  title: string
}

type BreadcrumbEntry = {
  path: string
  title: string
}

type NavigationContextType = {
  // Dashboard tracking
  lastDashboard: Dashboard
  setLastDashboard: (d: Dashboard) => void
  getDashboardHref: () => string
  getDashboardLabel: () => string
  isDashboard: boolean
  
  // Page history for back button
  previousPageTitle: string | null
  setCurrentPageTitle: (title: string) => void
  
  // Breadcrumb trail (up to 3 levels)
  breadcrumbs: BreadcrumbEntry[]
  
  // Recent pages (last 5 visited)
  recentPages: PageHistoryEntry[]
  
  // Quick Links state (shared across sidebars)
  quickLinksOpen: boolean
  setQuickLinksOpen: (open: boolean) => void
  toggleQuickLinks: () => void
}

const NavigationContext = createContext<NavigationContextType>({
  lastDashboard: 'portfolio',
  setLastDashboard: () => {},
  getDashboardHref: () => '/',
  getDashboardLabel: () => 'Portfolio',
  isDashboard: true,
  previousPageTitle: null,
  setCurrentPageTitle: () => {},
  breadcrumbs: [],
  recentPages: [],
  quickLinksOpen: false,
  setQuickLinksOpen: () => {},
  toggleQuickLinks: () => {},
})

type NavigationProviderProps = {
  children: ReactNode
}

const DASHBOARD_PATHS = ['/', '/staging']
const MAX_RECENT_PAGES = 5
const MAX_BREADCRUMBS = 3

export function NavigationProvider({ children }: NavigationProviderProps) {
  const pathname = usePathname()
  
  // Dashboard state
  const [lastDashboard, setLastDashboardState] = useState<Dashboard>('portfolio')
  
  // Page history state
  const [pageHistory, setPageHistory] = useState<PageHistoryEntry[]>([])
  const [currentPageTitle, setCurrentPageTitleState] = useState<string | null>(null)
  
  // Breadcrumb state
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([])
  
  // Recent pages state
  const [recentPages, setRecentPages] = useState<PageHistoryEntry[]>([])
  
  // Quick Links state
  const [quickLinksOpen, setQuickLinksOpen] = useState(false)
  
  // Hydration state
  const [isHydrated, setIsHydrated] = useState(false)

  // Check if current path is a dashboard
  const isDashboard = DASHBOARD_PATHS.includes(pathname)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedDashboard = localStorage.getItem('lastDashboard') as Dashboard | null
    if (storedDashboard === 'portfolio' || storedDashboard === 'draw') {
      setLastDashboardState(storedDashboard)
    }
    
    const storedRecent = localStorage.getItem('recentPages')
    if (storedRecent) {
      try {
        setRecentPages(JSON.parse(storedRecent))
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    
    setIsHydrated(true)
  }, [])

  // Persist dashboard to localStorage
  const setLastDashboard = useCallback((d: Dashboard) => {
    setLastDashboardState(d)
    localStorage.setItem('lastDashboard', d)
  }, [])

  // Get the href for the last dashboard
  const getDashboardHref = useCallback(() => {
    return lastDashboard === 'draw' ? '/staging' : '/'
  }, [lastDashboard])

  // Get a friendly label for the last dashboard
  const getDashboardLabel = useCallback(() => {
    return lastDashboard === 'draw' ? 'Draw Dashboard' : 'Portfolio'
  }, [lastDashboard])

  // Set current page title and update history
  const setCurrentPageTitle = useCallback((title: string) => {
    setCurrentPageTitleState(title)
    
    // Update page history (keep previous page for back button)
    setPageHistory(prev => {
      const newEntry = { path: pathname, title }
      // Only add if different from last entry
      if (prev.length > 0 && prev[prev.length - 1].path === pathname) {
        // Update title for same path
        return [...prev.slice(0, -1), newEntry]
      }
      // Keep last 2 entries for back button context
      return [...prev.slice(-1), newEntry]
    })
    
    // Update breadcrumbs
    setBreadcrumbs(prev => {
      const newEntry = { path: pathname, title }
      
      // If navigating to a dashboard, reset breadcrumbs
      if (DASHBOARD_PATHS.includes(pathname)) {
        return [newEntry]
      }
      
      // Check if this path already exists in breadcrumbs
      const existingIndex = prev.findIndex(b => b.path === pathname)
      if (existingIndex >= 0) {
        // Navigating back - truncate to this point
        return [...prev.slice(0, existingIndex), newEntry]
      }
      
      // Add new entry, keeping max breadcrumbs
      const updated = [...prev, newEntry]
      return updated.slice(-MAX_BREADCRUMBS)
    })
    
    // Update recent pages (avoid duplicates, most recent first)
    setRecentPages(prev => {
      // Don't add dashboards to recent
      if (DASHBOARD_PATHS.includes(pathname)) {
        return prev
      }
      
      const newEntry = { path: pathname, title }
      const filtered = prev.filter(p => p.path !== pathname)
      const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_PAGES)
      
      // Persist to localStorage
      localStorage.setItem('recentPages', JSON.stringify(updated))
      
      return updated
    })
  }, [pathname])

  // Get previous page title for back button
  const previousPageTitle = pageHistory.length > 1 ? pageHistory[0].title : null

  // Toggle quick links
  const toggleQuickLinks = useCallback(() => {
    setQuickLinksOpen(prev => !prev)
  }, [])

  // Close quick links when navigating
  useEffect(() => {
    setQuickLinksOpen(false)
  }, [pathname])

  return (
    <NavigationContext.Provider 
      value={{ 
        lastDashboard, 
        setLastDashboard, 
        getDashboardHref,
        getDashboardLabel,
        isDashboard,
        previousPageTitle,
        setCurrentPageTitle,
        breadcrumbs,
        recentPages,
        quickLinksOpen,
        setQuickLinksOpen,
        toggleQuickLinks,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export const useNavigation = () => useContext(NavigationContext)
