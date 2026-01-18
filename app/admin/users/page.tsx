'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { createSupabaseBrowserClient, Permission, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from '@/lib/supabase'
import { useAuth } from '@/app/context/AuthContext'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import { toast } from '@/app/components/ui/Toast'
import { useRouter } from 'next/navigation'

type AllowlistEntry = {
  id: string
  email: string
  invited_at: string
  notes: string | null
}

type UserWithPermissions = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_active: boolean
  first_login_completed: boolean
  permissions: Permission[]
}

const ALL_PERMISSIONS: Permission[] = ['processor', 'fund_draws', 'approve_payoffs', 'users.manage']

export default function AdminUsersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const canManageUsers = useHasPermission('users.manage')

  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([])
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPermissions, setNewPermissions] = useState<Permission[]>([])
  const [saving, setSaving] = useState(false)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Redirect if no permission
  useEffect(() => {
    if (!canManageUsers && !loading) {
      toast.error('Access denied', 'You do not have permission to access this page')
      router.push('/')
    }
  }, [canManageUsers, loading, router])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      // Fetch allowlist
      const { data: allowlistData, error: allowlistError } = await supabase
        .from('allowlist')
        .select('*')
        .order('invited_at', { ascending: false })

      if (allowlistError) throw allowlistError

      // Fetch profiles with their permissions
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Fetch all user permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('user_id, permission_code')

      if (permissionsError) throw permissionsError

      // Build user objects with their permissions
      const usersWithPerms: UserWithPermissions[] = (profilesData || []).map(profile => ({
        ...profile,
        permissions: (permissionsData || [])
          .filter(p => p.user_id === profile.id)
          .map(p => p.permission_code as Permission)
      }))

      setAllowlist(allowlistData || [])
      setUsers(usersWithPerms)
    } catch (err) {
      console.error('Error fetching admin data:', err)
      toast.error('Error', 'Failed to load user data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (canManageUsers) {
      fetchData()
    }
  }, [canManageUsers, fetchData])

  // Add email to allowlist
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedEmail = newEmail.trim().toLowerCase()

    if (!trimmedEmail) {
      toast.error('Email required', 'Please enter an email address')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Invalid email', 'Please enter a valid email address')
      return
    }

    // Check if already in allowlist
    if (allowlist.some(a => a.email.toLowerCase() === trimmedEmail)) {
      toast.error('Already exists', 'This email is already in the allowlist')
      return
    }

    setSaving(true)

    try {
      // Add to allowlist
      const { data: newEntry, error: allowlistError } = await supabase
        .from('allowlist')
        .insert({
          email: trimmedEmail,
          invited_by: user?.id,
        })
        .select()
        .single()

      if (allowlistError) throw allowlistError

      // If permissions selected, check if user already exists and add permissions
      if (newPermissions.length > 0) {
        // Check if there's a profile with this email
        const existingUser = users.find(u => u.email.toLowerCase() === trimmedEmail)

        if (existingUser) {
          // Add permissions to existing user
          const permissionInserts = newPermissions.map(perm => ({
            user_id: existingUser.id,
            permission_code: perm,
            granted_by: user?.id,
          }))

          const { error: permsError } = await supabase
            .from('user_permissions')
            .insert(permissionInserts)

          if (permsError) {
            console.error('Error adding permissions:', permsError)
          }
        }
        // If user doesn't exist yet, permissions will be added when they sign up
        // For now, we could store pending permissions in a separate table or just
        // let admin add them after the user signs up
      }

      toast.success('User invited', `${trimmedEmail} can now sign in`)
      setNewEmail('')
      setNewPermissions([])
      setIsAddModalOpen(false)
      fetchData()

    } catch (err) {
      console.error('Error adding user:', err)
      toast.error('Error', 'Failed to add user')
    } finally {
      setSaving(false)
    }
  }

  // Toggle permission for a user
  const handleTogglePermission = async (userId: string, permission: Permission, currentlyHas: boolean) => {
    setUpdatingUser(userId)

    try {
      if (currentlyHas) {
        // Remove permission
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_code', permission)

        if (error) throw error
      } else {
        // Add permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            permission_code: permission,
            granted_by: user?.id,
          })

        if (error) throw error
      }

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        return {
          ...u,
          permissions: currentlyHas
            ? u.permissions.filter(p => p !== permission)
            : [...u.permissions, permission]
        }
      }))

      toast.success(
        currentlyHas ? 'Permission removed' : 'Permission granted',
        `${PERMISSION_LABELS[permission]} ${currentlyHas ? 'removed from' : 'granted to'} user`
      )

    } catch (err) {
      console.error('Error toggling permission:', err)
      toast.error('Error', 'Failed to update permission')
    } finally {
      setUpdatingUser(null)
    }
  }

  // Remove from allowlist
  const handleRemoveFromAllowlist = async (entry: AllowlistEntry) => {
    if (!confirm(`Remove ${entry.email} from the allowlist? They will no longer be able to sign in.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('allowlist')
        .delete()
        .eq('id', entry.id)

      if (error) throw error

      setAllowlist(prev => prev.filter(a => a.id !== entry.id))
      toast.success('Removed', `${entry.email} removed from allowlist`)

    } catch (err) {
      console.error('Error removing from allowlist:', err)
      toast.error('Error', 'Failed to remove user')
    }
  }

  if (!canManageUsers) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage access and permissions for TD3 users
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite User
        </button>
      </div>

      {/* Active Users */}
      <div className="card-ios p-0 overflow-hidden mb-8">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Active Users ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            No users have signed in yet
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {users.map(u => (
              <div key={u.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {u.full_name || u.email}
                      </span>
                      {!u.first_login_completed && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}
                        >
                          Pending setup
                        </span>
                      )}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {u.email}
                      {u.phone && ` • ${u.phone}`}
                    </div>
                  </div>

                  {/* Permission toggles */}
                  <div className="flex flex-wrap gap-2">
                    {ALL_PERMISSIONS.map(perm => {
                      const hasPerm = u.permissions.includes(perm)
                      const isUpdating = updatingUser === u.id

                      return (
                        <button
                          key={perm}
                          onClick={() => handleTogglePermission(u.id, perm, hasPerm)}
                          disabled={isUpdating}
                          className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                            hasPerm
                              ? 'font-medium'
                              : 'opacity-50 hover:opacity-100'
                          }`}
                          style={{
                            background: hasPerm ? 'var(--accent-muted)' : 'var(--bg-hover)',
                            color: hasPerm ? 'var(--accent)' : 'var(--text-secondary)',
                            border: `1px solid ${hasPerm ? 'var(--accent)' : 'var(--border)'}`
                          }}
                          title={PERMISSION_DESCRIPTIONS[perm]}
                        >
                          {PERMISSION_LABELS[perm]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Allowlist (pending invites) */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Invited Users ({allowlist.filter(a => !users.some(u => u.email.toLowerCase() === a.email.toLowerCase())).length})
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Users who have been invited but haven&apos;t signed in yet
          </p>
        </div>

        {(() => {
          const pendingInvites = allowlist.filter(a => !users.some(u => u.email.toLowerCase() === a.email.toLowerCase()))

          if (pendingInvites.length === 0) {
            return (
              <div className="px-5 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                No pending invites
              </div>
            )
          }

          return (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {pendingInvites.map(entry => (
                <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span style={{ color: 'var(--text-primary)' }}>{entry.email}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      Invited {new Date(entry.invited_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFromAllowlist(entry)}
                    className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--error)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Add User Modal */}
      <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AnimatePresence>
          {isAddModalOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50"
                  style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-ios"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Invite User
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        className="w-8 h-8 rounded-ios-xs flex items-center justify-center hover:bg-[var(--bg-hover)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAddEmail} className="p-5 space-y-4">
                    <div>
                      <label
                        htmlFor="newEmail"
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Email Address
                      </label>
                      <input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="user@company.com"
                        className="input-ios w-full"
                        autoFocus
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Initial Permissions <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                      </label>
                      <div className="space-y-2">
                        {ALL_PERMISSIONS.map(perm => (
                          <label
                            key={perm}
                            className="flex items-start gap-3 p-3 rounded-ios-sm cursor-pointer hover:bg-[var(--bg-hover)]"
                            style={{ border: '1px solid var(--border)' }}
                          >
                            <input
                              type="checkbox"
                              checked={newPermissions.includes(perm)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewPermissions(prev => [...prev, perm])
                                } else {
                                  setNewPermissions(prev => prev.filter(p => p !== perm))
                                }
                              }}
                              className="mt-0.5"
                              disabled={saving}
                            />
                            <div>
                              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {PERMISSION_LABELS[perm]}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {PERMISSION_DESCRIPTIONS[perm]}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Dialog.Close asChild>
                        <button type="button" className="btn-secondary flex-1" disabled={saving}>
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        type="submit"
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                            Adding...
                          </>
                        ) : (
                          'Add to Allowlist'
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  )
}
