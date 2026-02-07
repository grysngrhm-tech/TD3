'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { Builder, DrawRequest, Project } from '@/types/custom'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import { formatCurrencyWhole as formatCurrency } from '@/lib/formatters'

type DrawWithProject = DrawRequest & {
  project?: Project | null
}

type FundAllModalProps = {
  isOpen: boolean
  onClose: () => void
  builder: Builder
  stagedDraws: DrawWithProject[]
  totalAmount: number
  onSuccess: () => void
}

/**
 * FundAllModal - Modal for submitting staged draws to pending wire
 * 
 * This creates a wire batch with status 'pending' and moves draws to 'pending_wire'.
 * The bookkeeper will then confirm the wire from the pending wire section.
 * 
 * Features:
 * - Shows builder info and list of staged draws
 * - Shows builder banking details (partially masked)
 * - Creates wire batch in pending status
 * - Redirects to staging page with batch highlighted
 */
export function FundAllModal({
  isOpen,
  onClose,
  builder,
  stagedDraws,
  totalAmount,
  onSuccess
}: FundAllModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Permission check (defense in depth - button should already be hidden)
  const canProcess = useHasPermission('processor')

  const maskAccountNumber = (num: string | null): string => {
    if (!num) return '****'
    return '****' + num.slice(-4)
  }

  const handleSubmitForWire = async () => {
    if (stagedDraws.length === 0) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/wire-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_for_wire',
          builder_id: builder.id,
          draw_ids: stagedDraws.map(d => d.id)
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit for funding')
      }

      // Success - close modal, trigger refresh, and navigate to staging with batch highlighted
      onClose()
      onSuccess()
      
      // Navigate to staging page with the new batch highlighted
      if (result.batch_id) {
        router.push(`/staging?status=pending_wire&batch=${result.batch_id}`)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to submit for funding')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError('')
      onClose()
    }
  }

  // Don't render if not open or user lacks permission
  if (!isOpen || !canProcess) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="card max-w-lg w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-6 py-4 border-b flex items-center justify-between border-border-subtle bg-background-secondary"
          >
            <div>
              <h2 className="font-bold text-lg text-text-primary">
                Submit for Wire Funding
              </h2>
              <p className="text-sm text-text-muted">
                {builder.company_name}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 rounded-lg hover:opacity-70 transition-opacity text-text-muted"
              
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* Error message */}
            {error && (
              <div 
                className="p-3 rounded-lg text-sm"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
              >
                {error}
              </div>
            )}

            {/* Summary */}
            <div 
              className="p-4 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-text-muted">Draws to submit</span>
                <span className="font-semibold text-text-primary">
                  {stagedDraws.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Total Amount</span>
                <span 
                  className="font-bold text-xl"
                  style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}
                >
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Banking Details */}
            <div 
              className="p-4 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-medium mb-3 text-text-secondary">
                Wire Destination
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Bank</dt>
                  <dd className="font-medium text-text-primary">
                    {builder.bank_name || 'Not provided'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Routing</dt>
                  <dd className="font-mono text-text-primary">
                    {builder.bank_routing_number || 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Account</dt>
                  <dd className="font-mono text-text-primary">
                    {maskAccountNumber(builder.bank_account_number)}
                  </dd>
                </div>
                {builder.bank_account_name && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Account Name</dt>
                    <dd className="text-text-primary">
                      {builder.bank_account_name}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Draw list */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-text-secondary">
                Staged Draws
              </h3>
              <div 
                className="rounded-lg overflow-hidden divide-y bg-background-secondary divide-border-subtle"
              >
                {stagedDraws.map(draw => (
                  <div 
                    key={draw.id}
                    className="px-3 py-2 flex justify-between items-center"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div>
                      <span className="font-medium text-sm text-text-primary">
                        {draw.project?.project_code || draw.project?.name}
                      </span>
                      <span className="mx-2 text-sm text-text-muted">—</span>
                      <span className="text-sm text-text-muted">
                        Draw #{draw.draw_number}
                      </span>
                    </div>
                    <span 
                      className="font-medium text-sm"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                    >
                      {formatCurrency(draw.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info message */}
            <div 
              className="p-3 rounded-lg text-sm flex items-start gap-2"
              style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}
            >
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                This will send the funding report to the bookkeeper. The draws will move to 
                &ldquo;Pending Wire&rdquo; status until the bookkeeper confirms the wire has been sent.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="px-6 py-4 border-t flex justify-end gap-3 border-border-subtle bg-background-secondary"
          >
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitForWire}
              disabled={isSubmitting || stagedDraws.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit for Funding
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
