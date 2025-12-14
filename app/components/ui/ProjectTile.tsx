'use client'

import { motion } from 'framer-motion'

type ProjectTileProps = {
  id: string
  projectCode: string
  address: string | null
  builderName: string | null
  subdivisionName: string | null
  totalBudget: number
  totalSpent: number
  status: string
  onClick: () => void
}

export function ProjectTile({
  id,
  projectCode,
  address,
  builderName,
  subdivisionName,
  totalBudget,
  totalSpent,
  status,
  onClick,
}: ProjectTileProps) {
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  
  const formatCurrency = (amount: number) => {
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

  const getStatusBadgeClass = (s: string) => {
    const statusMap: Record<string, string> = {
      active: 'badge-active',
      completed: 'badge-completed',
      on_hold: 'badge-on_hold',
    }
    return statusMap[s] || 'badge-draft'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="tile"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {projectCode}
          </h3>
          {builderName && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {builderName}
            </p>
          )}
        </div>
        <span className={`badge ${getStatusBadgeClass(status)}`}>
          {status.replace('_', ' ')}
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

      {/* Budget Info */}
      <div className="space-y-3">
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
    </motion.div>
  )
}
