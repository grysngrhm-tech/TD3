'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { validateDrawRequest, canApprove } from '@/lib/validations'
import { logStatusChange } from '@/lib/audit'
import { ValidationAlerts } from '@/components/ValidationAlerts'
import { useNavigation } from '@/app/context/NavigationContext'
import type { DrawRequest, ValidationResult, Project } from '@/types/database'

type DrawWithProject = DrawRequest & { project?: Project }

export default function ApproveDrawPage() {
  const params = useParams()
  const router = useRouter()
  const { setCurrentPageTitle } = useNavigation()
  const drawId = params.id as string

  const [draw, setDraw] = useState<DrawWithProject | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDrawRequest()
  }, [drawId])

  // Update page title when draw loads
  useEffect(() => {
    if (draw) {
      setCurrentPageTitle(`Approve Draw #${draw.draw_number}`)
    }
  }, [draw, setCurrentPageTitle])

  async function loadDrawRequest() {
    try {
      const { data, error: fetchError } = await supabase
        .from('draw_requests')
        .select(`
          *,
          projects (*)
        `)
        .eq('id', drawId)
        .single()

      if (fetchError) throw fetchError

      setDraw({
        ...data,
        project: (data as any).projects,
      })

      // Run validation
      const validationResult = await validateDrawRequest(drawId)
      setValidation(validationResult)
    } catch (error) {
      console.error('Error loading draw request:', error)
      setError('Failed to load draw request')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecision(decision: 'approve' | 'reject') {
    if (decision === 'approve' && validation && !validation.isValid) {
      setError('Cannot approve: blocking validation issues must be resolved first')
      return
    }

    setSubmitting(true)
    setError(null)

    const newStatus = decision === 'approve' ? 'approved' : 'rejected'

    try {
      // Update the draw request status
      const { error: updateError } = await supabase
        .from('draw_requests')
        .update({ status: newStatus })
        .eq('id', drawId)

      if (updateError) throw updateError

      // Create approval record
      const { error: approvalError } = await supabase
        .from('approvals')
        .insert({
          draw_request_id: drawId,
          decision: decision === 'approve' ? 'approved' : 'rejected',
          comments: comments || null,
          decided_at: new Date().toISOString(),
        })

      if (approvalError) throw approvalError

      // Log the status change
      await logStatusChange({
        entityType: 'draw_request',
        entityId: drawId,
        oldStatus: draw?.status || 'submitted',
        newStatus,
        comments: comments || undefined,
      })

      // Redirect back to draw detail
      router.push(`/draws/${drawId}`)
      router.refresh()
    } catch (err) {
      console.error('Error processing decision:', err)
      setError('Failed to process decision. Please try again.')
    } finally {
      setSubmitting(false)
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
      </div>
    )
  }

  if (draw.status !== 'submitted') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-900">Cannot Approve</h2>
          <p className="text-slate-600 mt-2">
            This draw request is currently <strong>{draw.status}</strong> and cannot be approved.
          </p>
          <a href={`/draws/${drawId}`} className="btn-primary inline-block mt-6">
            View Draw Request
          </a>
        </div>
      </div>
    )
  }

  const hasBlockers = validation && (
    validation.overages.length > 0 || 
    validation.duplicateInvoices.length > 0
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Approve Draw #{draw.draw_number}
        </h1>
        <p className="text-slate-600 mt-1">
          {draw.project?.name} • {formatCurrency(draw.total_amount)}
        </p>
      </div>

      {/* Validation Status */}
      {validation && (
        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Validation Status</h3>
          <ValidationAlerts validation={validation} />
        </div>
      )}

      {/* Decision Form */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4">Your Decision</h3>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or notes about your decision..."
              className="input min-h-[120px] resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => handleDecision('approve')}
              disabled={submitting || hasBlockers}
              className={`flex-1 flex items-center justify-center gap-2 font-medium px-6 py-4 rounded-lg transition-colors ${
                hasBlockers
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {submitting ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Approve Draw
            </button>
            <button
              onClick={() => handleDecision('reject')}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium px-6 py-4 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject Draw
            </button>
          </div>

          {hasBlockers && (
            <p className="text-sm text-red-600 text-center">
              ⚠️ Cannot approve: resolve the validation issues above first
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-slate-50">
        <h4 className="font-medium text-slate-700 mb-3">Draw Summary</h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Project</dt>
            <dd className="font-medium text-slate-900">{draw.project?.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Draw Number</dt>
            <dd className="font-medium text-slate-900">#{draw.draw_number}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Request Date</dt>
            <dd className="font-medium text-slate-900">
              {new Date(draw.request_date).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Total Amount</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(draw.total_amount)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

