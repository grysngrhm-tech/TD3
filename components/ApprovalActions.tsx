'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logStatusChange } from '@/lib/audit'
import type { ValidationResult } from '@/types/custom'

interface ApprovalActionsProps {
  drawId: string
  currentStatus: string
  validation?: ValidationResult
  onStatusChange?: (newStatus: string) => void
}

export function ApprovalActions({ 
  drawId, 
  currentStatus, 
  validation,
  onStatusChange 
}: ApprovalActionsProps) {
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const canApprove = validation?.isValid !== false
  const hasBlockers = validation && (
    validation.overages.length > 0 || 
    validation.duplicateInvoices.length > 0
  )

  async function handleAction(action: 'submit' | 'approve' | 'reject') {
    if (action === 'approve' && hasBlockers) {
      setError('Cannot approve: blocking validation issues must be resolved first')
      return
    }

    setLoading(true)
    setError(null)

    const statusMap = {
      submit: 'submitted',
      approve: 'approved',
      reject: 'rejected',
    }
    const newStatus = statusMap[action]

    try {
      // Update the draw request status
      const { error: updateError } = await supabase
        .from('draw_requests')
        .update({ status: newStatus })
        .eq('id', drawId)

      if (updateError) throw updateError

      // Log the status change
      await logStatusChange({
        entityType: 'draw_request',
        entityId: drawId,
        oldStatus: currentStatus,
        newStatus,
        comments: comments || undefined,
      })

      // Create approval record if approving/rejecting
      if (action === 'approve' || action === 'reject') {
        await supabase.from('approvals').insert({
          draw_request_id: drawId,
          decision: action === 'approve' ? 'approved' : 'rejected',
          comments: comments || null,
          decided_at: new Date().toISOString(),
        })
      }

      onStatusChange?.(newStatus)
      setComments('')
      setShowComments(false)
      router.refresh()
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Don't show actions for terminal states
  if (['paid', 'rejected'].includes(currentStatus)) {
    return (
      <div className="text-center py-4 text-slate-500">
        <p className="text-sm">
          This draw request has been{' '}
          <span className={currentStatus === 'paid' ? 'text-primary-600' : 'text-red-600'}>
            {currentStatus}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Draft Actions */}
      {currentStatus === 'draft' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setShowComments(true)
              handleAction('submit')
            }}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            Submit for Approval
          </button>
          <a
            href={`/draws/${drawId}/edit`}
            className="btn-secondary w-full text-center"
          >
            Edit Draw Request
          </a>
        </div>
      )}

      {/* Submitted Actions */}
      {currentStatus === 'submitted' && (
        <div className="space-y-4">
          {/* Comments Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Comments (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add comments about your decision..."
              className="input min-h-[80px] resize-none"
            />
          </div>

          {/* Approval Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={loading || hasBlockers}
              className={`flex-1 flex items-center justify-center gap-2 font-medium px-4 py-3 rounded-lg transition-colors ${
                hasBlockers
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={hasBlockers ? 'Resolve validation issues first' : undefined}
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Approve
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium px-4 py-3 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>

          {hasBlockers && (
            <p className="text-sm text-red-600 text-center">
              ⚠️ Approval blocked: resolve validation issues above
            </p>
          )}
        </div>
      )}

      {/* Approved Actions */}
      {currentStatus === 'approved' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              setLoading(true)
              try {
                await supabase
                  .from('draw_requests')
                  .update({ status: 'paid' })
                  .eq('id', drawId)
                
                await logStatusChange({
                  entityType: 'draw_request',
                  entityId: drawId,
                  oldStatus: 'approved',
                  newStatus: 'paid',
                })
                
                onStatusChange?.('paid')
                router.refresh()
              } catch (err) {
                setError('Failed to mark as paid')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-3 rounded-lg transition-colors w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Mark as Paid
          </button>
          <p className="text-sm text-slate-500 text-center">
            This draw has been approved and is ready for payment
          </p>
        </div>
      )}
    </div>
  )
}

