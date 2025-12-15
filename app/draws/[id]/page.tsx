'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { validateDrawRequest } from '@/lib/validations'
import { ValidationAlerts, ValidationBadge } from '@/components/ValidationAlerts'
import { AuditTimeline } from '@/components/AuditTimeline'
import { motion, AnimatePresence } from 'framer-motion'
import type { DrawRequestWithDetails, ValidationResult, Budget, Invoice, Builder, Project } from '@/types/database'
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

  const [draw, setDraw] = useState<DrawRequestWithDetails | null>(null)
  const [project, setProject] = useState<ProjectWithBuilder | null>(null)
  const [lines, setLines] = useState<LineWithBudget[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details')
  
  // Invoice viewer
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  
  // Editing
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
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

  const getConfidenceColor = (score: number | null) => {
    if (score === null) return { bg: 'var(--bg-secondary)', text: 'var(--text-muted)' }
    if (score >= 0.9) return { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)' }
    if (score >= 0.7) return { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)' }
    return { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--error)' }
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

  const hasFlags = (line: LineWithBudget): boolean => {
    return parseFlags(line.flags).length > 0
  }

  const getFlagCount = (): number => {
    return lines.reduce((count, line) => count + parseFlags(line.flags).length, 0)
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

      router.push('/draws')
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
        <a href="/draws" className="btn-primary inline-block mt-4">
          Back to Draws
        </a>
      </div>
    )
  }

  const totalRequested = lines.reduce((sum, l) => sum + l.amount_requested, 0)
  const totalInvoiced = lines.reduce((sum, l) => sum + (l.matched_invoice_amount || 0), 0)
  const flagCount = getFlagCount()
  const canStage = draw.status === 'review'
  const isEditable = draw.status === 'review' || draw.status === 'draft'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <a href="/draws" className="text-sm mb-2 inline-flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Draws
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
        
        {flagCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium" style={{ color: 'var(--warning)' }}>
              {flagCount} item{flagCount !== 1 ? 's' : ''} need attention
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Invoices Matched</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Line Items</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{lines.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Invoices Uploaded</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{invoices.length}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Draw Line Items</h3>
              {isEditable && (
                <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  Click amount to edit
                </span>
              )}
            </div>
            
            <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
              {lines.map((line) => {
                const lineFlags = parseFlags(line.flags)
                const lineInvoices = getLineInvoices(line.id)
                const isEditing = editingLineId === line.id
                
                return (
                  <div key={line.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {lineFlags.length > 0 && (
                            <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {line.budget?.category || 'Unmatched Category'}
                          </span>
                          {line.budget?.nahb_category && (
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                              {line.budget.cost_code}
                            </span>
                          )}
                        </div>
                        
                        {/* Flags */}
                        {lineFlags.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {lineFlags.map((flag, i) => (
                              <p key={i} className="text-sm flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                                <span>→</span>
                                {DRAW_FLAG_LABELS[flag] || flag}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {/* Budget remaining */}
                        {line.budget && (
                          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            Budget: {formatCurrency(line.budget.current_amount)} • Remaining: {formatCurrency(line.budget.remaining_amount || 0)}
                          </p>
                        )}
                      </div>
                      
                      {/* Amount */}
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="input w-32 text-right"
                              autoFocus
                            />
                            <button
                              onClick={() => saveLineAmount(line.id)}
                              disabled={isSaving}
                              className="p-1 rounded hover:bg-green-100"
                              style={{ color: 'var(--success)' }}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 rounded hover:bg-red-100"
                              style={{ color: 'var(--error)' }}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => isEditable && startEditing(line)}
                            className={`text-xl font-bold ${isEditable ? 'hover:opacity-70 cursor-pointer' : ''}`}
                            style={{ color: 'var(--text-primary)' }}
                            disabled={!isEditable}
                          >
                            {formatCurrency(line.amount_requested)}
                          </button>
                        )}
                        
                        {/* Confidence score */}
                        {line.confidence_score !== null && (
                          <p 
                            className="text-xs mt-1 px-2 py-0.5 rounded inline-block"
                            style={{ 
                              background: getConfidenceColor(line.confidence_score).bg,
                              color: getConfidenceColor(line.confidence_score).text
                            }}
                          >
                            {Math.round(line.confidence_score * 100)}% match
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Invoices for this line */}
                    {lineInvoices.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {lineInvoices.map(inv => (
                          <button
                            key={inv.id}
                            onClick={() => setSelectedInvoice(inv)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
                            style={{ background: 'var(--bg-secondary)' }}
                          >
                            <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span style={{ color: 'var(--text-primary)' }}>{inv.vendor_name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(inv.amount)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {lineFlags.includes('NO_INVOICE' as DrawLineFlag) && lineInvoices.length === 0 && (
                      <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        No invoices matched to this line
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Total */}
            <div className="px-4 py-3 border-t flex justify-between items-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
              <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(totalRequested)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
              
              {draw.status === 'staged' && (
                <div className="text-center py-4">
                  <svg className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium" style={{ color: 'var(--success)' }}>Staged for Funding</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Go to builder page to fund all staged draws
                  </p>
                  {project?.builder_id && (
                    <a href={`/builders/${project.builder_id}`} className="btn-secondary mt-3 inline-block">
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
