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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Track whether auth initialization has ever completed successfully
  // This persists across re-renders and prevents redundant re-initialization
  const initCompletedRef = useRef(false)
  const initStartedRef = useRef(false)

  // Fetch user profile with retry logic - uses module-level supabase singleton
  // Retries handle race condition where trigger may still be creating profile
  const fetchProfile = useCallback(async (userId: string, maxRetries = 3): Promise<Profile | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (data) {
          return data as Profile
        }

        // Profile not found - wait and retry (trigger may still be completing)
        if (error && error.code === 'PGRST116' && attempt < maxRetries) {
          console.log(`Profile not found for user ${userId}, retrying (${attempt}/${maxRetries})...`)
          await new Promise(r => setTimeout(r, 500))
          continue
        }

        if (error) {
          console.error(`Error fetching profile (attempt ${attempt}):`, error)
        }
      } catch (err) {
        console.error(`Error in fetchProfile (attempt ${attempt}):`, err)
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    console.warn(`Profile not found after ${maxRetries} attempts for user ${userId}`)
    return null
  }, [])

  // Fetch user permissions - uses module-level supabase singleton
  const fetchPermissions = useCallback(async (userId: string) => {
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

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return
    const newProfile = await fetchProfile(user.id)
    if (newProfile) {
      setProfile(newProfile)
    }
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

  // Sign out - uses module-level supabase singleton
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setPermissions([])
    // Reset init tracking so re-login works correctly
    initCompletedRef.current = false
    initStartedRef.current = false
  }, [])

  // Initialize auth state - runs once on mount
  // Uses module-level supabase singleton so no dependencies needed
  useEffect(() => {
    let mounted = true

    // Skip if already initialized or in progress
    // This prevents redundant initialization during React strict mode or re-renders
    if (initCompletedRef.current) {
      setIsLoading(false)
      return
    }

    if (initStartedRef.current) {
      // Already in progress, wait for it to complete
      return
    }

    initStartedRef.current = true

    // Safety timeout: If auth takes more than 15 seconds, stop loading
    // This prevents the app from being stuck forever
    // Increased from 8s to be more tolerant of slow networks
    const timeoutId = setTimeout(() => {
      if (mounted && !initCompletedRef.current) {
        console.warn('Auth initialization timed out after 15 seconds')
        setIsLoading(false)
        initCompletedRef.current = true
      }
    }, 15000)

    async function initializeAuth() {
      try {
        // Get initial session - uses getSession() which reads from storage
        // This is faster and doesn't require a network call
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && mounted) {
          setUser(session.user)

          // Wait for profile and permissions before marking as loaded
          // This ensures permission checks work correctly on gated pages
          const [fetchedProfile, fetchedPermissions] = await Promise.all([
            fetchProfile(session.user.id),
            fetchPermissions(session.user.id)
          ])

          if (mounted) {
            setProfile(fetchedProfile)
            setPermissions(fetchedPermissions)
            clearTimeout(timeoutId)
            setIsLoading(false)
            initCompletedRef.current = true
          }
        } else {
          // No session - still need to set loading false
          if (mounted) {
            clearTimeout(timeoutId)
            setIsLoading(false)
            initCompletedRef.current = true
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        // On error, still stop loading
        if (mounted) {
          clearTimeout(timeoutId)
          setIsLoading(false)
          initCompletedRef.current = true
        }
      }
    }

    initializeAuth()

    // Listen for auth changes - this handles login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          // Set loading while we fetch profile and permissions
          setIsLoading(true)

          // Fetch profile and permissions
          const [fetchedProfile, fetchedPermissions] = await Promise.all([
            fetchProfile(session.user.id),
            fetchPermissions(session.user.id)
          ])

          if (mounted) {
            setProfile(fetchedProfile)
            setPermissions(fetchedPermissions)
            setIsLoading(false)
            initCompletedRef.current = true
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setPermissions([])
          // Reset so re-login can initialize
          initCompletedRef.current = false
          initStartedRef.current = false
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchProfile, fetchPermissions]) // These have empty deps so this effect is stable

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
