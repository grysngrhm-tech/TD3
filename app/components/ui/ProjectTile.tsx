'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { LifecycleStage } from '@/types/database'

type ProjectTileProps = {
  id: string
  projectCode: string
  address: string | null
  builderName: string | null
  builderId?: string | null
  subdivisionName: string | null
  totalBudget: number
  totalSpent: number
  loanAmount?: number | null
  lifecycleStage: LifecycleStage
  appraisedValue?: number | null
  payoffAmount?: number | null
  onClick: () => void
  hideBuilderLink?: boolean
}

export function ProjectTile({
  id,
  projectCode,
  address,
  builderName,
  builderId,
  subdivisionName,
  totalBudget,
  totalSpent,
  loanAmount,
  lifecycleStage,
  appraisedValue,
  payoffAmount,
  onClick,
  hideBuilderLink = false,
}: ProjectTileProps) {
  const router = useRouter()

  const handleBuilderClick = (e: React.MouseEvent) => {
    if (builderId && !hideBuilderLink) {
      e.stopPropagation()
      router.push(`/builders/${builderId}`)
    }
  }
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const ltvRatio = appraisedValue && loanAmount 
    ? (loanAmount / appraisedValue) * 100 
    : null
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '—'
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStageBadgeStyle = () => {
    switch (lifecycleStage) {
      case 'pending':
        return { background: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)' }
      case 'active':
        return { background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }
      case 'historic':
        return { background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' }
      default:
        return { background: 'var(--bg-hover)', color: 'var(--text-muted)' }
    }
  }

  const getStageLabel = () => {
    switch (lifecycleStage) {
      case 'pending':
        return 'Pending'
      case 'active':
        return 'Active'
      case 'historic':
        return 'Complete'
      default:
        return 'Unknown'
    }
  }

  const getLtvColor = (ltv: number) => {
    if (ltv <= 70) return 'var(--success)'
    if (ltv <= 80) return 'var(--warning)'
    return 'var(--error)'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="tile"
      onClick={onClick}
      style={{
        opacity: lifecycleStage === 'historic' ? 0.85 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {projectCode}
          </h3>
          {builderName && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {builderId && !hideBuilderLink ? (
                <button
                  onClick={handleBuilderClick}
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  {builderName}
                </button>
              ) : (
                builderName
              )}
            </p>
          )}
        </div>
        <span 
          className="badge text-xs px-2 py-1 rounded-full font-medium"
          style={getStageBadgeStyle()}
        >
          {getStageLabel()}
        </span>
      </div>

      {/* Address */}
      {address && (
        <p className="text-sm mb-4 truncate" style={{ color: 'var(--text-secondary)' }}>
          {address}
        </p>
      )}

      {/* Subdivision tag */}
      {subdivisionName && (
        <div className="mb-4">
          <span 
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            {subdivisionName}
          </span>
        </div>
      )}

      {/* Stage-specific content */}
      {lifecycleStage === 'pending' && (
        <div className="space-y-3">
          {/* LTV Display for Pending */}
          {ltvRatio !== null ? (
            <>
              <div className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>LTV Ratio</span>
                <span 
                  className="font-semibold text-lg" 
                  style={{ color: getLtvColor(ltvRatio) }}
                >
                  {ltvRatio.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: getLtvColor(ltvRatio) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(ltvRatio, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                {/* 80% marker */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: '80%', background: 'var(--text-muted)', opacity: 0.3 }}
                />
              </div>
            </>
          ) : (
            <div className="flex justify-between items-baseline">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loan Amount</span>
              <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(loanAmount)}
              </span>
            </div>
          )}

          {/* Budget status */}
          <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Budget</span>
            <span 
              className="font-medium"
              style={{ color: totalBudget > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {totalBudget > 0 ? formatCurrency(totalBudget) : 'Not uploaded'}
            </span>
          </div>
        </div>
      )}

      {lifecycleStage === 'active' && (
        <div className="space-y-3">
          {/* Budget Info */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Budget</span>
            <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalBudget)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentSpent, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Drawn Amount */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {percentSpent.toFixed(1)}% drawn
            </span>
            <span className="font-medium" style={{ color: 'var(--accent)' }}>
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>
      )}

      {lifecycleStage === 'historic' && (
        <div className="space-y-3">
          {/* Payoff or Total Funded */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {payoffAmount ? 'Payoff' : 'Total Funded'}
            </span>
            <span 
              className="font-semibold text-lg"
              style={{ color: payoffAmount ? 'var(--success)' : 'var(--text-primary)' }}
            >
              {formatCurrency(payoffAmount || totalSpent)}
            </span>
          </div>

          {/* Completed indicator */}
          <div className="flex items-center justify-center py-2 rounded-md" style={{ background: 'var(--bg-hover)' }}>
            <svg className="w-4 h-4 mr-2" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Loan Complete
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
