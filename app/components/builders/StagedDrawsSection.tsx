'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import type { Builder, DrawRequest, Project } from '@/types/database'

type StagedDraw = DrawRequest & {
  project?: Project | null
}

type StagedDrawsSectionProps = {
  builder: Builder
  stagedDraws: StagedDraw[]
  onRefresh: () => void
}

export function StagedDrawsSection({ builder, stagedDraws, onRefresh }: StagedDrawsSectionProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const canProcess = useHasPermission('processor')

  const totalAmount = stagedDraws.reduce((sum, draw) => sum + draw.total_amount, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const maskAccountNumber = (num: string | null): string => {
    if (!num) return '****'
    return '****' + num.slice(-4)
  }

  const handleUnstage = async (drawId: string) => {
    if (!confirm('Remove this draw from staging? It will go back to review.')) return

    try {
      const { error } = await supabase
        .from('draw_requests')
        .update({ status: 'review' })
        .eq('id', drawId)

      if (error) throw error

      await supabase.from('audit_events').insert({
        entity_type: 'draw_request',
        entity_id: drawId,
        action: 'unstaged',
        actor: 'user',
        old_data: { status: 'staged' },
        new_data: { status: 'review' }
      })

      onRefresh()
    } catch (err: any) {
      setError(err.message || 'Failed to unstage draw')
    }
  }

  const handleSubmitForFunding = async () => {
    if (stagedDraws.length === 0) return

    if (!confirm(`Submit ${stagedDraws.length} draw(s) totaling ${formatCurrency(totalAmount)} for funding?`)) return

    setIsSubmitting(true)
    setError('')

    try {
      // Use API endpoint which has proper permission checks
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

      // Navigate to staging page with batch highlighted
      if (result.batch_id) {
        router.push(`/staging?batch=${result.batch_id}`)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to submit for funding')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (stagedDraws.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
      style={{ border: '2px solid var(--success)' }}
    >
      <div className="p-4" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--success)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Staged for Funding
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {stagedDraws.length} draw{stagedDraws.length !== 1 ? 's' : ''} ready to wire
              </p>
            </div>
          </div>
          {canProcess && (
            <button
              onClick={handleSubmitForFunding}
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Submitting...
                </>
              ) : (
                <>
                  Fund All
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {stagedDraws.map((draw) => (
            <motion.div
              key={draw.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-4">
                <Link
                  href={`/draws/${draw.id}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {draw.project?.project_code || draw.project?.name || `Project ${draw.project_id?.slice(0, 8)}`}
                </Link>
                <span className="text-sm px-2 py-0.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                  Draw #{draw.draw_number}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                  {formatCurrency(draw.total_amount)}
                </span>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/draws/${draw.id}`}
                    className="p-1.5 rounded hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>
                  {canProcess && (
                    <button
                      onClick={() => handleUnstage(draw.id)}
                      className="p-1.5 rounded hover:opacity-70"
                      style={{ color: 'var(--error)' }}
                      title="Remove from staging"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Total */}
        <div className="pt-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-primary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total Wire Amount</span>
          <span className="text-xl font-bold" style={{ color: 'var(--success)' }}>{formatCurrency(totalAmount)}</span>
        </div>

        {/* Banking Info */}
        {builder.bank_name && (
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Wire To</div>
            <div className="flex items-center gap-4 mt-1">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{builder.bank_name}</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-secondary)' }}>{maskAccountNumber(builder.bank_account_number)}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
