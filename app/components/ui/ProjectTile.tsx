'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { LifecycleStage } from '@/types/database'
import { 
  getStatusTint, 
  getLifecycleStyles, 
  getLtvColor as getLtvRiskColor,
  getIrrColor,
} from '@/lib/polymorphic'
import { useTheme } from '@/app/hooks/useTheme'

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
  totalIncome?: number | null
  irr?: number | null
  onClick: () => void
  hideBuilderLink?: boolean
}

/**
 * ProjectTile - Interactive card for displaying project summary
 * Uses polymorphic styling based on lifecycle stage
 */
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
  totalIncome,
  irr,
  onClick,
  hideBuilderLink = false,
}: ProjectTileProps) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()

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
  
  // Get polymorphic styles based on lifecycle stage
  const lifecycleStyles = getLifecycleStyles(lifecycleStage)
  const themeMode = resolvedTheme === 'light' ? 'light' : 'dark'
  const stageTint = getStatusTint(lifecycleStage, themeMode)
  
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
        return { background: 'var(--warning-muted)', color: 'var(--warning)' }
      case 'active':
        return { background: 'var(--success-muted)', color: 'var(--success)' }
      case 'historic':
        return { background: 'var(--bg-hover)', color: 'var(--text-muted)' }
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

  // LTV color coding using polymorphic utility
  const getLtvColor = (ltv: number) => getLtvRiskColor(ltv)

  return (
    <motion.div
      whileHover={{ 
        scale: 1.02, 
        y: -2,
        boxShadow: 'var(--elevation-3), 0 0 30px var(--accent-glow)',
      }}
      whileTap={{ scale: 0.98 }}
      className="p-5 cursor-pointer transition-all touch-target"
      onClick={onClick}
      style={{
        background: `linear-gradient(${stageTint}, ${stageTint}), var(--bg-card)`,
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--elevation-2)',
        opacity: lifecycleStyles.opacity,
        filter: lifecycleStyles.saturation !== '100%' 
          ? `saturate(${lifecycleStyles.saturation})` 
          : undefined,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 
            className="font-semibold" 
            style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}
          >
            {projectCode}
          </h3>
          {builderName && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {builderId && !hideBuilderLink ? (
                <motion.button
                  onClick={handleBuilderClick}
                  className="transition-colors"
                  style={{ color: 'var(--accent)' }}
                  whileHover={{ textDecoration: 'underline' }}
                >
                  {builderName}
                </motion.button>
              ) : (
                builderName
              )}
            </p>
          )}
        </div>
        <span 
          className="text-xs px-2.5 py-1 font-semibold"
          style={{
            ...getStageBadgeStyle(),
            borderRadius: 'var(--radius-full)',
          }}
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
            className="text-xs px-2.5 py-1 font-medium"
            style={{ 
              background: 'var(--bg-hover)', 
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-full)',
            }}
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
                  className="font-semibold financial-value" 
                  style={{ color: getLtvColor(ltvRatio), fontSize: 'var(--text-lg)' }}
                >
                  {ltvRatio.toFixed(1)}%
                </span>
              </div>
              <div 
                className="relative h-2 overflow-hidden" 
                style={{ 
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0"
                  style={{ 
                    background: getLtvColor(ltvRatio),
                    borderRadius: 'var(--radius-full)',
                  }}
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
              <span 
                className="font-semibold financial-value" 
                style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}
              >
                {formatCurrency(loanAmount)}
              </span>
            </div>
          )}

          {/* Budget status */}
          <div 
            className="flex justify-between items-baseline pt-2" 
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Budget</span>
            <span 
              className="font-medium financial-value"
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
            <span 
              className="font-semibold financial-value" 
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}
            >
              {formatCurrency(totalBudget)}
            </span>
          </div>

          {/* Progress Bar */}
          <div 
            className="h-2 overflow-hidden"
            style={{ 
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <motion.div
              className="h-full"
              style={{ 
                background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
                borderRadius: 'var(--radius-full)',
              }}
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
            <span className="font-medium financial-value" style={{ color: 'var(--accent)' }}>
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>
      )}

      {lifecycleStage === 'historic' && (
        <div className="space-y-3">
          {/* Total Income */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Total Income
            </span>
            <span 
              className="font-semibold financial-value"
              style={{ color: 'var(--success)', fontSize: 'var(--text-lg)' }}
            >
              {formatCurrency(totalIncome)}
            </span>
          </div>

          {/* IRR */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              IRR
            </span>
            <span 
              className="font-semibold financial-value"
              style={{ 
                color: getIrrColor(irr),
                fontSize: 'var(--text-lg)',
              }}
            >
              {irr !== null && irr !== undefined ? `${(irr * 100).toFixed(1)}%` : '—'}
            </span>
          </div>

          {/* Completed indicator */}
          <div 
            className="flex items-center justify-center py-2" 
            style={{ 
              background: 'var(--success-muted)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <svg 
              className="w-3.5 h-3.5 mr-1.5" 
              style={{ color: 'var(--success)' }} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
              Complete
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
