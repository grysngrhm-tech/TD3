'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile, Permission } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  permissions: Permission[]
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  hasPermission: (permission: Permission | Permission[]) => boolean
  refreshProfile: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Resilient Auth Provider
 *
 * Key design principles:
 * 1. Use getUser() for auth validation (server-validated, not local storage)
 * 2. No blocking refs - allow re-initialization on any mount
 * 3. Auto-recovery on timeout - sign out and redirect to clean state
 * 4. Profile/permissions are non-blocking - auth state set immediately
 * 5. onAuthStateChange handles ongoing state management
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user profile - non-blocking, called after auth is established
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Profile not found is expected for brand new users (trigger might still be running)
        if (error.code === 'PGRST116') {
          console.log('Profile not found yet for user:', userId)
          return null
        }
        console.error('Error fetching profile:', error)
        return null
      }

      return data as Profile
    } catch (err) {
      console.error('Error in fetchProfile:', err)
      return null
    }
  }, [])

  // Fetch user permissions - non-blocking
  const fetchPermissions = useCallback(async (userId: string): Promise<Permission[]> => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_code')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching permissions:', error)
        return []
      }

      return (data || []).map(p => p.permission_code as Permission)
    } catch (err) {
      console.error('Error in fetchPermissions:', err)
      return []
    }
  }, [])

  // Load profile and permissions for a user (non-blocking background task)
  const loadUserData = useCallback(async (userId: string) => {
    const [fetchedProfile, fetchedPermissions] = await Promise.all([
      fetchProfile(userId),
      fetchPermissions(userId)
    ])
    setProfile(fetchedProfile)
    setPermissions(fetchedPermissions)
  }, [fetchProfile, fetchPermissions])

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return
    const newProfile = await fetchProfile(user.id)
    setProfile(newProfile)
  }, [user, fetchProfile])

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    if (!user) return
    const newPermissions = await fetchPermissions(user.id)
    setPermissions(newPermissions)
  }, [user, fetchPermissions])

  // Check if user has a specific permission (or any of multiple)
  const hasPermission = useCallback((permission: Permission | Permission[]): boolean => {
    if (Array.isArray(permission)) {
      return permission.some(p => permissions.includes(p))
    }
    return permissions.includes(permission)
  }, [permissions])

  // Sign out - clears all state
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    }
    setUser(null)
    setProfile(null)
    setPermissions([])
  }, [])

  // Force recovery - clears everything and redirects to login
  const forceRecovery = useCallback(() => {
    console.warn('Auth recovery triggered - clearing state and redirecting to login')

    // Clear all storage to ensure clean slate
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      console.error('Error clearing storage:', e)
    }

    // Clear state
    setUser(null)
    setProfile(null)
    setPermissions([])
    setIsLoading(false)

    // Redirect to login
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  }, [])

  // Track if initialization is in progress (prevents concurrent inits, but allows re-init)
  const initInProgressRef = useRef(false)

  // Main initialization effect - runs on mount
  // Unlike the old implementation, this CAN re-run if needed (no permanent blocking)
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    // Prevent concurrent initialization, but allow sequential re-initialization
    if (initInProgressRef.current) {
      return
    }

    initInProgressRef.current = true

    async function initializeAuth() {
      try {
        // Safety timeout: If auth takes more than 10 seconds, trigger recovery
        // This is shorter than before because we want to fail fast and recover
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.error('Auth initialization timed out - triggering recovery')
            initInProgressRef.current = false
            forceRecovery()
          }
        }, 10000)

        // Use getUser() instead of getSession() - this validates with the server
        // getSession() only reads from local storage and can be stale/corrupted
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()

        if (!mounted) {
          initInProgressRef.current = false
          return
        }

        if (error) {
          console.error('Error getting user:', error)
          // Auth error - user is not authenticated
          if (timeoutId) clearTimeout(timeoutId)
          setIsLoading(false)
          initInProgressRef.current = false
          return
        }

        if (currentUser) {
          // User is authenticated - set user immediately (non-blocking)
          setUser(currentUser)
          if (timeoutId) clearTimeout(timeoutId)
          setIsLoading(false)
          initInProgressRef.current = false

          // Load profile and permissions in background (non-blocking)
          loadUserData(currentUser.id)
        } else {
          // No user - not authenticated
          if (timeoutId) clearTimeout(timeoutId)
          setIsLoading(false)
          initInProgressRef.current = false
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId)
          setIsLoading(false)
          initInProgressRef.current = false
        }
      }
    }

    initializeAuth()

    // Listen for auth changes - this is the source of truth for ongoing state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth state change:', event)

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setIsLoading(false)
          // Load profile and permissions in background
          loadUserData(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setPermissions([])
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
      // Don't reset initInProgressRef here - cleanup runs before new effect starts
    }
  }, [forceRecovery, loadUserData])

  const value: AuthContextType = {
    user,
    profile,
    permissions,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    hasPermission,
    refreshProfile,
    refreshPermissions
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
