'use client'

import { motion } from 'framer-motion'
import { getStatusColor, getStatusBadgeBackground, type WorkflowStatus } from '@/lib/polymorphic'

type StatusBadgeProps = {
  status: WorkflowStatus
  label?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  showDot?: boolean
  className?: string
}

// Human-readable labels for statuses
const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  pending_review: 'Pending Review',
  review: 'Review',
  staged: 'Staged',
  funded: 'Funded',
  approved: 'Approved',
  rejected: 'Rejected',
  pending_wire: 'Pending Wire',
  paid: 'Paid',
  complete: 'Complete',
  active: 'Active',
  historic: 'Complete',
  on_hold: 'On Hold',
}

// Size configurations
const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  animated = false,
  showDot = false,
  className = '',
}: StatusBadgeProps) {
  const displayLabel = label || STATUS_LABELS[status] || status
  const color = getStatusColor(status)
  const background = getStatusBadgeBackground(status)

  const BadgeContent = (
    <>
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      <span>{displayLabel}</span>
    </>
  )

  const baseClasses = `
    inline-flex items-center gap-1.5 font-semibold rounded-full
    ${SIZE_CLASSES[size]}
    ${className}
  `.trim()

  const styles = {
    background,
    color,
  }

  if (animated) {
    return (
      <motion.span
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={baseClasses}
        style={styles}
      >
        {BadgeContent}
      </motion.span>
    )
  }

  return (
    <span className={baseClasses} style={styles}>
      {BadgeContent}
    </span>
  )
}

// Convenience exports for common status types
export function DraftBadge(props: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge {...props} status="draft" />
}

export function PendingBadge(props: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge {...props} status="pending" />
}

export function ApprovedBadge(props: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge {...props} status="approved" />
}

export function RejectedBadge(props: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge {...props} status="rejected" />
}

export function ActiveBadge(props: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge {...props} status="active" />
}

export function CompleteBadge(props: Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge {...props} status="complete" />
}

