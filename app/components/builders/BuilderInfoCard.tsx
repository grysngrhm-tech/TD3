'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/app/components/ui/Toast'
import type { Builder, BuilderInsert } from '@/types/database'

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

  // Track which banking fields have been modified (to avoid overwriting with empty)
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
        bank_routing_number: '', // Don't load actual values for security
        bank_account_number: '', // Don't load actual values for security
        bank_account_name: builder.bank_account_name || '',
        notes: builder.notes || '',
      })
      setBankingModified({ routing: false, account: false })
    }
  }, [builder, isNew])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Track banking field modifications
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

      // Only include banking numbers if they were modified
      if (bankingModified.routing && formData.bank_routing_number.trim()) {
        builderData.bank_routing_number = formData.bank_routing_number.trim()
      }
      if (bankingModified.account && formData.bank_account_number.trim()) {
        builderData.bank_account_number = formData.bank_account_number.trim()
      }

      if (isNew) {
        // Create new builder
        const { data, error } = await supabase
          .from('builders')
          .insert(builderData)
          .select()
          .single()

        if (error) throw error

        toast({ type: 'success', title: 'Success', message: 'Builder created successfully' })
        onSave?.(data)
      } else if (builder) {
        // Update existing builder
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
      // Reset form to original values
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

  // Render a field - either as input (edit mode) or as static text (view mode)
  const renderField = (
    label: string,
    field: keyof FormData,
    options?: {
      type?: 'text' | 'email' | 'tel'
      placeholder?: string
      masked?: boolean
      maskedValue?: string
    }
  ) => {
    const { type = 'text', placeholder, masked, maskedValue } = options || {}
    const value = formData[field]

    if (!isEditing) {
      // View mode - static display
      let displayValue: string = '—'
      if (masked && builder) {
        // Show masked banking info
        displayValue = maskedValue || '—'
      } else if (value) {
        displayValue = value
      }

      return (
        <div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {displayValue}
          </div>
        </div>
      )
    }

    // Edit mode - input field
    return (
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={masked && !isNew ? 'Enter new to change' : placeholder}
          className="input w-full"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit/Save buttons */}
      {!isNew && (
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Builder Information
          </h3>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      )}

      {/* Company Information */}
      <div className="card-ios">
        <h4 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Company Details
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Company Name', 'company_name', { placeholder: 'Builder company name' })}
          {renderField('Owner / Guarantor', 'borrower_name', { placeholder: 'Personal guarantee signor' })}
        </div>
      </div>

      {/* Contact Information */}
      <div className="card-ios">
        <h4 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Contact Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Email Address', 'email', { type: 'email', placeholder: 'email@example.com' })}
          {renderField('Phone Number', 'phone', { type: 'tel', placeholder: '(555) 123-4567' })}
        </div>
      </div>

      {/* Mailing Address */}
      <div className="card-ios">
        <h4 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Mailing Address
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {renderField('Street Address', 'address_street', { placeholder: '123 Main St' })}
          <div className="grid grid-cols-3 gap-4">
            {renderField('City', 'address_city', { placeholder: 'City' })}
            {renderField('State', 'address_state', { placeholder: 'TX' })}
            {renderField('ZIP Code', 'address_zip', { placeholder: '12345' })}
          </div>
        </div>
      </div>

      {/* Banking Information */}
      <div className="card-ios">
        <h4 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Banking Information
          <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
            For wiring draw funds
          </span>
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {renderField('Bank Name', 'bank_name', { placeholder: 'Bank of America' })}
          {renderField('Account Name', 'bank_account_name', { placeholder: 'Account holder name' })}
          {renderField('Routing Number', 'bank_routing_number', {
            placeholder: '9 digits',
            masked: true,
            maskedValue: builder?.bank_routing_number ? maskSensitive(builder.bank_routing_number) : undefined,
          })}
          {renderField('Account Number', 'bank_account_number', {
            placeholder: 'Account number',
            masked: true,
            maskedValue: builder?.bank_account_number ? maskSensitive(builder.bank_account_number) : undefined,
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="card-ios">
        <h4 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Notes
        </h4>
        {isEditing ? (
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes about this builder..."
            className="input w-full min-h-[100px] resize-y"
          />
        ) : (
          <p style={{ color: formData.notes ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {formData.notes || 'No notes'}
          </p>
        )}
      </div>

      {/* Save/Cancel for New Builder */}
      {isNew && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Builder'}
          </button>
        </div>
      )}
    </div>
  )
}
