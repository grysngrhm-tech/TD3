'use client'

import { useRef } from 'react'
import type { Builder, DrawRequest, Project, WireBatch } from '@/types/custom'

type DrawWithProject = DrawRequest & {
  project?: Project | null
}

type WireBatchWithDetails = WireBatch & {
  builder?: Builder
  draws?: DrawWithProject[]
}

type FundingReportProps = {
  batch: WireBatchWithDetails
  onPrint?: () => void
}

/**
 * FundingReport - Formatted funding report for bookkeeper
 * 
 * Shows:
 * - Wire batch ID and submission date
 * - Builder details (company, banking info)
 * - List of draws with project codes and amounts
 * - Total funding amount
 * 
 * Can be printed directly from the browser
 */
export function FundingReport({ batch, onPrint }: FundingReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  return (
    <div className="space-y-4">
      {/* Print button */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </button>
      </div>

      {/* Report content */}
      <div 
        ref={reportRef}
        className="p-6 rounded-lg print:p-0 print:shadow-none"
        style={{ 
          background: 'var(--bg-primary)', 
          border: '1px solid var(--border-subtle)' 
        }}
      >
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Wire Funding Request
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Batch #{batch.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Submitted: {formatDateTime(batch.submitted_at || batch.created_at)}
          </p>
        </div>

        {/* Builder / Wire Destination */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Wire Destination
          </h3>
          <div 
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <p className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
              {batch.builder?.company_name}
            </p>
            {batch.builder?.borrower_name && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Attn: {batch.builder.borrower_name}
              </p>
            )}
            
            <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <div>
                <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Bank Name</dt>
                <dd style={{ color: 'var(--text-primary)' }}>{batch.builder?.bank_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Account Name</dt>
                <dd style={{ color: 'var(--text-primary)' }}>{batch.builder?.bank_account_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Routing Number</dt>
                <dd className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {batch.builder?.bank_routing_number || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Account Number</dt>
                <dd className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {batch.builder?.bank_account_number || 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Draw Details */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Draw Details ({batch.draws?.length || 0} draws)
          </h3>
          <div 
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    Project
                  </th>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    Draw #
                  </th>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    Request Date
                  </th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {batch.draws?.map((draw, idx) => (
                  <tr 
                    key={draw.id}
                    style={{ 
                      background: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {draw.project?.project_code || draw.project?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                      #{draw.draw_number}
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(draw.request_date)}
                    </td>
                    <td 
                      className="px-4 py-2 text-right font-mono font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {formatCurrency(draw.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Total Wire Amount:
                  </td>
                  <td 
                    className="px-4 py-3 text-right font-mono font-bold text-lg"
                    style={{ color: 'var(--success)' }}
                  >
                    {formatCurrency(batch.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Confirmation section */}
        <div 
          className="p-4 rounded-lg text-center"
          style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
            Awaiting Wire Confirmation
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Please send wire and record the confirmation details below
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Generated by TD3 Construction Loan Management
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .funding-report-print, .funding-report-print * {
            visibility: visible;
          }
          .funding-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

