'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Budget, NahbCostCode } from '@/types/database'
import { toast } from '@/app/components/ui/Toast'

type BudgetEditorProps = {
  budgets: Budget[]
  projectId: string
  isEditing: boolean
  onBudgetsChange?: () => void
  onUploadClick?: () => void
}

type EditableBudget = Budget & {
  isNew?: boolean
  isDirty?: boolean
}

export function BudgetEditor({ 
  budgets, 
  projectId, 
  isEditing, 
  onBudgetsChange,
  onUploadClick 
}: BudgetEditorProps) {
  const [editableBudgets, setEditableBudgets] = useState<EditableBudget[]>([])
  const [nahbCodes, setNahbCodes] = useState<NahbCostCode[]>([])
  const [saving, setSaving] = useState(false)
  const [pendingSubcategoryOpen, setPendingSubcategoryOpen] = useState<string | null>(null)
  
  // Refs for subcategory selects to auto-open them
  const subcategoryRefs = useRef<{ [key: string]: HTMLSelectElement | null }>({})

  // Load NAHB codes
  useEffect(() => {
    loadNahbCodes()
  }, [])

  // Sync budgets to editable state
  useEffect(() => {
    setEditableBudgets(budgets.map(b => ({ ...b, isDirty: false, isNew: false })))
  }, [budgets])

  // Auto-open subcategory dropdown when category changes
  useEffect(() => {
    if (pendingSubcategoryOpen) {
      const selectEl = subcategoryRefs.current[pendingSubcategoryOpen]
      if (selectEl) {
        // Small delay to ensure the DOM is ready
        setTimeout(() => {
          selectEl.focus()
          // Try to open the dropdown (works in most browsers)
          selectEl.click()
        }, 50)
      }
      setPendingSubcategoryOpen(null)
    }
  }, [pendingSubcategoryOpen])

  const loadNahbCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('nahb_cost_codes')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      if (data) setNahbCodes(data as NahbCostCode[])
    } catch (err) {
      console.error('Error loading NAHB codes:', err)
    }
  }

  // Get unique categories sorted
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>()
    nahbCodes.forEach(code => {
      if (code.category) categories.add(code.category)
    })
    return Array.from(categories).sort()
  }, [nahbCodes])

  // Get subcategories for a given category
  const getSubcategoriesForCategory = (category: string | null) => {
    if (!category) return []
    const subcategories = new Set<string>()
    nahbCodes.forEach(code => {
      if (code.category === category && code.subcategory) {
        subcategories.add(code.subcategory)
      }
    })
    return Array.from(subcategories).sort()
  }

  // Find the code for a category/subcategory combination
  const findCodeForCategorySubcategory = (category: string | null, subcategory: string | null) => {
    if (!category || !subcategory) return null
    const match = nahbCodes.find(
      code => code.category === category && code.subcategory === subcategory
    )
    return match?.code || null
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const totalBudget = useMemo(() => {
    return editableBudgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  }, [editableBudgets])

  const handleAmountChange = (budgetId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditableBudgets(prev => prev.map(b => 
      b.id === budgetId 
        ? { ...b, current_amount: numValue, original_amount: numValue, isDirty: true }
        : b
    ))
  }

  const handleBuilderCategoryChange = (budgetId: string, value: string) => {
    setEditableBudgets(prev => prev.map(b => 
      b.id === budgetId 
        ? { ...b, builder_category_raw: value, isDirty: true }
        : b
    ))
  }

  // Handle category change - clears subcategory and code, then auto-opens subcategory
  const handleCategoryChange = (budgetId: string, category: string) => {
    setEditableBudgets(prev => prev.map(b => 
      b.id === budgetId 
        ? { 
            ...b, 
            nahb_category: category || null,
            category: category || b.category,
            nahb_subcategory: null, // Reset subcategory when category changes
            cost_code: null, // Reset code when category changes
            isDirty: true 
          }
        : b
    ))
    
    // Trigger auto-open of subcategory dropdown
    if (category) {
      setPendingSubcategoryOpen(budgetId)
    }
  }

  // Handle subcategory change - auto-selects the code
  const handleSubcategoryChange = (budgetId: string, subcategory: string) => {
    const budget = editableBudgets.find(b => b.id === budgetId)
    const code = findCodeForCategorySubcategory(budget?.nahb_category || null, subcategory)
    
    setEditableBudgets(prev => prev.map(b => 
      b.id === budgetId 
        ? { 
            ...b, 
            nahb_subcategory: subcategory || null,
            cost_code: code,
            isDirty: true 
          }
        : b
    ))
  }

  // Handle direct code change (still available for users who know codes)
  const handleCodeChange = (budgetId: string, code: string) => {
    const nahbCode = nahbCodes.find(n => n.code === code)
    setEditableBudgets(prev => prev.map(b => 
      b.id === budgetId 
        ? { 
            ...b, 
            cost_code: code || null,
            nahb_category: nahbCode?.category || null,
            nahb_subcategory: nahbCode?.subcategory || null,
            category: nahbCode?.category || b.category,
            isDirty: true 
          }
        : b
    ))
  }

  const handleAddRow = () => {
    const newBudget: EditableBudget = {
      id: `new-${Date.now()}`,
      project_id: projectId,
      cost_code: '',
      category: '',
      nahb_category: null,
      nahb_subcategory: null,
      builder_category_raw: '',
      original_amount: 0,
      current_amount: 0,
      spent_amount: 0,
      remaining_amount: 0,
      description: null,
      is_change_order: false,
      ai_confidence: null,
      sort_order: editableBudgets.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isNew: true,
      isDirty: true,
    }
    setEditableBudgets(prev => [...prev, newBudget])
  }

  const handleDeleteRow = async (budgetId: string) => {
    const budget = editableBudgets.find(b => b.id === budgetId)
    if (!budget) return

    // If it's a new row that hasn't been saved, just remove from state
    if (budget.isNew) {
      setEditableBudgets(prev => prev.filter(b => b.id !== budgetId))
      return
    }

    // Confirm deletion for existing rows with amounts
    if (budget.current_amount > 0) {
      if (!confirm(`Delete "${budget.category || budget.builder_category_raw}" ($${budget.current_amount.toLocaleString()})?`)) {
        return
      }
    }

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)

      if (error) throw error

      toast({
        type: 'success',
        title: 'Row Deleted',
        message: 'Budget line item removed'
      })

      setEditableBudgets(prev => prev.filter(b => b.id !== budgetId))
      onBudgetsChange?.()
    } catch (err) {
      console.error('Delete error:', err)
      toast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete budget line'
      })
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    try {
      const dirtyBudgets = editableBudgets.filter(b => b.isDirty)
      
      for (const budget of dirtyBudgets) {
        const budgetData = {
          project_id: projectId,
          cost_code: budget.cost_code || null,
          category: budget.category || budget.nahb_category || 'Uncategorized',
          nahb_category: budget.nahb_category,
          nahb_subcategory: budget.nahb_subcategory,
          builder_category_raw: budget.builder_category_raw || null,
          original_amount: budget.original_amount || budget.current_amount,
          current_amount: budget.current_amount,
          spent_amount: budget.spent_amount || 0,
          sort_order: budget.sort_order,
        }

        if (budget.isNew) {
          // Insert new row
          const { error } = await supabase
            .from('budgets')
            .insert(budgetData)

          if (error) throw error
        } else {
          // Update existing row
          const { error } = await supabase
            .from('budgets')
            .update(budgetData)
            .eq('id', budget.id)

          if (error) throw error
        }
      }

      toast({
        type: 'success',
        title: 'Budget Saved',
        message: `Saved ${dirtyBudgets.length} changes`
      })

      onBudgetsChange?.()
    } catch (err) {
      console.error('Save error:', err)
      toast({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save budget changes'
      })
    } finally {
      setSaving(false)
    }
  }

  const hasDirtyChanges = editableBudgets.some(b => b.isDirty)

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'var(--text-muted)'
    if (confidence >= 0.8) return 'var(--success)'
    if (confidence >= 0.5) return 'var(--warning)'
    return 'var(--error)'
  }

  return (
    <div className="card-ios p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Budget</h3>
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <button 
                onClick={handleAddRow}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Row
              </button>
              <button 
                onClick={onUploadClick}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </button>
              {hasDirtyChanges && (
                <button 
                  onClick={handleSaveChanges}
                  className="btn-primary text-sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {editableBudgets.length === 0 ? (
        <div className="text-center py-12">
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'var(--bg-hover)' }}
          >
            <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>No budget items yet</p>
          {isEditing && (
            <div className="flex justify-center gap-2">
              <button onClick={handleAddRow} className="btn-secondary">
                Add Manually
              </button>
              <button onClick={onUploadClick} className="btn-primary">
                Upload Budget
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0" style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                <th className="table-header w-20">Code</th>
                <th className="table-header">Category</th>
                <th className="table-header">Subcategory</th>
                <th className="table-header">Builder Category</th>
                <th className="table-header text-right w-32">Amount</th>
                {isEditing && <th className="table-header w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {editableBudgets.map((budget) => (
                <tr 
                  key={budget.id} 
                  className="table-row"
                  style={{ 
                    background: budget.isDirty ? 'rgba(99, 102, 241, 0.05)' : undefined 
                  }}
                >
                  {/* Code - Auto-filled based on Category/Subcategory */}
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {budget.ai_confidence !== null && (
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: getConfidenceColor(budget.ai_confidence) }}
                          title={`AI Confidence: ${Math.round((budget.ai_confidence || 0) * 100)}%`}
                        />
                      )}
                      <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        {budget.cost_code || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Category - Editable dropdown */}
                  <td className="table-cell">
                    {isEditing ? (
                      <select
                        value={budget.nahb_category || ''}
                        onChange={(e) => handleCategoryChange(budget.id, e.target.value)}
                        className="input w-full text-sm"
                      >
                        <option value="">Select category...</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {budget.nahb_category || budget.category || '—'}
                      </span>
                    )}
                  </td>

                  {/* Subcategory - Filtered by Category, editable dropdown */}
                  <td className="table-cell">
                    {isEditing ? (
                      <select
                        ref={(el) => { subcategoryRefs.current[budget.id] = el }}
                        value={budget.nahb_subcategory || ''}
                        onChange={(e) => handleSubcategoryChange(budget.id, e.target.value)}
                        className="input w-full text-sm"
                        disabled={!budget.nahb_category}
                        style={{ opacity: budget.nahb_category ? 1 : 0.5 }}
                      >
                        <option value="">
                          {budget.nahb_category ? 'Select subcategory...' : 'Select category first'}
                        </option>
                        {getSubcategoriesForCategory(budget.nahb_category).map(sub => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {budget.nahb_subcategory || '—'}
                      </span>
                    )}
                  </td>

                  {/* Builder Category - Editable text */}
                  <td className="table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={budget.builder_category_raw || ''}
                        onChange={(e) => handleBuilderCategoryChange(budget.id, e.target.value)}
                        className="input w-full text-sm"
                        placeholder="Builder category..."
                      />
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {budget.builder_category_raw || '—'}
                      </span>
                    )}
                  </td>

                  {/* Amount - Editable */}
                  <td className="table-cell text-right">
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                        <input
                          type="number"
                          value={budget.current_amount || ''}
                          onChange={(e) => handleAmountChange(budget.id, e.target.value)}
                          className="input w-full text-right text-sm pl-6"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <span className="font-medium">
                        {formatCurrency(budget.current_amount)}
                      </span>
                    )}
                  </td>

                  {/* Delete button */}
                  {isEditing && (
                    <td className="table-cell">
                      <button
                        onClick={() => handleDeleteRow(budget.id)}
                        className="p-1.5 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--error)' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <td className="table-cell font-semibold" colSpan={isEditing ? 4 : 4}>
                  Total
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalBudget)}
                </td>
                {isEditing && <td className="table-cell"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
