'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import type { Builder, BuilderInsert } from '@/types/custom'

type FormData = {
  company_name: string
  borrower_name: string
  email: string
  phone: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  bank_name: string
  bank_routing_number: string
  bank_account_number: string
  bank_account_name: string
  notes: string
}

type BuilderInfoCardProps = {
  builder?: Builder | null
  isNew?: boolean
  onSave?: (builder: Builder) => void
  onCancel?: () => void
  onDataRefresh?: () => void
}

// Mask sensitive data, showing only last 4 characters
function maskSensitive(value: string | null): string {
  if (!value || value.length < 4) return '••••'
  return '••••' + value.slice(-4)
}

export function BuilderInfoCard({
  builder,
  isNew = false,
  onSave,
  onCancel,
  onDataRefresh,
}: BuilderInfoCardProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)

  // Form state
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    borrower_name: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    bank_name: '',
    bank_routing_number: '',
    bank_account_number: '',
    bank_account_name: '',
    notes: '',
  })

  // Track which banking fields have been modified
  const [bankingModified, setBankingModified] = useState({
    routing: false,
    account: false,
  })

  // Initialize form data from builder
  useEffect(() => {
    if (builder && !isNew) {
      setFormData({
        company_name: builder.company_name || '',
        borrower_name: builder.borrower_name || '',
        email: builder.email || '',
        phone: builder.phone || '',
        address_street: builder.address_street || '',
        address_city: builder.address_city || '',
        address_state: builder.address_state || '',
        address_zip: builder.address_zip || '',
        bank_name: builder.bank_name || '',
        bank_routing_number: '',
        bank_account_number: '',
        bank_account_name: builder.bank_account_name || '',
        notes: builder.notes || '',
      })
      setBankingModified({ routing: false, account: false })
    }
  }, [builder, isNew])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'bank_routing_number') {
      setBankingModified(prev => ({ ...prev, routing: true }))
    }
    if (field === 'bank_account_number') {
      setBankingModified(prev => ({ ...prev, account: true }))
    }
  }

  const handleSave = async () => {
    if (!formData.company_name.trim()) {
      toast({ type: 'error', title: 'Error', message: 'Company name is required' })
      return
    }

    setSaving(true)
    try {
      const builderData: BuilderInsert = {
        company_name: formData.company_name.trim(),
        borrower_name: formData.borrower_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address_street: formData.address_street.trim() || null,
        address_city: formData.address_city.trim() || null,
        address_state: formData.address_state.trim() || null,
        address_zip: formData.address_zip.trim() || null,
        bank_name: formData.bank_name.trim() || null,
        bank_account_name: formData.bank_account_name.trim() || null,
        notes: formData.notes.trim() || null,
      }

      if (bankingModified.routing && formData.bank_routing_number.trim()) {
        builderData.bank_routing_number = formData.bank_routing_number.trim()
      }
      if (bankingModified.account && formData.bank_account_number.trim()) {
        builderData.bank_account_number = formData.bank_account_number.trim()
      }

      if (isNew) {
        const { data, error } = await supabase
          .from('builders')
          .insert(builderData)
          .select()
          .single()

        if (error) throw error
        toast({ type: 'success', title: 'Success', message: 'Builder created successfully' })
        onSave?.(data)
      } else if (builder) {
        const { data, error } = await supabase
          .from('builders')
          .update(builderData)
          .eq('id', builder.id)
          .select()
          .single()

        if (error) throw error
        toast({ type: 'success', title: 'Success', message: 'Builder updated successfully' })
        setIsEditing(false)
        setBankingModified({ routing: false, account: false })
        onDataRefresh?.()
      }
    } catch (err: any) {
      console.error('Save error:', err)
      toast({ type: 'error', title: 'Error', message: err.message || 'Failed to save builder' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (isNew) {
      onCancel?.()
    } else {
      if (builder) {
        setFormData({
          company_name: builder.company_name || '',
          borrower_name: builder.borrower_name || '',
          email: builder.email || '',
          phone: builder.phone || '',
          address_street: builder.address_street || '',
          address_city: builder.address_city || '',
          address_state: builder.address_state || '',
          address_zip: builder.address_zip || '',
          bank_name: builder.bank_name || '',
          bank_routing_number: '',
          bank_account_number: '',
          bank_account_name: builder.bank_account_name || '',
          notes: builder.notes || '',
        })
        setBankingModified({ routing: false, account: false })
      }
      setIsEditing(false)
    }
  }

  // Compact field renderer
  const renderField = (
    label: string,
    field: keyof FormData,
    options?: {
      type?: 'text' | 'email' | 'tel'
      placeholder?: string
      masked?: boolean
      maskedValue?: string
      link?: 'email' | 'phone'
    }
  ) => {
    const { type = 'text', placeholder, masked, maskedValue, link } = options || {}
    const value = formData[field]

    if (!isEditing) {
      let displayValue: React.ReactNode = '—'
      if (masked && builder) {
        displayValue = maskedValue || '—'
      } else if (value) {
        // Make email/phone clickable links
        if (link === 'email') {
          displayValue = (
            <a 
              href={`mailto:${value}`} 
              className="hover:underline transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {value}
            </a>
          )
        } else if (link === 'phone') {
          displayValue = (
            <a 
              href={`tel:${value}`} 
              className="hover:underline transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {value}
            </a>
          )
        } else {
          displayValue = value
        }
      }

      return (
        <div className="min-w-0">
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{label}</div>
          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {displayValue}
          </div>
        </div>
      )
    }

    return (
      <div className="min-w-0">
        <label className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={masked && !isNew ? 'Enter new to change' : placeholder}
          className="input w-full text-sm py-1.5"
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with Edit/Save buttons */}
      {!isNew && (
        <div className="flex justify-between items-center">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Builder Information
          </h3>
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-secondary text-sm py-1.5 px-3" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary text-sm py-1.5 px-3" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center gap-1 text-sm py-1.5 px-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      )}

      {/* Company & Contact - Combined Row */}
      <div className="p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
        <div className="grid grid-cols-4 gap-3">
          {renderField('Company Name', 'company_name', { placeholder: 'Company name' })}
          {renderField('Owner / Guarantor', 'borrower_name', { placeholder: 'Personal guarantor' })}
          {renderField('Email', 'email', { type: 'email', placeholder: 'email@example.com', link: 'email' })}
          {renderField('Phone', 'phone', { type: 'tel', placeholder: '(555) 123-4567', link: 'phone' })}
        </div>
      </div>

      {/* Mailing Address - Compact Row */}
      <div className="p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Mailing Address</div>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            {renderField('Street', 'address_street', { placeholder: '123 Main St' })}
          </div>
          {renderField('City', 'address_city', { placeholder: 'City' })}
          <div className="grid grid-cols-2 gap-2">
            {renderField('State', 'address_state', { placeholder: 'OR' })}
            {renderField('ZIP', 'address_zip', { placeholder: '97701' })}
          </div>
        </div>
      </div>

      {/* Banking Information - Compact Row */}
      <div className="p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
          Banking Information
          <span className="font-normal ml-1">(for wiring draw funds)</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {renderField('Bank Name', 'bank_name', { placeholder: 'Bank of America' })}
          {renderField('Account Name', 'bank_account_name', { placeholder: 'Account holder' })}
          {renderField('Routing #', 'bank_routing_number', {
            placeholder: '9 digits',
            masked: true,
            maskedValue: builder?.bank_routing_number ? maskSensitive(builder.bank_routing_number) : undefined,
          })}
          {renderField('Account #', 'bank_account_number', {
            placeholder: 'Account number',
            masked: true,
            maskedValue: builder?.bank_account_number ? maskSensitive(builder.bank_account_number) : undefined,
          })}
        </div>
      </div>

      {/* Notes - Collapsible */}
      <div className="rounded-ios-sm overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <button
          onClick={() => !isEditing && setNotesExpanded(!notesExpanded)}
          className="w-full p-3 flex items-center justify-between text-left"
          disabled={isEditing}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Notes</span>
          {!isEditing && (
            <motion.svg
              animate={{ rotate: notesExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          )}
        </button>
        <AnimatePresence>
          {(isEditing || notesExpanded) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                {isEditing ? (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about this builder..."
                    className="input w-full min-h-[60px] resize-y text-sm"
                  />
                ) : (
                  <p className="text-sm" style={{ color: formData.notes ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {formData.notes || 'No notes'}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save/Cancel for New Builder */}
      {isNew && (
        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="btn-secondary text-sm py-1.5 px-3" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-sm py-1.5 px-3" disabled={saving}>
            {saving ? 'Creating...' : 'Create Builder'}
          </button>
        </div>
      )}
    </div>
  )
}
