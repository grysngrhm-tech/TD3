'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'

export function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [isSaving, setIsSaving] = useState(false)

  // Update form when profile changes
  if (profile && fullName === '' && profile.full_name) {
    setFullName(profile.full_name)
  }
  if (profile && phone === '' && profile.phone) {
    setPhone(profile.phone)
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
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
    } catch (err) {
      console.error('Error saving profile:', err)
      toast.error('An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges =
    (fullName.trim() || '') !== (profile?.full_name || '') ||
    (phone.trim() || '') !== (profile?.phone || '')

  return (
    <div className="card-ios">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Profile Information
      </h2>

      <div className="space-y-6">
        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="input-ios w-full opacity-60 cursor-not-allowed"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Email cannot be changed
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="full-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Full Name
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="input-ios w-full"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="input-ios w-full"
          />
        </div>

        {/* Account Info */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Account Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span style={{ color: 'var(--text-muted)' }}>User ID</span>
              <p className="font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {user?.id}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Member Since</span>
              <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
