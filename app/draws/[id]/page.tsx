'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { validateDrawRequest } from '@/lib/validations'
import { ValidationAlerts, ValidationBadge } from '@/components/ValidationAlerts'
import { ApprovalActions } from '@/components/ApprovalActions'
import { AuditTimeline } from '@/components/AuditTimeline'
import { DocumentUpload } from '@/components/DocumentUpload'
import type { DrawRequestWithDetails, ValidationResult, Budget } from '@/types/database'

type LineWithBudget = {
  id: string
  draw_request_id: string
  budget_id: string
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

export default function DrawDetailPage() {
  const params = useParams()
  const router = useRouter()
  const drawId = params.id as string

  const [draw, setDraw] = useState<DrawRequestWithDetails | null>(null)
  const [lines, setLines] = useState<LineWithBudget[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details')

  useEffect(() => {
    loadDrawRequest()
  }, [drawId])

  async function loadDrawRequest() {
    try {
      // Fetch draw request with project
      const { data: drawData, error: drawError } = await supabase
        .from('draw_requests')
        .select(`
          *,
          projects (*)
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

      setDraw({
        ...drawData,
        project: (drawData as any).projects,
        invoices: invoicesData || [],
        documents: docsData || [],
      })

      setLines(
        (linesData || []).map((line: any) => ({
          ...line,
          budget: line.budgets,
        }))
      )

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

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      approved: 'status-approved',
      rejected: 'status-rejected',
      paid: 'status-paid',
    }
    return classes[status] || 'status-draft'
  }

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return 'text-slate-500'
    if (variance === 0) return 'text-emerald-600'
    if (variance > 0) return 'text-amber-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (score: number | null) => {
    if (score === null) return 'bg-slate-100 text-slate-600'
    if (score >= 0.9) return 'bg-emerald-100 text-emerald-700'
    if (score >= 0.7) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!draw) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Draw Request Not Found</h2>
        <p className="text-slate-600 mt-2">The requested draw could not be found.</p>
        <a href="/draws" className="btn-primary inline-block mt-4">
          Back to Draws
        </a>
      </div>
    )
  }

  const totalRequested = lines.reduce((sum, l) => sum + l.amount_requested, 0)
  const totalApproved = lines.reduce((sum, l) => sum + (l.amount_approved || 0), 0)
  const totalInvoiced = lines.reduce((sum, l) => sum + (l.matched_invoice_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <a href="/draws" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Draws
          </a>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Draw #{draw.draw_number}
            <span className={getStatusClass(draw.status)}>{draw.status}</span>
          </h1>
          <p className="text-slate-600 mt-1">
            {draw.project?.name} • {new Date(draw.request_date).toLocaleDateString()}
          </p>
        </div>
        {validation && <ValidationBadge validation={validation} />}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Requested</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRequested)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Invoiced</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="text-2xl font-bold text-emerald-600">
            {totalApproved > 0 ? formatCurrency(totalApproved) : '—'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Variance</p>
          <p className={`text-2xl font-bold ${getVarianceColor(totalRequested - totalInvoiced)}`}>
            {formatCurrency(Math.abs(totalRequested - totalInvoiced))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {(['details', 'documents', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'details' && (
            <>
              {/* Validation Alerts */}
              {validation && (
                <ValidationAlerts validation={validation} />
              )}

              {/* Line Items Table */}
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Line Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Category</th>
                        <th className="table-header text-right">Requested</th>
                        <th className="table-header text-right">Invoiced</th>
                        <th className="table-header text-right">Variance</th>
                        <th className="table-header">Confidence</th>
                        <th className="table-header">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50">
                          <td className="table-cell">
                            <div>
                              <p className="font-medium">{line.budget?.category || 'Unknown'}</p>
                              {line.budget?.nahb_category && (
                                <p className="text-xs text-slate-500">
                                  {line.budget.cost_code} - {line.budget.nahb_category}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="table-cell text-right font-medium">
                            {formatCurrency(line.amount_requested)}
                          </td>
                          <td className="table-cell text-right">
                            {line.matched_invoice_amount 
                              ? formatCurrency(line.matched_invoice_amount)
                              : <span className="text-slate-400">—</span>
                            }
                          </td>
                          <td className={`table-cell text-right ${getVarianceColor(line.variance)}`}>
                            {line.variance !== null 
                              ? `${line.variance > 0 ? '+' : ''}${formatCurrency(line.variance)}`
                              : '—'
                            }
                          </td>
                          <td className="table-cell">
                            {line.confidence_score !== null ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(line.confidence_score)}`}>
                                {Math.round(line.confidence_score * 100)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {line.invoice_file_url ? (
                              <a
                                href={line.invoice_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 text-sm inline-flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {line.invoice_file_name || 'View'}
                              </a>
                            ) : (
                              <span className="text-slate-400 text-sm">No invoice</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold">
                        <td className="table-cell">Total</td>
                        <td className="table-cell text-right">{formatCurrency(totalRequested)}</td>
                        <td className="table-cell text-right">{formatCurrency(totalInvoiced)}</td>
                        <td className={`table-cell text-right ${getVarianceColor(totalRequested - totalInvoiced)}`}>
                          {formatCurrency(Math.abs(totalRequested - totalInvoiced))}
                        </td>
                        <td className="table-cell" colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {draw.notes && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
                  <p className="text-slate-600">{draw.notes}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Section */}
              {draw.status === 'draft' && (
                <DocumentUpload
                  drawRequestId={drawId}
                  projectId={draw.project_id}
                  onUpload={() => loadDrawRequest()}
                />
              )}

              {/* Existing Documents */}
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-4">Attached Documents</h3>
                {draw.documents && draw.documents.length > 0 ? (
                  <div className="space-y-2">
                    {draw.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-slate-900">{doc.file_name}</p>
                            <p className="text-xs text-slate-500">
                              {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB • ` : ''}
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No documents attached</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-4">Activity History</h3>
              <AuditTimeline entityType="draw_request" entityId={drawId} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Actions</h3>
            <ApprovalActions
              drawId={drawId}
              currentStatus={draw.status}
              validation={validation || undefined}
              onStatusChange={() => loadDrawRequest()}
            />
          </div>

          {/* Project Info */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Project Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Project</dt>
                <dd className="font-medium text-slate-900">{draw.project?.name}</dd>
              </div>
              {draw.project?.address && (
                <div>
                  <dt className="text-slate-500">Address</dt>
                  <dd className="text-slate-700">{draw.project.address}</dd>
                </div>
              )}
              {draw.project?.loan_amount && (
                <div>
                  <dt className="text-slate-500">Loan Amount</dt>
                  <dd className="font-medium text-slate-900">
                    {formatCurrency(draw.project.loan_amount)}
                  </dd>
                </div>
              )}
              {draw.project?.builder_name && (
                <div>
                  <dt className="text-slate-500">Builder</dt>
                  <dd className="text-slate-700">{draw.project.builder_name}</dd>
                </div>
              )}
            </dl>
            <a
              href={`/projects/${draw.project_id}`}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-4 inline-block"
            >
              View Project →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

