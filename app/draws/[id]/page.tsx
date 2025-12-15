'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { validateDrawRequest } from '@/lib/validations'
import { motion, AnimatePresence } from 'framer-motion'
import type { DrawRequestWithDetails, ValidationResult, Budget, Invoice, Builder, Project, NahbCategory, NahbSubcategory } from '@/types/database'
import { DRAW_STATUS_LABELS, DRAW_FLAG_LABELS, DrawStatus, DrawLineFlag } from '@/types/database'

type LineWithBudget = {
  id: string
  draw_request_id: string
  budget_id: string | null
  amount_requested: number
  amount_approved: number | null
  notes: string | null
  matched_invoice_amount: number | null
  variance: number | null
  invoice_file_url: string | null
  invoice_file_name: string | null
  invoice_vendor_name: string | null
  invoice_number: string | null
  confidence_score: number | null
  flags: string | null
  budget?: Budget
}

type ProjectWithBuilder = Project & {
  builder?: Builder | null
}

export default function DrawDetailPage() {
  const params = useParams()
  const router = useRouter()
  const drawId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [draw, setDraw] = useState<DrawRequestWithDetails | null>(null)
  const [project, setProject] = useState<ProjectWithBuilder | null>(null)
  const [lines, setLines] = useState<LineWithBudget[]>([])
  const [allBudgets, setAllBudgets] = useState<Budget[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Invoice upload state
  const [newInvoiceFiles, setNewInvoiceFiles] = useState<File[]>([])
  const [isUploadingInvoices, setIsUploadingInvoices] = useState(false)
  const [isRerunningMatching, setIsRerunningMatching] = useState(false)
  
  // Invoice viewer
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  
  // Editing
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Budget selection for unmatched lines - cascading dropdowns
  const [selectingBudgetLineId, setSelectingBudgetLineId] = useState<string | null>(null)
  const [nahbCategories, setNahbCategories] = useState<NahbCategory[]>([])
  const [nahbSubcategories, setNahbSubcategories] = useState<NahbSubcategory[]>([])
  const [selectedCategoryPerLine, setSelectedCategoryPerLine] = useState<Record<string, string>>({})
  
  // Actions
  const [isStaging, setIsStaging] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    loadDrawRequest()
  }, [drawId])

  async function loadDrawRequest() {
    try {
      // Fetch draw request with project and builder
      const { data: drawData, error: drawError } = await supabase
        .from('draw_requests')
        .select(`
          *,
          projects (
            *,
            builder:builders(*)
          )
        `)
        .eq('id', drawId)
        .single()

      if (drawError) throw drawError

      // Fetch lines with budgets
      const { data: linesData } = await supabase
        .from('draw_request_lines')
        .select(`
          *,
          budgets (*)
        `)
        .eq('draw_request_id', drawId)
        .order('created_at', { ascending: true })

      // Fetch all budgets for this project (for unmatched line dropdown)
      if (drawData?.project_id) {
        const { data: budgetsData } = await supabase
          .from('budgets')
          .select('*')
          .eq('project_id', drawData.project_id)
          .order('sort_order', { ascending: true })
        
        setAllBudgets(budgetsData || [])
      }

      // Fetch NAHB categories and subcategories for cascading dropdowns
      const { data: catData } = await supabase
        .from('nahb_categories')
        .select('*')
        .order('sort_order', { ascending: true })
      
      setNahbCategories((catData as NahbCategory[]) || [])

      const { data: subData } = await supabase
        .from('nahb_subcategories')
        .select('*')
        .order('sort_order', { ascending: true })
      
      setNahbSubcategories((subData as NahbSubcategory[]) || [])

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('draw_request_id', drawId)

      // Fetch documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('draw_request_id', drawId)

      const projectData = (drawData as any).projects as ProjectWithBuilder
      setProject(projectData)
      
      setDraw({
        ...drawData,
        project: projectData,
        invoices: invoicesData || [],
        documents: docsData || [],
      })

      setLines(
        (linesData || []).map((line: any) => ({
          ...line,
          budget: line.budgets,
        }))
      )
      
      setInvoices(invoicesData || [])

      // Run validation
      const validationResult = await validateDrawRequest(drawId)
      setValidation(validationResult)
    } catch (error) {
      console.error('Error loading draw request:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'var(--text-muted)',
      processing: 'var(--warning)',
      review: 'var(--accent)',
      staged: 'var(--success)',
      pending_wire: 'var(--warning)',
      funded: 'var(--success)',
      rejected: 'var(--error)',
    }
    return colors[status] || 'var(--text-muted)'
  }

  const parseFlags = (flagsStr: string | null): DrawLineFlag[] => {
    if (!flagsStr) return []
    try {
      const parsed = JSON.parse(flagsStr)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const getFlagCount = (): number => {
    return lines.reduce((count, line) => count + parseFlags(line.flags).length, 0)
  }

  // Separate matched and unmatched lines
  const unmatchedLines = lines.filter(l => !l.budget_id)
  const matchedLines = lines.filter(l => l.budget_id)

  // Get budgets that are already assigned to matched lines (to filter them out)
  const assignedBudgetIds = new Set(matchedLines.map(l => l.budget_id).filter(Boolean))

  // Get available NAHB categories that have at least one unassigned budget
  const getAvailableCategories = () => {
    // Get budgets that are not already assigned
    const availableBudgets = allBudgets.filter(b => !assignedBudgetIds.has(b.id))
    
    // Get unique NAHB categories from available budgets
    const availableCategoryNames = new Set(
      availableBudgets.map(b => b.nahb_category).filter(Boolean)
    )
    
    return nahbCategories.filter(c => availableCategoryNames.has(c.name))
  }

  // Get available budgets for a selected category (filtered by category AND not already assigned)
  const getAvailableBudgetsForCategory = (categoryName: string | null) => {
    if (!categoryName) return []
    
    return allBudgets.filter(b => 
      b.nahb_category === categoryName && 
      !assignedBudgetIds.has(b.id)
    )
  }

  // Handle category selection for an unmatched line
  const handleCategorySelect = (lineId: string, categoryId: string) => {
    const category = nahbCategories.find(c => c.id === categoryId)
    setSelectedCategoryPerLine(prev => ({
      ...prev,
      [lineId]: categoryId
    }))
  }

  // Edit line amount
  const startEditing = (line: LineWithBudget) => {
    setEditingLineId(line.id)
    setEditAmount(line.amount_requested.toString())
  }

  const cancelEditing = () => {
    setEditingLineId(null)
    setEditAmount('')
  }

  const saveLineAmount = async (lineId: string) => {
    const newAmount = parseFloat(editAmount)
    if (isNaN(newAmount) || newAmount < 0) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('draw_request_lines')
        .update({ amount_requested: newAmount })
        .eq('id', lineId)

      if (error) throw error

      // Update total
      const newTotal = lines.reduce((sum, l) => 
        sum + (l.id === lineId ? newAmount : l.amount_requested), 0
      )

      await supabase
        .from('draw_requests')
        .update({ total_amount: newTotal })
        .eq('id', drawId)

      await loadDrawRequest()
      setEditingLineId(null)
    } catch (err) {
      console.error('Error saving line:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Assign budget to unmatched line
  const assignBudgetToLine = async (lineId: string, budgetId: string) => {
    setIsSaving(true)
    try {
      // Get the budget to check for over_budget
      const budget = allBudgets.find(b => b.id === budgetId)
      const line = lines.find(l => l.id === lineId)
      
      // Update flags - remove NO_BUDGET_MATCH, potentially add OVER_BUDGET
      let newFlags: string[] = []
      if (budget && line && line.amount_requested > (budget.remaining_amount || 0)) {
        newFlags.push('OVER_BUDGET')
      }
      
      const { error } = await supabase
        .from('draw_request_lines')
        .update({ 
          budget_id: budgetId,
          flags: newFlags.length > 0 ? JSON.stringify(newFlags) : null,
          notes: null // Clear the "Original category" note
        })
        .eq('id', lineId)

      if (error) throw error

      await loadDrawRequest()
      setSelectingBudgetLineId(null)
    } catch (err) {
      console.error('Error assigning budget:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle invoice file selection
  const handleInvoiceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Limit: max 10 files, 10MB each
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024).slice(0, 10 - newInvoiceFiles.length)
    setNewInvoiceFiles(prev => [...prev, ...validFiles].slice(0, 10))
    e.target.value = '' // Reset input
  }

  // Upload new invoices
  const uploadNewInvoices = async () => {
    if (newInvoiceFiles.length === 0) return
    
    setIsUploadingInvoices(true)
    try {
      for (const invoiceFile of newInvoiceFiles) {
        const filePath = `invoices/${draw?.project_id}/${drawId}/${crypto.randomUUID()}-${invoiceFile.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, invoiceFile)
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath)
          
          // Create invoice record
          await supabase.from('invoices').insert({
            project_id: draw?.project_id,
            draw_request_id: drawId,
            vendor_name: 'Pending Review',
            amount: 0,
            file_path: filePath,
            file_url: urlData.publicUrl,
            status: 'pending'
          })
        }
      }
      
      setNewInvoiceFiles([])
      await loadDrawRequest()
    } catch (err) {
      console.error('Error uploading invoices:', err)
      setActionError('Failed to upload invoices')
    } finally {
      setIsUploadingInvoices(false)
    }
  }

  // Re-run N8N invoice matching
  const rerunInvoiceMatching = async () => {
    if (invoices.length === 0 && newInvoiceFiles.length === 0) return
    
    setIsRerunningMatching(true)
    setActionError('')
    
    try {
      // Upload any new invoices first
      if (newInvoiceFiles.length > 0) {
        await uploadNewInvoices()
      }
      
      // Build enriched line data for N8N
      const enrichedLines = lines.map(line => {
        const budget = line.budget
        return {
          lineId: line.id,
          builderCategory: budget?.builder_category_raw || budget?.category || 'Unknown',
          nahbCategory: budget?.nahb_category || null,
          nahbSubcategory: budget?.nahb_subcategory || null,
          costCode: budget?.cost_code || null,
          budgetAmount: budget?.current_amount || 0,
          remainingAmount: budget?.remaining_amount || 0,
          amountRequested: line.amount_requested
        }
      })
      
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_DRAW_WEBHOOK
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drawRequestId: drawId,
            projectId: draw?.project_id,
            lines: enrichedLines,
            invoiceCount: invoices.length,
            rerunMatching: true
          })
        })
      }
      
      // Wait a bit then reload to see results
      setTimeout(() => loadDrawRequest(), 2000)
    } catch (err) {
      console.error('Error re-running matching:', err)
      setActionError('Failed to re-run invoice matching')
    } finally {
      setIsRerunningMatching(false)
    }
  }

  // Stage for funding
  const handleStageForFunding = async () => {
    setIsStaging(true)
    setActionError('')

    try {
      const { error } = await supabase
        .from('draw_requests')
        .update({ status: 'staged' })
        .eq('id', drawId)

      if (error) throw error

      // Log audit event
      await supabase.from('audit_events').insert({
        entity_type: 'draw_request',
        entity_id: drawId,
        action: 'staged',
        actor: 'user',
        old_data: { status: draw?.status },
        new_data: { status: 'staged' }
      })

      await loadDrawRequest()
    } catch (err: any) {
      setActionError(err.message || 'Failed to stage draw')
    } finally {
      setIsStaging(false)
    }
  }

  // Reject draw
  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this draw request?')) return

    try {
      const { error } = await supabase
        .from('draw_requests')
        .update({ status: 'rejected' })
        .eq('id', drawId)

      if (error) throw error

      await supabase.from('audit_events').insert({
        entity_type: 'draw_request',
        entity_id: drawId,
        action: 'rejected',
        actor: 'user',
        old_data: { status: draw?.status },
        new_data: { status: 'rejected' }
      })

      router.push('/staging')
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject draw')
    }
  }

  // Get invoices linked to a line
  const getLineInvoices = (lineId: string): Invoice[] => {
    return invoices.filter(inv => inv.draw_request_line_id === lineId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  if (!draw) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Draw Request Not Found</h2>
        <p style={{ color: 'var(--text-muted)' }} className="mt-2">The requested draw could not be found.</p>
        <a href="/staging" className="btn-primary inline-block mt-4">
          Back to Dashboard
        </a>
      </div>
    )
  }

  const totalRequested = lines.reduce((sum, l) => sum + l.amount_requested, 0)
  const flagCount = getFlagCount()
  const canStage = draw.status === 'review' && unmatchedLines.length === 0
  const isEditable = draw.status === 'review' || draw.status === 'draft'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <a href="/staging" className="text-sm mb-2 inline-flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            Draw #{draw.draw_number} - {project?.project_code || project?.name}
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ 
                background: `${getStatusColor(draw.status || 'draft')}20`,
                color: getStatusColor(draw.status || 'draft')
              }}
            >
              {DRAW_STATUS_LABELS[(draw.status as DrawStatus) || 'draft']}
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="mt-1">
            {project?.builder?.company_name || 'No Builder'} • {draw.request_date ? new Date(draw.request_date).toLocaleDateString() : 'No date'}
          </p>
        </div>
        
        {(flagCount > 0 || unmatchedLines.length > 0) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium" style={{ color: 'var(--warning)' }}>
              {unmatchedLines.length > 0 
                ? `${unmatchedLines.length} unmatched categor${unmatchedLines.length !== 1 ? 'ies' : 'y'}`
                : `${flagCount} item${flagCount !== 1 ? 's' : ''} need attention`}
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Requested</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalRequested)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Line Items</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{lines.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Matched</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{matchedLines.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Invoices</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{invoices.length}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Items Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Unmatched Lines Warning Section */}
          {unmatchedLines.length > 0 && (
            <div className="card overflow-hidden" style={{ borderColor: 'var(--warning)', borderWidth: '2px' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-primary)', background: 'rgba(245, 158, 11, 0.1)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-semibold" style={{ color: 'var(--warning)' }}>
                  Unmatched Categories ({unmatchedLines.length})
                </h3>
                <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                  Select a budget category for each
                </span>
              </div>
              
              <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                {unmatchedLines.map((line) => {
                  const originalCategory = line.notes?.replace('Original category: ', '').replace(/^Fuzzy matched \(\d+%\): /, '') || 'Unknown Category'
                  const selectedCatId = selectedCategoryPerLine[line.id] || ''
                  const selectedCategory = nahbCategories.find(c => c.id === selectedCatId)
                  const availableBudgets = getAvailableBudgetsForCategory(selectedCategory?.name || null)
                  
                  return (
                    <div key={line.id} className="p-4">
                      {/* Original category and amount */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Original:</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            "{originalCategory}"
                          </p>
                        </div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(line.amount_requested)}
                        </p>
                      </div>
                      
                      {/* Cascading dropdowns */}
                      <div className="flex items-center gap-2">
                        {/* Category dropdown */}
                        <select
                          value={selectedCatId}
                          onChange={(e) => handleCategorySelect(line.id, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm"
                          style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            border: `1px solid ${!selectedCatId ? 'var(--warning)' : 'var(--border)'}`
                          }}
                          disabled={isSaving}
                        >
                          <option value="">Category...</option>
                          {getAvailableCategories().map(c => (
                            <option key={c.id} value={c.id}>
                              {c.code} – {c.name}
                            </option>
                          ))}
                        </select>
                        
                        {/* Budget/Subcategory dropdown - only enabled when category selected */}
                        <select
                          value=""
                          onChange={(e) => e.target.value && assignBudgetToLine(line.id, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm"
                          style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            border: `1px solid ${selectedCatId ? 'var(--warning)' : 'var(--border)'}`
                          }}
                          disabled={isSaving || !selectedCatId}
                        >
                          <option value="">
                            {!selectedCatId ? 'Select category first...' : `Budget (${availableBudgets.length} available)...`}
                          </option>
                          {availableBudgets.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.builder_category_raw || b.nahb_subcategory || b.category} – {formatCurrency(b.remaining_amount || 0)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Matched Lines Table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Draw Line Items</h3>
              {isEditable && (
                <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  Click amount to edit
                </span>
              )}
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium border-b" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
              <div className="col-span-3">Builder Category</div>
              <div className="col-span-2 text-right">Budget</div>
              <div className="col-span-2 text-right">Remaining</div>
              <div className="col-span-2 text-right">Draw Request</div>
              <div className="col-span-1 text-center">Flags</div>
              <div className="col-span-2 text-center">Invoices</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
              {matchedLines.map((line) => {
                const lineFlags = parseFlags(line.flags)
                const lineInvoices = getLineInvoices(line.id)
                const isEditing = editingLineId === line.id
                const isOverBudget = lineFlags.includes('OVER_BUDGET' as DrawLineFlag)
                
                return (
                  <div key={line.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[var(--bg-hover)] transition-colors">
                    {/* Category */}
                    <div className="col-span-3">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {line.budget?.builder_category_raw || line.budget?.category || 'Unknown'}
                      </p>
                      {line.budget?.nahb_category && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {line.budget.cost_code}
                        </p>
                      )}
                    </div>
                    
                    {/* Budget Amount */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(line.budget?.current_amount || 0)}
                      </span>
                    </div>
                    
                    {/* Remaining */}
                    <div className="col-span-2 text-right">
                      <span 
                        className="text-sm font-medium" 
                        style={{ 
                          color: (line.budget?.remaining_amount || 0) < line.amount_requested 
                            ? 'var(--error)' 
                            : 'var(--text-secondary)' 
                        }}
                      >
                        {formatCurrency(line.budget?.remaining_amount || 0)}
                      </span>
                    </div>
                    
                    {/* Draw Request Amount */}
                    <div className="col-span-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-1 rounded text-right text-sm"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)' }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveLineAmount(line.id)}
                            disabled={isSaving}
                            className="p-1 rounded hover:bg-green-100"
                            style={{ color: 'var(--success)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 rounded hover:bg-red-100"
                            style={{ color: 'var(--error)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => isEditable && startEditing(line)}
                          className={`text-sm font-bold ${isEditable ? 'hover:opacity-70 cursor-pointer' : ''}`}
                          style={{ color: isOverBudget ? 'var(--error)' : 'var(--accent)' }}
                          disabled={!isEditable}
                        >
                          {formatCurrency(line.amount_requested)}
                        </button>
                      )}
                    </div>
                    
                    {/* Flags */}
                    <div className="col-span-1 flex justify-center">
                      {lineFlags.length > 0 ? (
                        <div className="relative group">
                          <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          >
                            {lineFlags.map(f => DRAW_FLAG_LABELS[f] || f).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <svg className="w-5 h-5" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Invoices */}
                    <div className="col-span-2 flex justify-center gap-1">
                      {lineInvoices.length > 0 ? (
                        lineInvoices.slice(0, 2).map(inv => (
                          <button
                            key={inv.id}
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2 py-1 rounded text-xs hover:opacity-80"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                          >
                            {inv.vendor_name?.slice(0, 10)}...
                          </button>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                      {lineInvoices.length > 2 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{lineInvoices.length - 2}</span>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {matchedLines.length === 0 && (
                <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  {lines.length === 0 
                    ? 'No line items found for this draw request'
                    : 'All line items need budget category assignment'}
                </div>
              )}
            </div>
            
            {/* Total */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-t items-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
              <div className="col-span-7 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>Total</div>
              <div className="col-span-2 text-right">
                <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(totalRequested)}</span>
              </div>
              <div className="col-span-3"></div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Actions</h3>
            
            {actionError && (
              <p className="text-sm mb-4 p-2 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                {actionError}
              </p>
            )}
            
            <div className="space-y-3">
              {canStage && (
                <button
                  onClick={handleStageForFunding}
                  disabled={isStaging}
                  className="btn-primary w-full"
                >
                  {isStaging ? 'Staging...' : 'Stage for Funding →'}
                </button>
              )}
              
              {draw.status === 'review' && unmatchedLines.length > 0 && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--warning)' }}>
                  Resolve unmatched categories to stage
                </p>
              )}
              
              {draw.status === 'staged' && (
                <div className="text-center py-4">
                  <svg className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium" style={{ color: 'var(--success)' }}>Staged for Funding</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Go to builder page to fund
                  </p>
                  {project?.builder_id && (
                    <a href={`/builders/${project.builder_id}`} className="btn-secondary mt-3 inline-block text-sm">
                      View Builder →
                    </a>
                  )}
                </div>
              )}
              
              {draw.status === 'funded' && (
                <div className="text-center py-4">
                  <svg className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium" style={{ color: 'var(--success)' }}>Funded</p>
                  {draw.funded_at && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(draw.funded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              
              {isEditable && (
                <button
                  onClick={handleReject}
                  className="w-full py-2 px-4 rounded-lg border text-sm font-medium hover:opacity-80"
                  style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                >
                  Reject Draw
                </button>
              )}
            </div>
          </div>

          {/* Invoice Management */}
          {isEditable && (
            <div className="card p-4">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Invoices</h3>
              
              <div className="space-y-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={handleInvoiceFileSelect}
                />
                
                {/* Attach Invoices Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 rounded-lg border text-sm font-medium hover:opacity-80 flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attach Invoices
                </button>
                
                {/* New files pending upload */}
                {newInvoiceFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {newInvoiceFiles.length} file(s) ready to upload
                    </p>
                    <button
                      onClick={uploadNewInvoices}
                      disabled={isUploadingInvoices}
                      className="w-full py-2 px-4 rounded-lg text-sm font-medium"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      {isUploadingInvoices ? 'Uploading...' : 'Upload Files'}
                    </button>
                  </div>
                )}
                
                {/* Re-run Matching Button */}
                <button
                  onClick={rerunInvoiceMatching}
                  disabled={isRerunningMatching || invoices.length === 0}
                  className="w-full py-2 px-4 rounded-lg border text-sm font-medium hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {isRerunningMatching ? 'Processing...' : 'Re-run Invoice Matching'}
                </button>
                
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {invoices.length} invoice(s) attached
                </p>
              </div>
            </div>
          )}

          {/* Project Info */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Project Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt style={{ color: 'var(--text-muted)' }}>Project</dt>
                <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{project?.project_code || project?.name}</dd>
              </div>
              {project?.builder && (
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>Builder</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>
                    <a href={`/builders/${project.builder.id}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                      {project.builder.company_name}
                    </a>
                  </dd>
                </div>
              )}
              {project?.loan_amount && (
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>Loan Amount</dt>
                  <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(project.loan_amount)}</dd>
                </div>
              )}
              {project?.address && (
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>Address</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>{project.address}</dd>
                </div>
              )}
            </dl>
            <a
              href={`/projects/${draw.project_id}`}
              className="text-sm font-medium mt-4 inline-block hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              View Full Project →
            </a>
          </div>

          {/* All Invoices */}
          {invoices.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>All Invoices ({invoices.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {invoices.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:opacity-80 text-left"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{inv.vendor_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {inv.matched_to_category || 'Unmatched'}
                      </p>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(inv.amount)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Viewer Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedInvoice(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="card max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedInvoice.vendor_name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(selectedInvoice.amount)} • {selectedInvoice.matched_to_category || 'Unmatched'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 rounded-lg hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 h-[60vh] overflow-auto">
                {selectedInvoice.file_url ? (
                  selectedInvoice.file_url.endsWith('.pdf') ? (
                    <iframe
                      src={selectedInvoice.file_url}
                      className="w-full h-full rounded-lg"
                      title="Invoice PDF"
                    />
                  ) : (
                    <img
                      src={selectedInvoice.file_url}
                      alt="Invoice"
                      className="max-w-full h-auto mx-auto rounded-lg"
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                    <p>No file available</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t flex justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {selectedInvoice.invoice_number && <span>Invoice #{selectedInvoice.invoice_number} • </span>}
                  {selectedInvoice.invoice_date && <span>{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span>}
                </div>
                {selectedInvoice.file_url && (
                  <a
                    href={selectedInvoice.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    Open in New Tab
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
