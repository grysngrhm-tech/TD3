'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, Budget, LifecycleStage, Builder, Lender } from '@/types/database'
import { ImportPreview } from '@/app/components/import/ImportPreview'
import { DocumentUploadSection } from './DocumentUploadSection'
import { BudgetEditor } from './BudgetEditor'
import { toast } from '@/app/components/ui/Toast'
import { SubdivisionCombobox } from '@/app/components/ui/SubdivisionCombobox'
import { generateProjectCode } from '@/lib/projectCode'
import { supabase } from '@/lib/supabase'

// Default term sheet values
const DEFAULT_TERMS = {
  interest_rate_annual: 0.11, // 11%
  origination_fee_pct: 0.02, // 2%
  loan_term_months: 12,
  document_fee: 1000,
}

type FormData = {
  name: string
  subdivision_name: string
  lot_number: string
  builder_id: string
  lender_id: string
  borrower_name: string
  address: string
  loan_amount: string
  appraised_value: string  // Also serves as "Estimated Value" - the expected sales price for LTV
  square_footage: string
  interest_rate_annual: string
  origination_fee_pct: string
  loan_term_months: string
}

// Validation state for required fields
type ValidationErrors = {
  subdivision_name?: string
  lot_number?: string
}

type OriginationTabProps = {
  project?: Project & { lifecycle_stage: LifecycleStage }
  budgets: Budget[]
  builder?: Builder | null
  isNew?: boolean
  onSave?: (projectId: string) => void
  onCancel?: () => void
  onBudgetImported?: () => void
}

