'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { NavBackButton } from './NavBackButton'
import { SmartLogo } from './SmartLogo'
import { ThemeToggle } from './ThemeToggle'
import { toast } from './Toast'
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
  const { user, profile, signOut, isLoading, refreshProfile } = useAuth()
  const canManageUsers = useHasPermission('users.manage')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' })
  const [isSaving, setIsSaving] = useState(false)
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

  const handleOpenProfileModal = () => {
    setIsMenuOpen(false)
    setProfileForm({
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
    })
    setIsProfileModalOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.fullName.trim() || null,
          phone: profileForm.phone.trim() || null,
          first_login_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error('Failed to update profile')
        return
      }

      await refreshProfile()
      toast.success('Profile updated')
      setIsProfileModalOpen(false)
    } catch (err) {
      console.error('Error saving profile:', err)
      toast.error('An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
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
                      onClick={handleOpenProfileModal}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Edit Profile
                    </button>

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

                        // Must await signOut to clear cookies (SSR client uses cookies)
                        try {
                          const supabase = createSupabaseBrowserClient()
                          await supabase.auth.signOut()
                        } catch (e) {
                          console.error('Sign out error:', e)
                        }

                        // Force hard redirect after cookies are cleared
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

    {/* Profile Edit Modal */}
    <Dialog.Root open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-ios p-6"
          style={{
            background: 'var(--bg-card)',
            boxShadow: 'var(--elevation-4)',
          }}
        >
          <Dialog.Title className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Edit Profile
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Your full name"
                className="input-ios w-full"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Phone Number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="input-ios w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Dialog.Close asChild>
              <button className="btn-ghost" disabled={isSaving}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  )
}
