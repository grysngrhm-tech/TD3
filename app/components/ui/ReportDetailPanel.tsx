'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Budget, DrawRequestLine, DrawRequest } from '@/types/custom'

export type DetailPanelContent = 
  | { type: 'budget'; data: Budget; drawHistory: DrawHistoryItem[] }
  | { type: 'draw'; data: DrawRequest; lines: DrawRequestLine[] }
  | { type: 'anomaly'; data: AnomalyDetail }
  | null

export type DrawHistoryItem = {
  drawNumber: number
  date: string
  amount: number
  notes?: string | null
}

export type AnomalyDetail = {
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  suggestion?: string
  affectedItem?: string
  data?: Record<string, string | number>
}

type ReportDetailPanelProps = {
  content: DetailPanelContent
  onClose: () => void
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
  switch (severity) {
    case 'critical': return 'var(--error)'
    case 'warning': return 'var(--warning)'
    default: return 'var(--info)'
  }
}

/**
 * Slide-out panel for detailed view of budget lines, draws, or anomalies
 * Context-aware rendering based on content type
 */
export function ReportDetailPanel({ content, onClose }: ReportDetailPanelProps) {
  return (
    <AnimatePresence>
      {content && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-5 border-b" 
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {content.type === 'budget' && 'Budget Line Details'}
                  {content.type === 'draw' && `Draw #${content.data.draw_number}`}
                  {content.type === 'anomaly' && 'Anomaly Details'}
                </h2>
                {content.type === 'budget' && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {content.data.category}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-hover)]"
              >
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {content.type === 'budget' && <BudgetDetailContent data={content.data} drawHistory={content.drawHistory} />}
              {content.type === 'draw' && <DrawDetailContent data={content.data} lines={content.lines} />}
              {content.type === 'anomaly' && <AnomalyDetailContent data={content.data} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Budget Detail Content
function BudgetDetailContent({ data, drawHistory }: { data: Budget; drawHistory: DrawHistoryItem[] }) {
  const spent = data.spent_amount || 0
  const budget = data.current_amount || 0
  const remaining = budget - spent
  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0
  const isOverBudget = remaining < 0

  return (
    <>
      {/* Budget Stats */}
      <div className="card-ios">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Budget Amount
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(budget)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Drawn
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {formatCurrency(spent)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Remaining
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: isOverBudget ? 'var(--error)' : 'var(--success)' }}>
              {formatCurrency(remaining)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Utilization
            </div>
            <div className="text-xl font-bold mt-1" style={{ 
              color: percentUsed > 100 ? 'var(--error)' : percentUsed > 80 ? 'var(--warning)' : 'var(--text-primary)'
            }}>
              {percentUsed.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
            <motion.div 
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ 
                background: isOverBudget ? 'var(--error)' : 'var(--accent)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentUsed, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {isOverBudget && (
              <motion.div 
                className="absolute inset-y-0 rounded-full"
                style={{ 
                  background: 'var(--error)',
                  left: '100%',
                  opacity: 0.5,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentUsed - 100, 50)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Category Info */}
      <div className="card-ios space-y-3">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Category Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {data.cost_code && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Cost Code</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{data.cost_code}</div>
            </div>
          )}
          {data.nahb_category && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>NAHB Category</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{data.nahb_category}</div>
            </div>
          )}
          {data.nahb_subcategory && (
            <div className="col-span-2">
              <div style={{ color: 'var(--text-muted)' }}>NAHB Subcategory</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{data.nahb_subcategory}</div>
            </div>
          )}
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Original Amount</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.original_amount)}</div>
          </div>
          {data.is_change_order && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Type</div>
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full" style={{ 
                background: 'var(--warning-muted)', 
                color: 'var(--warning)' 
              }}>
                Change Order
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Draw History */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Draw History ({drawHistory.length})
          </h3>
        </div>
        {drawHistory.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No draws yet for this line item</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {drawHistory.map((draw, index) => (
              <div key={index} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: 'var(--bg-hover)', color: 'var(--accent)' }}
                  >
                    #{draw.drawNumber}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Draw #{draw.drawNumber}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(draw.date)}
                    </div>
                  </div>
                </div>
                <div className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatCurrency(draw.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// Draw Detail Content
function DrawDetailContent({ data, lines }: { data: DrawRequest; lines: DrawRequestLine[] }) {
  return (
    <>
      {/* Draw Summary */}
      <div className="card-ios">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Amount
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {formatCurrency(data.total_amount)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Request Date
            </div>
            <div className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {formatDate(data.request_date)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Status
            </div>
            <span className={`inline-block mt-1 badge badge-${data.status || 'draft'}`}>
              {data.status || 'draft'}
            </span>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Line Items
            </div>
            <div className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {lines.length}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card-ios p-0 overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Line Items
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {lines.map((line) => (
            <div key={line.id} className="px-4 py-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {line.invoice_vendor_name || 'Unknown Vendor'}
                  </div>
                  {line.notes && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {line.notes}
                    </p>
                  )}
                </div>
                <div className="text-right ml-3">
                  <div className="font-semibold" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(line.amount_approved || line.amount_requested)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="card-ios">
          <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Notes</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.notes}</p>
        </div>
      )}
    </>
  )
}

// Anomaly Detail Content
function AnomalyDetailContent({ data }: { data: AnomalyDetail }) {
  return (
    <>
      {/* Anomaly Header */}
      <div 
        className="card-ios"
        style={{ borderLeft: `4px solid ${getSeverityColor(data.severity)}` }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${getSeverityColor(data.severity)}20` }}
          >
            {data.severity === 'critical' && (
              <svg className="w-5 h-5" style={{ color: getSeverityColor(data.severity) }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {data.severity === 'warning' && (
              <svg className="w-5 h-5" style={{ color: getSeverityColor(data.severity) }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {data.severity === 'info' && (
              <svg className="w-5 h-5" style={{ color: getSeverityColor(data.severity) }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full"
                style={{ 
                  background: `${getSeverityColor(data.severity)}20`,
                  color: getSeverityColor(data.severity)
                }}
              >
                {data.severity}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.type}</span>
            </div>
            <h3 className="font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {data.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card-ios">
        <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Description</h4>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.message}</p>
      </div>

      {/* Affected Item */}
      {data.affectedItem && (
        <div className="card-ios">
          <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Affected Item</h4>
          <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{data.affectedItem}</p>
        </div>
      )}

      {/* Data Points */}
      {data.data && Object.keys(data.data).length > 0 && (
        <div className="card-ios">
          <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Details</h4>
          <div className="space-y-2">
            {Object.entries(data.data).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {typeof value === 'number' && key.toLowerCase().includes('amount') 
                    ? formatCurrency(value) 
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion */}
      {data.suggestion && (
        <div 
          className="card-ios"
          style={{ background: 'var(--info-muted)' }}
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--info)' }}>Suggestion</h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{data.suggestion}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

