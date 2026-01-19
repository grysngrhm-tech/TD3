'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createSupabaseBrowserClient, Profile, Permission } from '@/lib/supabase'

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

  const supabase = createSupabaseBrowserClient()

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as Profile
    } catch (err) {
      console.error('Error in fetchProfile:', err)
      return null
    }
  }, [supabase])

  // Fetch user permissions
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
  }, [supabase])

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

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setPermissions([])
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        console.log('[Auth] Starting auth initialization...')

        // Use getUser() instead of getSession() to validate the session with the server
        // This ensures the session is actually valid, especially after magic link login
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

        console.log('[Auth] getUser result:', { hasUser: !!authUser, error: userError?.message })

        if (userError) {
          console.error('[Auth] Error getting user:', userError.message)
          // Session invalid or expired - clear state
          if (mounted) {
            setUser(null)
            setProfile(null)
            setPermissions([])
          }
          return
        }

        if (authUser && mounted) {
          setUser(authUser)
          console.log('[Auth] User set, fetching profile and permissions...')

          // Fetch profile and permissions in parallel with timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile/permissions fetch timeout')), 10000)
          )

          try {
            const [fetchedProfile, fetchedPermissions] = await Promise.race([
              Promise.all([
                fetchProfile(authUser.id),
                fetchPermissions(authUser.id)
              ]),
              timeoutPromise
            ]) as [typeof profile, typeof permissions]

            console.log('[Auth] Profile fetched:', { hasProfile: !!fetchedProfile })
            console.log('[Auth] Permissions fetched:', fetchedPermissions?.length || 0)

            if (mounted) {
              setProfile(fetchedProfile)
              setPermissions(fetchedPermissions)
            }
          } catch (fetchErr) {
            console.error('[Auth] Error fetching profile/permissions:', fetchErr)
            // Continue anyway - user is authenticated, just missing profile data
          }
        }
      } catch (err) {
        console.error('[Auth] Error initializing auth:', err)
      } finally {
        console.log('[Auth] Initialization complete, setting isLoading=false')
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)

          // Fetch profile and permissions
          const [fetchedProfile, fetchedPermissions] = await Promise.all([
            fetchProfile(session.user.id),
            fetchPermissions(session.user.id)
          ])

          if (mounted) {
            setProfile(fetchedProfile)
            setPermissions(fetchedPermissions)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setPermissions([])
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, fetchPermissions])

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
