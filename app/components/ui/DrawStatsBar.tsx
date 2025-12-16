'use client'

import { motion } from 'framer-motion'

type DrawStatsBarProps = {
  pendingReviewCount: number
  pendingReviewAmount: number
  stagedCount: number
  stagedAmount: number
  pendingWireCount: number
  pendingWireAmount: number
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatFullCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DrawStatsBar({
  pendingReviewCount,
  pendingReviewAmount,
  stagedCount,
  stagedAmount,
  pendingWireCount,
  pendingWireAmount,
}: DrawStatsBarProps) {
  const totalAmount = pendingReviewAmount + stagedAmount + pendingWireAmount
  const totalCount = pendingReviewCount + stagedCount + pendingWireCount
  
  // Calculate progress through the pipeline
  const fundedPercentage = totalAmount > 0 
    ? ((stagedAmount + pendingWireAmount) / totalAmount) * 100 
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-ios p-4 mb-6"
      style={{ 
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Pending Review */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Pending Review
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {pendingReviewCount}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatCurrency(pendingReviewAmount)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />

        {/* Staged */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--success)' }}
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Staged
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
              {formatCurrency(stagedAmount)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {stagedCount} draws
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />

        {/* Pending Wire */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--warning)' }}
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Pending Wire
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
              {formatCurrency(pendingWireAmount)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {pendingWireCount} batch{pendingWireCount !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />

        {/* Pipeline Total */}
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Pipeline Total
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalAmount)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {totalCount} items
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fundedPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ 
                background: `linear-gradient(90deg, var(--success) 0%, var(--warning) 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
