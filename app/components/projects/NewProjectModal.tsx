'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '@/lib/supabase'

type NewProjectModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NewProjectModal({ isOpen, onClose, onSuccess }: NewProjectModalProps) {
  const [name, setName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          project_code: projectCode.trim() || null,
          builder_name: builderName.trim() || null,
          address: address.trim() || null,
          status: 'active'
        })
      
      if (insertError) throw insertError
      
      // Reset form and close
      handleReset()
      onClose()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setName('')
    setProjectCode('')
    setBuilderName('')
    setAddress('')
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset()
      onClose()
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overlay"
          />
        </Dialog.Overlay>
        
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-ios overflow-hidden"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                New Project
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-ios-xs flex items-center justify-center hover:bg-[var(--bg-hover)]">
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Project Name (Required) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Project Name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 123 Main Street Build"
                  className="w-full px-3 py-2 rounded-ios-sm text-sm"
                  style={{ 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border)'
                  }}
                  autoFocus
                />
              </div>

              {/* Project Code */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Project Code
                </label>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="e.g., ABC-001"
                  className="w-full px-3 py-2 rounded-ios-sm text-sm"
                  style={{ 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border)'
                  }}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Short identifier for easy reference
                </p>
              </div>

              {/* Builder Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Builder Name
                </label>
                <input
                  type="text"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="e.g., Acme Construction"
                  className="w-full px-3 py-2 rounded-ios-sm text-sm"
                  style={{ 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border)'
                  }}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Property Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, Austin, TX"
                  className="w-full px-3 py-2 rounded-ios-sm text-sm"
                  style={{ 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border)'
                  }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-ios-sm text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { handleReset(); onClose(); }}
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-ios-sm"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-4 py-2 text-sm rounded-ios-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent border-white" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
