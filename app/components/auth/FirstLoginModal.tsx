'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from '@/app/components/ui/Toast'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'

export function FirstLoginModal() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileCreationFailed, setProfileCreationFailed] = useState(false)

  // If user exists but profile doesn't, attempt to create it
  useEffect(() => {
    if (user && !profile && !isCreatingProfile && !profileCreationFailed) {
      setIsCreatingProfile(true)

      const createProfile = async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert(
              { id: user.id, email: user.email },
              { onConflict: 'id', ignoreDuplicates: true }
            )

          if (error) {
            console.error('Failed to create profile in modal:', error)
            setProfileCreationFailed(true)
          } else {
            // Profile created, refresh to get it
            await refreshProfile()
          }
        } catch (err) {
          console.error('Error creating profile in modal:', err)
          setProfileCreationFailed(true)
        } finally {
          setIsCreatingProfile(false)
        }
      }

      createProfile()
    }
  }, [user, profile, isCreatingProfile, profileCreationFailed, refreshProfile])

  // Show modal if:
  // 1. User is logged in AND profile exists AND first login not completed, OR
  // 2. User is logged in AND profile doesn't exist (we're creating it)
  const isOpen = !!user && (
    (!!profile && !profile.first_login_completed) ||
    (!profile && !profileCreationFailed)
  )

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
                className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-ios bg-background-secondary"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-border">
                  <Dialog.Title className="text-lg font-semibold text-text-primary">
                    Complete Your Profile
                  </Dialog.Title>
                  <Dialog.Description className="text-sm mt-1 text-text-muted">
                    Welcome to TD3! Please provide your contact information.
                  </Dialog.Description>
                </div>

                {/* Content - Loading state or Form */}
                {isCreatingProfile || !profile ? (
                  <div className="p-6 flex flex-col items-center justify-center py-12">
                    <LoadingSpinner className="mb-4" />
                    <p className="text-text-muted">Setting up your account...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-sm font-medium mb-1.5 text-text-secondary"
                        
                      >
                        Full Name <span className="text-error">*</span>
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
                        className="block text-sm font-medium mb-1.5 text-text-secondary"
                        
                      >
                        Phone Number <span className="text-text-muted">(optional)</span>
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
                            <LoadingSpinner size="sm" variant="white" />
                            Saving...
                          </>
                        ) : (
                          'Get Started'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
