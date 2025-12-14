'use client'

import type { ValidationResult } from '@/types/database'

interface ValidationAlertsProps {
  validation: ValidationResult
  compact?: boolean
}

export function ValidationAlerts({ validation, compact = false }: ValidationAlertsProps) {
  const hasIssues = 
    validation.overages.length > 0 ||
    validation.missingDocs.length > 0 ||
    validation.duplicateInvoices.length > 0 ||
    validation.categoryMismatches.length > 0

  if (!hasIssues && validation.isValid) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-800 font-medium">All validations passed</span>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-3">
      {/* Budget Overages - Blocking */}
      {validation.overages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-800 font-semibold">Budget Overages ({validation.overages.length})</h4>
              <p className="text-red-700 text-sm mt-1">
                The following lines exceed available budget:
              </p>
              {!compact && (
                <ul className="mt-2 space-y-1">
                  {validation.overages.map((overage, idx) => (
                    <li key={idx} className="text-red-700 text-sm flex justify-between">
                      <span>{overage.category}</span>
                      <span className="font-medium">
                        {formatCurrency(overage.overage)} over
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Invoices - Blocking */}
      {validation.duplicateInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-800 font-semibold">
                Duplicate Invoices ({validation.duplicateInvoices.length})
              </h4>
              <p className="text-red-700 text-sm mt-1">
                These invoices may have been submitted before:
              </p>
              {!compact && (
                <ul className="mt-2 space-y-1">
                  {validation.duplicateInvoices.map((dup, idx) => (
                    <li key={idx} className="text-red-700 text-sm">
                      {dup.vendor} - {formatCurrency(dup.amount)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Missing Documents - Warning */}
      {validation.missingDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-amber-800 font-semibold">
                Missing Documentation ({validation.missingDocs.length})
              </h4>
              <p className="text-amber-700 text-sm mt-1">
                No invoices attached to these line items:
              </p>
              {!compact && (
                <ul className="mt-2 space-y-1">
                  {validation.missingDocs.map((doc, idx) => (
                    <li key={idx} className="text-amber-700 text-sm flex justify-between">
                      <span>{doc.category}</span>
                      <span className="font-medium">{formatCurrency(doc.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Mismatches - Warning */}
      {validation.categoryMismatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-amber-800 font-semibold">
                Category Mismatches ({validation.categoryMismatches.length})
              </h4>
              <p className="text-amber-700 text-sm mt-1">
                Invoice vendors may not match budget categories
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Flags */}
      {validation.flags.includes('LOW_CONFIDENCE_MATCH') && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-700 text-sm">
              Some invoice matches have low confidence scores
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact validation badge showing status
 */
export function ValidationBadge({ validation }: { validation: ValidationResult }) {
  if (validation.isValid && validation.flags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Valid
      </span>
    )
  }

  const hasBlockers = validation.overages.length > 0 || validation.duplicateInvoices.length > 0
  const warningCount = validation.missingDocs.length + validation.categoryMismatches.length

  if (hasBlockers) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Blocked
      </span>
    )
  }

  if (warningCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {warningCount} Warning{warningCount > 1 ? 's' : ''}
      </span>
    )
  }

  return null
}

