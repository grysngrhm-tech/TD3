'use client'

import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigation } from '@/app/context/NavigationContext'

type QuickLinksPopupProps = {
  variant: 'portfolio' | 'draw'
}

type LinkItem = {
  href: string
  label: string
  icon: keyof typeof ICONS
}

const ICONS = {
  userPlus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  folderPlus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  list: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  dollar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  building: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  menu: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  chevronUp: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
}

const ACTIONS: LinkItem[] = [
  { href: '/builders/new', label: 'New Builder', icon: 'userPlus' },
  { href: '/projects/new', label: 'New Project', icon: 'folderPlus' },
  { href: '/draws/new', label: 'New Draw', icon: 'plus' },
]

const PAGES: LinkItem[] = [
  { href: '/draws', label: 'All Draws', icon: 'list' },
  { href: '/budgets', label: 'Budgets', icon: 'dollar' },
  { href: '/reports', label: 'Reports', icon: 'chart' },
  { href: '/projects', label: 'All Projects', icon: 'building' },
]

function QuickLinkItem({ 
  href, 
  label, 
  icon, 
  isActive,
  delay = 0 
}: { 
  href: string
  label: string
  icon: keyof typeof ICONS
  isActive: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.15 }}
    >
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded-ios-xs text-sm transition-all"
        style={{ 
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-glow)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }
        }}
      >
        <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
          {ICONS[icon]}
        </span>
        <span className="flex-1">{label}</span>
        {isActive && (
          <span 
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        )}
      </Link>
    </motion.div>
  )
}

function Section({ 
  title, 
  children, 
  delay = 0 
}: { 
  title: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="mb-3"
    >
      <h4 
        className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </h4>
      <div className="space-y-0.5">
        {children}
      </div>
    </motion.div>
  )
}

export function QuickLinksPopup({ variant }: QuickLinksPopupProps) {
  const pathname = usePathname()
  const { quickLinksOpen, setQuickLinksOpen, toggleQuickLinks, recentPages } = useNavigation()

  // Keyboard shortcut (Q) to toggle
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if typing in an input
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return
    }
    
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault()
      toggleQuickLinks()
    }
    
    // Escape to close
    if (e.key === 'Escape' && quickLinksOpen) {
      setQuickLinksOpen(false)
    }
  }, [toggleQuickLinks, quickLinksOpen, setQuickLinksOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Check if a path is active
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="relative">
      {/* Backdrop blur when open */}
      <AnimatePresence>
        {quickLinksOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            style={{ 
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => setQuickLinksOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Expandable popup - slides up from tab */}
      <AnimatePresence>
        {quickLinksOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 30,
              opacity: { duration: 0.15 }
            }}
            className="absolute bottom-full left-0 right-0 z-50 overflow-hidden mb-1"
            style={{ 
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              boxShadow: 'var(--elevation-4)',
              border: '1px solid var(--border-subtle)',
              borderBottom: 'none',
            }}
          >
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {/* Recent Pages Section */}
              {recentPages.length > 0 && (
                <Section title="Recent" delay={0}>
                  {recentPages.slice(0, 3).map((page, index) => (
                    <motion.div
                      key={page.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.15 }}
                    >
                      <Link
                        href={page.path}
                        className="flex items-center gap-3 px-3 py-2 rounded-ios-xs text-sm transition-all"
                        style={{ 
                          color: isActive(page.path) ? 'var(--accent)' : 'var(--text-secondary)',
                          background: isActive(page.path) ? 'var(--accent-glow)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive(page.path)) {
                            e.currentTarget.style.background = 'var(--bg-hover)'
                            e.currentTarget.style.color = 'var(--text-primary)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive(page.path)) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                          }
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>{ICONS.clock}</span>
                        <span className="flex-1 truncate">{page.title}</span>
                      </Link>
                    </motion.div>
                  ))}
                </Section>
              )}

              {/* Actions Section */}
              <Section title="Actions" delay={0.1}>
                {ACTIONS.map((item, index) => (
                  <QuickLinkItem
                    key={item.href}
                    {...item}
                    isActive={isActive(item.href)}
                    delay={0.1 + 0.03 * index}
                  />
                ))}
              </Section>

              {/* Pages Section */}
              <Section title="Pages" delay={0.2}>
                {PAGES.map((item, index) => (
                  <QuickLinkItem
                    key={item.href}
                    {...item}
                    isActive={isActive(item.href)}
                    delay={0.2 + 0.03 * index}
                  />
                ))}
              </Section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab - always visible at bottom */}
      <motion.button
        onClick={toggleQuickLinks}
        aria-expanded={quickLinksOpen}
        aria-label="Quick Links menu (Press Q)"
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 touch-target transition-all"
        style={{
          background: quickLinksOpen ? 'var(--accent)' : 'var(--bg-card)',
          color: quickLinksOpen ? 'white' : 'var(--text-secondary)',
          borderTop: quickLinksOpen ? 'none' : '1px solid var(--border-subtle)',
          borderRadius: quickLinksOpen ? 0 : 'var(--radius-lg)',
          boxShadow: quickLinksOpen ? 'none' : 'var(--elevation-1)',
        }}
        whileHover={{
          backgroundColor: quickLinksOpen ? 'var(--accent-hover)' : 'var(--bg-hover)',
          color: quickLinksOpen ? 'white' : 'var(--text-primary)',
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        <span style={{ color: quickLinksOpen ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
          {ICONS.menu}
        </span>
        <span className="text-sm font-semibold">Quick Links</span>
        <span 
          className="text-xs px-1.5 py-0.5 font-mono font-bold" 
          style={{ 
            background: quickLinksOpen ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)', 
            color: quickLinksOpen ? 'white' : 'var(--text-muted)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          Q
        </span>
        <motion.span
          animate={{ rotate: quickLinksOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: quickLinksOpen ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}
        >
          {ICONS.chevronUp}
        </motion.span>
      </motion.button>
    </div>
  )
}

