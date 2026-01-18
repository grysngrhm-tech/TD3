'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from '@/app/components/ui/Toast'

export function FirstLoginModal() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // Show modal if user is logged in and hasn't completed first login
  const isOpen = !!user && !!profile && !profile.first_login_completed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('Name required', 'Please enter your name')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          first_login_completed: true,
        })
        .eq('id', user!.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error('Error', 'Failed to save profile')
        return
      }

      toast.success('Welcome!', 'Your profile has been saved')
      await refreshProfile()

    } catch (err) {
      console.error('Error saving profile:', err)
      toast.error('Error', 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={isOpen}>
      <AnimatePresence>
        {isOpen && (
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
                <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Complete Your Profile
                  </Dialog.Title>
                  <Dialog.Description className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Welcome to TD3! Please provide your contact information.
                  </Dialog.Description>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Full Name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="input-ios w-full"
                      autoFocus
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Phone Number <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="input-ios w-full"
                      disabled={saving}
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                          Saving...
                        </>
                      ) : (
                        'Get Started'
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
  )
}
