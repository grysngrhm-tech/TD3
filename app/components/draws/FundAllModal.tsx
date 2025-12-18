'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Builder, DrawRequest, Project } from '@/types/database'

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
 * FundAllModal - Modal for funding all staged draws for a builder
 * 
 * Features:
 * - Shows builder info and list of staged draws
 * - Date picker for selecting funded date (defaults to today)
 * - Wire reference input (optional)
 * - Notes input (optional)
 * - Creates wire batch and marks draws as funded
 */
export function FundAllModal({
  isOpen,
  onClose,
  builder,
  stagedDraws,
  totalAmount,
  onSuccess
}: FundAllModalProps) {
  const [fundedDate, setFundedDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0]
  })
  const [wireReference, setWireReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isFunding, setIsFunding] = useState(false)
  const [error, setError] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleFund = async () => {
    if (stagedDraws.length === 0) return

    setIsFunding(true)
    setError('')

    try {
      const response = await fetch('/api/wire-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          builder_id: builder.id,
          draw_ids: stagedDraws.map(d => d.id),
          funded_at: new Date(fundedDate).toISOString(),
          wire_reference: wireReference || undefined,
          notes: notes || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fund draws')
      }

      // Success - close modal and trigger refresh
      onClose()
      onSuccess()

    } catch (err: any) {
      setError(err.message || 'Failed to fund draws')
    } finally {
      setIsFunding(false)
    }
  }

  const handleClose = () => {
    if (!isFunding) {
      setError('')
      setWireReference('')
      setNotes('')
      onClose()
    }
  }

  if (!isOpen) return null

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
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
          >
            <div>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Fund All Staged Draws
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {builder.company_name}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isFunding}
              className="p-2 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
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
                <span style={{ color: 'var(--text-muted)' }}>Draws to fund</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stagedDraws.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-muted)' }}>Total Amount</span>
                <span 
                  className="font-bold text-xl"
                  style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}
                >
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Draw list */}
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Staged Draws
              </h3>
              <div 
                className="rounded-lg overflow-hidden divide-y"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
              >
                {stagedDraws.map(draw => (
                  <div 
                    key={draw.id}
                    className="px-3 py-2 flex justify-between items-center"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div>
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {draw.project?.project_code || draw.project?.name}
                      </span>
                      <span className="mx-2 text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
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

            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Funded Date *
              </label>
              <input
                type="date"
                value={fundedDate}
                onChange={e => setFundedDate(e.target.value)}
                className="input w-full"
                disabled={isFunding}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Select the date the wire was sent (for amortization calculations)
              </p>
            </div>

            {/* Wire reference */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Wire Reference (Optional)
              </label>
              <input
                type="text"
                value={wireReference}
                onChange={e => setWireReference(e.target.value)}
                placeholder="e.g., Wire #12345"
                className="input w-full"
                disabled={isFunding}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any notes about this funding..."
                className="input w-full h-20 resize-none"
                disabled={isFunding}
              />
            </div>
          </div>

          {/* Footer */}
          <div 
            className="px-6 py-4 border-t flex justify-end gap-3"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
          >
            <button
              onClick={handleClose}
              disabled={isFunding}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleFund}
              disabled={isFunding || stagedDraws.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {isFunding ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Funding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Fund All ({stagedDraws.length} draws)
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

