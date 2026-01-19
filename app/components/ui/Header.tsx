'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { NavBackButton } from './NavBackButton'
import { SmartLogo } from './SmartLogo'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/app/context/AuthContext'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// Routes where Header should not be shown
const AUTH_ROUTES = ['/login', '/auth/callback']

/**
 * Global header component with:
 * - Material elevation shadow
 * - Glassmorphism backdrop blur
 * - Smart navigation elements
 * - User menu with auth actions
 */
export function Header() {
  const pathname = usePathname()
  const { user, profile, signOut, isLoading } = useAuth()
  const canManageUsers = useHasPermission('users.manage')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Don't render Header on auth pages (login, callback)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route))
  if (isAuthRoute) {
    return null
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  // Get user initials
  const getInitials = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return parts[0].substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return '?'
  }

  const handleSignOut = async () => {
    setIsMenuOpen(false)

    // CRITICAL: Clear all storage FIRST to prevent stale session on reload
    // This ensures AuthProvider sees no session when login page loads
    localStorage.clear()
    sessionStorage.clear()

    // Then sign out from Supabase (may clear cookies)
    try {
      await signOut()
    } catch (e) {
      console.error('Sign out error:', e)
    }

    // Force hard redirect to login
    window.location.href = '/login'
  }

  const handleNavigateToAdmin = () => {
    setIsMenuOpen(false)
    router.push('/admin/users')
  }

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-header flex items-center px-4"
      style={{
        height: 'var(--header-height)',
        background: 'var(--bg-card-transparent)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: 'var(--elevation-1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
    >
      {/* Left - Back button */}
      <NavBackButton />

      {/* Center - Smart Logo (absolute centered) */}
      <SmartLogo />

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />

        {/* User Avatar with Dropdown */}
        {!isLoading && user && (
          <div className="relative" ref={menuRef}>
            <motion.button
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer touch-target"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                border: '2px solid transparent',
              }}
              whileHover={{
                scale: 1.05,
                borderColor: 'var(--accent)',
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="User menu"
              aria-expanded={isMenuOpen}
            >
              {getInitials()}
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-ios-sm overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--elevation-3)',
                  }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {profile?.full_name || 'No name set'}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {canManageUsers && (
                      <button
                        onClick={handleNavigateToAdmin}
                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--bg-hover)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Manage Users
                      </button>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--error)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Loading state - still allow emergency sign out */}
        {isLoading && (
          <div className="relative" ref={menuRef}>
            <motion.button
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer touch-target"
              style={{
                background: 'var(--bg-hover)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="User menu"
              aria-expanded={isMenuOpen}
            >
              <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: 'var(--text-muted)' }} />
            </motion.button>

            {/* Emergency Sign Out Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-ios-sm overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--elevation-3)',
                  }}
                >
                  <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Loading session...
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={async () => {
                        setIsMenuOpen(false)

                        // CRITICAL: Clear storage FIRST before anything else
                        localStorage.clear()
                        sessionStorage.clear()

                        // Then try to sign out (don't wait for it)
                        try {
                          const supabase = createSupabaseBrowserClient()
                          supabase.auth.signOut() // Don't await - just fire and forget
                        } catch (e) {
                          console.error('Sign out error:', e)
                        }

                        // Force hard redirect immediately
                        window.location.href = '/login'
                      }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--error)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Emergency Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.nav>
  )
}