export function OriginationTab({ 
  project, 
  budgets,
  builder: initialBuilder,
  isNew = false,
  onSave,
  onCancel,
  onBudgetImported 
}: OriginationTabProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(isNew)
  const [showBudgetImport, setShowBudgetImport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [builders, setBuilders] = useState<Builder[]>([])
  const [builderSearchOpen, setBuilderSearchOpen] = useState(false)
  const [builderSearchTerm, setBuilderSearchTerm] = useState('')
  
  // Lender state
  const [lenders, setLenders] = useState<Lender[]>([])
  const [lenderSearchOpen, setLenderSearchOpen] = useState(false)
  const [lenderSearchTerm, setLenderSearchTerm] = useState('')
  
  // Loan activation state
  const [loanDocsRecorded, setLoanDocsRecorded] = useState(project?.loan_docs_recorded ?? false)
  const [activating, setActivating] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    subdivision_name: '',
    lot_number: '',
    builder_id: '',
    lender_id: '',
    borrower_name: '',
    address: '',
    loan_amount: '',
    appraised_value: '',  // Estimated value / expected sales price
    square_footage: '',
    interest_rate_annual: (DEFAULT_TERMS.interest_rate_annual * 100).toString(),
    origination_fee_pct: (DEFAULT_TERMS.origination_fee_pct * 100).toString(),
    loan_term_months: DEFAULT_TERMS.loan_term_months.toString(),
  })
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Load all builders and lenders for dropdowns
  useEffect(() => {
    loadBuilders()
    loadLenders()
  }, [])

  async function loadBuilders() {
    const { data } = await supabase
      .from('builders')
      .select('*')
      .order('company_name', { ascending: true })
    
    setBuilders(data || [])
  }

  async function loadLenders() {
    const { data } = await supabase
      .from('lenders')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    setLenders(data || [])
  }

  // Initialize form data from project when not new
  useEffect(() => {
    if (project && !isNew) {
      setFormData({
        name: project.name || '',
        subdivision_name: project.subdivision_name || '',
        lot_number: project.lot_number || '',
        builder_id: project.builder_id || '',
        lender_id: project.lender_id || '',
        borrower_name: project.borrower_name || '',
        address: project.address || '',
        loan_amount: project.loan_amount?.toString() || '',
        appraised_value: project.appraised_value?.toString() || '',
        square_footage: project.square_footage?.toString() || '',
        interest_rate_annual: project.interest_rate_annual 
          ? (project.interest_rate_annual * 100).toString() 
          : (DEFAULT_TERMS.interest_rate_annual * 100).toString(),
        origination_fee_pct: project.origination_fee_pct 
          ? (project.origination_fee_pct * 100).toString() 
          : (DEFAULT_TERMS.origination_fee_pct * 100).toString(),
        loan_term_months: project.loan_term_months?.toString() || DEFAULT_TERMS.loan_term_months.toString(),
      })
    }
  }, [project, isNew])

  // Get the currently selected builder
  const selectedBuilder = useMemo(() => {
    if (formData.builder_id) {
      return builders.find(b => b.id === formData.builder_id) || initialBuilder || null
    }
    return initialBuilder || null
  }, [formData.builder_id, builders, initialBuilder])

  // Filter builders for search dropdown
  const filteredBuilders = useMemo(() => {
    if (!builderSearchTerm) return builders
    const term = builderSearchTerm.toLowerCase()
    return builders.filter(b => 
      b.company_name.toLowerCase().includes(term) ||
      (b.borrower_name && b.borrower_name.toLowerCase().includes(term))
    )
  }, [builders, builderSearchTerm])

  // Get the currently selected lender
  const selectedLender = useMemo(() => {
    if (formData.lender_id) {
      return lenders.find(l => l.id === formData.lender_id) || null
    }
    return null
  }, [formData.lender_id, lenders])

  // Filter lenders for search dropdown
  const filteredLenders = useMemo(() => {
    if (!lenderSearchTerm) return lenders
    const term = lenderSearchTerm.toLowerCase()
    return lenders.filter(l => 
      l.name.toLowerCase().includes(term) ||
      l.code.toLowerCase().includes(term)
    )
  }, [lenders, lenderSearchTerm])

  // Auto-generate project code
  const projectCode = useMemo(() => {
    return generateProjectCode(formData.subdivision_name, formData.lot_number)
  }, [formData.subdivision_name, formData.lot_number])

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate metrics
  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  
  const loanAmountNum = parseFloat(formData.loan_amount) || 0
  const appraisedValueNum = parseFloat(formData.appraised_value) || 0
  const squareFootageNum = parseFloat(formData.square_footage) || 0
  
  const ltvRatio = appraisedValueNum > 0 && loanAmountNum > 0
    ? (loanAmountNum / appraisedValueNum) * 100 
    : null
  const costPerSqft = squareFootageNum > 0 && loanAmountNum > 0
    ? loanAmountNum / squareFootageNum
    : null

  const isPending = project?.lifecycle_stage === 'pending' || isNew

  // LTV gauge color (≤65% green, 66-74% yellow, ≥75% red)
  const getLtvColor = (ltv: number) => {
    if (ltv <= 65) return 'var(--success)'
    if (ltv <= 74) return 'var(--warning)'
    return 'var(--error)'
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }
  
  // Validate required fields
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}
    
    if (!formData.subdivision_name.trim()) {
      errors.subdivision_name = 'Subdivision is required'
    }
    if (!formData.lot_number.trim()) {
      errors.lot_number = 'Lot number is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleBuilderSelect = (builder: Builder) => {
    setFormData(prev => ({
      ...prev,
      builder_id: builder.id,
      // Auto-fill borrower name from builder profile
      borrower_name: builder.borrower_name || prev.borrower_name || '',
    }))
    setBuilderSearchOpen(false)
    setBuilderSearchTerm('')
  }

  const handleSave = async () => {
    // Validate required fields
    if (!validateForm()) {
      toast({ type: 'error', title: 'Error', message: 'Please fill in all required fields' })
      return
    }

    setSaving(true)
    try {
      // Use project code as the name (auto-generated from subdivision + lot)
      const generatedName = projectCode || `${formData.subdivision_name} Lot ${formData.lot_number}`
      const projectData = {
        name: generatedName,
        project_code: projectCode || null,
        subdivision_name: formData.subdivision_name.trim() || null,
        lot_number: formData.lot_number.trim() || null,
        builder_id: formData.builder_id || null,
        lender_id: formData.lender_id || null,
        borrower_name: formData.borrower_name.trim() || null,
        address: formData.address.trim() || null,
        loan_amount: formData.loan_amount ? parseFloat(formData.loan_amount) : null,
        appraised_value: formData.appraised_value ? parseFloat(formData.appraised_value) : null,
        // sales_price is deprecated - we now use appraised_value as the estimated value
        sales_price: formData.appraised_value ? parseFloat(formData.appraised_value) : null,
        square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
        interest_rate_annual: formData.interest_rate_annual 
          ? parseFloat(formData.interest_rate_annual) / 100 
          : DEFAULT_TERMS.interest_rate_annual,
        origination_fee_pct: formData.origination_fee_pct 
          ? parseFloat(formData.origination_fee_pct) / 100 
          : DEFAULT_TERMS.origination_fee_pct,
        loan_term_months: formData.loan_term_months 
          ? parseInt(formData.loan_term_months) 
          : DEFAULT_TERMS.loan_term_months,
      }

      if (isNew) {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert({
            ...projectData,
            status: 'active',
            lifecycle_stage: 'pending',
          })
          .select('id')
          .single()

        if (error) throw error

        toast({ type: 'success', title: 'Success', message: 'Loan created successfully' })
        onSave?.(data.id)
      } else if (project) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', project.id)

        if (error) throw error

        toast({ type: 'success', title: 'Success', message: 'Loan updated successfully' })
        setIsEditing(false)
        onBudgetImported?.() // Refresh data
      }
    } catch (err: any) {
      console.error('Save error:', err)
      toast({ type: 'error', title: 'Error', message: err.message || 'Failed to save loan' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (isNew) {
      onCancel?.()
    } else {
      // Reset form to original values
      if (project) {
        setFormData({
          name: project.name || '',
          subdivision_name: project.subdivision_name || '',
          lot_number: project.lot_number || '',
          builder_id: project.builder_id || '',
          lender_id: project.lender_id || '',
          borrower_name: project.borrower_name || '',
          address: project.address || '',
          loan_amount: project.loan_amount?.toString() || '',
          appraised_value: project.appraised_value?.toString() || '',
          square_footage: project.square_footage?.toString() || '',
          interest_rate_annual: project.interest_rate_annual 
            ? (project.interest_rate_annual * 100).toString() 
            : (DEFAULT_TERMS.interest_rate_annual * 100).toString(),
          origination_fee_pct: project.origination_fee_pct 
            ? (project.origination_fee_pct * 100).toString() 
            : (DEFAULT_TERMS.origination_fee_pct * 100).toString(),
          loan_term_months: project.loan_term_months?.toString() || DEFAULT_TERMS.loan_term_months.toString(),
        })
      }
      setIsEditing(false)
      setValidationErrors({})
    }
  }

  // Handle loan activation (Pending -> Active)
  const handleActivateLoan = async () => {
    if (!project || !loanDocsRecorded) return
    
    // Lender is required to activate
    if (!formData.lender_id && !project.lender_id) {
      toast({ 
        type: 'error', 
        title: 'Lender Required', 
        message: 'Please select a lender before activating the loan.' 
      })
      return
    }
    
    setActivating(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Calculate maturity date from loan term
      let maturityDate: string | null = null
      const termMonths = project.loan_term_months || parseInt(formData.loan_term_months) || 12
      if (termMonths) {
        const maturity = new Date()
        maturity.setMonth(maturity.getMonth() + termMonths)
        maturityDate = maturity.toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('projects')
        .update({
          lifecycle_stage: 'active',
          loan_docs_recorded: true,
          loan_docs_recorded_at: new Date().toISOString(),
          loan_start_date: today,
          maturity_date: maturityDate,
          stage_changed_at: new Date().toISOString(),
        })
        .eq('id', project.id)

      if (error) throw error

      toast({ 
        type: 'success', 
        title: 'Loan Activated', 
        message: 'The loan is now active and ready for draws.' 
      })
      onBudgetImported?.() // Refresh data
    } catch (err: any) {
      console.error('Activation error:', err)
      toast({ type: 'error', title: 'Error', message: err.message || 'Failed to activate loan' })
    } finally {
      setActivating(false)
    }
  }

  // Render a field - either as input (edit mode) or as static text (view mode)
  const renderField = (
    label: string, 
    field: keyof FormData, 
    type: 'text' | 'currency' | 'percent' | 'number' = 'text',
    placeholder?: string,
    options?: { required?: boolean; helperText?: string }
  ) => {
    const value = formData[field]
    const error = validationErrors[field as keyof ValidationErrors]
    const isRequired = options?.required ?? false
    const helperText = options?.helperText
    
    if (!isEditing) {
      // View mode - static display
      let displayValue: string = '—'
      if (value) {
        if (type === 'currency') {
          displayValue = formatCurrency(parseFloat(value))
        } else if (type === 'percent') {
          displayValue = `${value}%`
        } else if (type === 'number' && field === 'square_footage') {
          displayValue = `${parseInt(value).toLocaleString()} sq ft`
        } else if (field === 'loan_term_months') {
          displayValue = `${value} months`
        } else {
          displayValue = value
        }
      }
      
      return (
        <div>
          <div style={{ color: 'var(--text-muted)' }}>{label}</div>
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
          {isRequired && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
        <div className="relative">
          {type === 'currency' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>$</span>
          )}
          <input
            type={type === 'text' ? 'text' : 'number'}
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            className="input w-full"
            style={{ 
              paddingLeft: type === 'currency' ? '1.75rem' : undefined,
              paddingRight: type === 'percent' ? '2rem' : undefined,
              borderColor: error ? 'var(--error)' : undefined,
            }}
          />
          {type === 'percent' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>%</span>
          )}
        </div>
        {error && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{helperText}</p>
        )}
      </div>
    )
  }

  // Render subdivision field with combobox
  const renderSubdivisionField = () => {
    const error = validationErrors.subdivision_name

    if (!isEditing) {
      return (
        <div>
          <div style={{ color: 'var(--text-muted)' }}>Subdivision</div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {formData.subdivision_name || '—'}
          </div>
        </div>
      )
    }

    return (
      <div>
        <SubdivisionCombobox
          value={formData.subdivision_name}
          onChange={(value) => handleInputChange('subdivision_name', value)}
          placeholder="Search or create subdivision..."
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{error}</p>
        )}
      </div>
    )
  }

  // Render builder field with special handling
  const renderBuilderField = () => {
    if (!isEditing) {
      // View mode - show builder name as link
      return (
        <div>
          <div style={{ color: 'var(--text-muted)' }}>Builder</div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {selectedBuilder ? (
              <button
                onClick={() => router.push(`/builders/${selectedBuilder.id}`)}
                className="hover:underline transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                {selectedBuilder.company_name}
              </button>
            ) : (
              '—'
            )}
          </div>
        </div>
      )
    }

    // Edit mode - searchable dropdown
    return (
      <div className="relative">
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          Builder
        </label>
        <button
          type="button"
          onClick={() => setBuilderSearchOpen(!builderSearchOpen)}
          className="input w-full text-left flex items-center justify-between"
        >
          <span style={{ color: selectedBuilder ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {selectedBuilder?.company_name || 'Select builder...'}
          </span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {builderSearchOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 rounded-ios-sm shadow-lg z-50 max-h-64 overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Search input */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <input
                type="text"
                value={builderSearchTerm}
                onChange={(e) => setBuilderSearchTerm(e.target.value)}
                placeholder="Search builders..."
                className="input w-full"
                autoFocus
              />
            </div>

            {/* Builder list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredBuilders.length === 0 ? (
                <div className="p-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  No builders found
                </div>
              ) : (
                filteredBuilders.map((builder) => (
                  <button
                    key={builder.id}
                    type="button"
                    onClick={() => handleBuilderSelect(builder)}
                    className="w-full p-3 text-left hover:bg-opacity-50 transition-colors flex items-center justify-between"
                    style={{ 
                      background: builder.id === formData.builder_id ? 'var(--bg-hover)' : undefined 
                    }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {builder.company_name}
                      </div>
                      {builder.borrower_name && (
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {builder.borrower_name}
                        </div>
                      )}
                    </div>
                    {builder.id === formData.builder_id && (
                      <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Clear selection option */}
            {formData.builder_id && (
              <div className="border-t p-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('builder_id', '')
                    setBuilderSearchOpen(false)
                  }}
                  className="w-full text-sm p-2 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render lender field with searchable dropdown
  const renderLenderField = () => {
    if (!isEditing) {
      // View mode - show lender name
      return (
        <div>
          <div style={{ color: 'var(--text-muted)' }}>Lender</div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {selectedLender ? selectedLender.name : '—'}
          </div>
        </div>
      )
    }

    // Edit mode - searchable dropdown
    return (
      <div className="relative">
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          Lender
        </label>
        <button
          type="button"
          onClick={() => setLenderSearchOpen(!lenderSearchOpen)}
          className="input w-full text-left flex items-center justify-between"
        >
          <span style={{ color: selectedLender ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {selectedLender?.name || 'Select lender...'}
          </span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {lenderSearchOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 rounded-ios-sm shadow-lg z-50 max-h-64 overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Search input */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <input
                type="text"
                value={lenderSearchTerm}
                onChange={(e) => setLenderSearchTerm(e.target.value)}
                placeholder="Search lenders..."
                className="input w-full"
                autoFocus
              />
            </div>

            {/* Lender list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredLenders.length === 0 ? (
                <div className="p-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  No lenders found
                </div>
              ) : (
                filteredLenders.map((lender) => (
                  <button
                    key={lender.id}
                    type="button"
                    onClick={() => {
                      handleInputChange('lender_id', lender.id)
                      setLenderSearchOpen(false)
                      setLenderSearchTerm('')
                    }}
                    className="w-full p-3 text-left hover:bg-opacity-50 transition-colors flex items-center justify-between"
                    style={{ 
                      background: lender.id === formData.lender_id ? 'var(--bg-hover)' : undefined 
                    }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {lender.name}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {lender.code}
                      </div>
                    </div>
                    {lender.id === formData.lender_id && (
                      <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Clear selection option */}
            {formData.lender_id && (
              <div className="border-t p-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('lender_id', '')
                    setLenderSearchOpen(false)
                  }}
                  className="w-full text-sm p-2 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render a read-only auto-filled field
  const renderAutoFilledField = (label: string, value: string | null | undefined) => {
    return (
      <div>
        <div style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="font-medium" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value || '—'}
        </div>
        {isEditing && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Auto-filled from builder
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit/Save buttons */}
      {!isNew && (
        <div className="flex justify-end">
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

      {/* Qualification Metrics - Always visible */}
      <div className="grid grid-cols-3 gap-4">
        {/* LTV Ratio */}
        <div className="card-ios">
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>LTV Ratio</div>
          {ltvRatio !== null ? (
            <>
              <div className="text-3xl font-bold mb-3" style={{ color: getLtvColor(ltvRatio) }}>
                {ltvRatio.toFixed(1)}%
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(ltvRatio, 100)}%`,
                    background: getLtvColor(ltvRatio)
                  }}
                />
                {/* 75% marker */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: '75%', background: 'var(--text-muted)', opacity: 0.5 }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>—</div>
          )}
        </div>

        {/* Cost per Sqft */}
        <div className="card-ios">
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Cost / Sq Ft</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {costPerSqft ? `$${costPerSqft.toFixed(0)}` : '—'}
          </div>
          {squareFootageNum > 0 && (
            <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              {squareFootageNum.toLocaleString()} sq ft
            </div>
          )}
        </div>

        {/* Total Budget */}
        <div className="card-ios">
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Total Budget</div>
          <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalBudget > 0 ? formatCurrency(totalBudget) : '—'}
          </div>
          <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {budgets.length} line items
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="card-ios">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Loan Details</h3>
          {isEditing && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--error)' }}>*</span> Required fields
            </span>
          )}
        </div>
        
        {/* Section 1: Property Identification */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Property Identification
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {/* Project Code - auto-generated */}
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Project Code</div>
              <div className="text-lg font-semibold font-mono" style={{ color: projectCode ? 'var(--accent)' : 'var(--text-muted)' }}>
                {projectCode || (isEditing ? 'Auto-generated' : '—')}
              </div>
              {isEditing && !projectCode && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Generated from Subdivision + Lot
                </p>
              )}
            </div>
            {renderSubdivisionField()}
            {renderField('Lot Number', 'lot_number', 'text', 'e.g., 244', { required: true })}
            {renderField('Address', 'address', 'text', 'Property address')}
          </div>
        </div>

        {/* Section 2: Builder */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Builder
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {renderBuilderField()}
            {renderAutoFilledField('Borrower', selectedBuilder?.borrower_name)}
            {renderAutoFilledField('Bank', selectedBuilder?.bank_name)}
            {renderAutoFilledField('Contact', selectedBuilder?.phone || selectedBuilder?.email)}
          </div>
        </div>

        {/* Section 3: Financial Terms */}
        <div className="mb-6 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Financial Terms
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {renderLenderField()}
            {renderField('Loan Amount', 'loan_amount', 'currency', '0')}
            {renderField('Estimated Value', 'appraised_value', 'currency', '0', { 
              helperText: 'Expected sales price for LTV qualification'
            })}
            {/* Budget Amount - auto-calculated from budget categories */}
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Budget Amount</div>
              <div className="font-medium" style={{ color: totalBudget > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {totalBudget > 0 ? formatCurrency(totalBudget) : (budgets.length === 0 ? 'Upload budget' : '—')}
              </div>
              {!isEditing && budgets.length > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {budgets.length} line items
                </p>
              )}
            </div>
            {renderField('Interest Rate', 'interest_rate_annual', 'percent', '11')}
            {renderField('Origination Fee', 'origination_fee_pct', 'percent', '2')}
            {renderField('Term', 'loan_term_months', 'number', '12')}
          </div>
        </div>

        {/* Section 4: Property Details */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Property Details
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {renderField('Square Footage', 'square_footage', 'number', '0')}
          </div>
        </div>
      </div>

      {/* Save/Cancel for New Loan */}
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
            {saving ? 'Creating...' : 'Create Loan'}
          </button>
        </div>
      )}

      {/* Documents Section - Only show after loan is created */}
      {!isNew && project && (
        <DocumentUploadSection 
          projectId={project.id}
          onDocumentChange={onBudgetImported}
        />
      )}

      {/* Budget Section - Only show after loan is created */}
      {!isNew && project && (
        <>
          <BudgetEditor
            budgets={budgets}
            projectId={project.id}
            isEditing={isEditing || isPending}
            onBudgetsChange={onBudgetImported}
            onUploadClick={() => setShowBudgetImport(true)}
          />

          {/* Budget Import Modal */}
          <ImportPreview
            isOpen={showBudgetImport}
            onClose={() => setShowBudgetImport(false)}
            onSuccess={() => {
              setShowBudgetImport(false)
              toast({
                type: 'success',
                title: 'Budget Import Started',
                message: 'Your budget is being processed. This typically takes 5-10 seconds.'
              })
              // Staged refresh to catch N8N processing - first attempt after 3s, second after 8s
              setTimeout(() => onBudgetImported?.(), 3000)
              setTimeout(() => onBudgetImported?.(), 8000)
            }}
            importType="budget"
            preselectedProjectId={project.id}
            preselectedBuilderId={project.builder_id}
          />
        </>
      )}

      {/* Loan Activation Section - Only show for pending loans */}
      {!isNew && project && isPending && (
        <div 
          className="card-ios"
          style={{ borderLeft: '4px solid var(--warning)' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Ready to Activate</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Once loan documents are recorded, activate the loan to begin funding draws.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* DocuSign Integration Placeholder */}
            <div 
              className="p-4 rounded-lg border border-dashed flex items-start gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-hover)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>DocuSign Integration</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                  >
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Future integration will allow sending loan documents for signature via DocuSign 
                  and automatically update this status when executed.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-3 text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-not-allowed"
                  style={{ 
                    background: 'var(--bg-hover)', 
                    color: 'var(--text-muted)',
                    opacity: 0.6
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send for Signature
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border)' }}></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                  or manually confirm
                </span>
              </div>
            </div>

            {/* Loan Documents Recorded Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={loanDocsRecorded}
                onChange={(e) => setLoanDocsRecorded(e.target.checked)}
                className="mt-1 h-5 w-5 rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              <div>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Loan Documents Recorded
                </span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  DocuSign loan agreement has been executed and recorded
                </p>
              </div>
            </label>

            {/* Info about what happens on activation */}
            {loanDocsRecorded && (
              <div 
                className="p-3 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <p>When activated:</p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>Loan Agreement goes into effect (rate lock begins)</li>
                      <li>Loan status changes to Active, enabling draw requests</li>
                      <li className="mt-1" style={{ color: 'var(--text-muted)' }}>
                        Note: Fee clock and {formData.loan_term_months || 12}-month term begin upon first draw funding
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Activate Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleActivateLoan}
                disabled={!loanDocsRecorded || activating}
                className="btn-primary flex items-center gap-2"
                style={{ 
                  opacity: (!loanDocsRecorded || activating) ? 0.5 : 1,
                  cursor: (!loanDocsRecorded || activating) ? 'not-allowed' : 'pointer'
                }}
              >
                {activating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                    Activating...
                  </>
                ) : (
                  <>
                    Activate Loan
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
