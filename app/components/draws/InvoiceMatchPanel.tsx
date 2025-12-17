'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Invoice, Budget } from '@/types/database'
import { supabase } from '@/lib/supabase'

type DrawLine = {
  id: string
  budget_id: string | null
  amount_requested: number
  budget?: Budget | null
}

type InvoiceMatchPanelProps = {
  invoice: Invoice
  drawLines: DrawLine[]
  allBudgets: Budget[]
  onClose: () => void
  onMatched: () => void
}

// Format currency
function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function InvoiceMatchPanel({ 
  invoice, 
  drawLines, 
  allBudgets,
  onClose, 
  onMatched 
}: InvoiceMatchPanelProps) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(invoice.draw_request_line_id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group draw lines by NAHB category for easier selection
  const groupedLines = useMemo(() => {
    const groups: Record<string, DrawLine[]> = {}
    
    drawLines.forEach(line => {
      const category = line.budget?.nahb_category || 'Other'
      if (!groups[category]) groups[category] = []
      groups[category].push(line)
    })
    
    return groups
  }, [drawLines])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    
    try {
      // Update invoice with matched line
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          draw_request_line_id: selectedLineId,
          status: selectedLineId ? 'matched' : 'unmatched',
          confidence_score: selectedLineId ? 1.0 : null, // Manual match = 100% confidence
          matched_to_category: selectedLineId 
            ? drawLines.find(l => l.id === selectedLineId)?.budget?.category || null
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
      
      if (invoiceError) throw invoiceError
      
      // If matched to a line, update the line with invoice info
      if (selectedLineId) {
        const { error: lineError } = await supabase
          .from('draw_request_lines')
          .update({
            invoice_file_id: invoice.id,
            invoice_file_url: invoice.file_url,
            invoice_vendor_name: invoice.vendor_name,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            matched_invoice_amount: invoice.amount,
            confidence_score: 1.0 // Manual match
          })
          .eq('id', selectedLineId)
        
        if (lineError) throw lineError
        
        // Clear any previous line that had this invoice
        await supabase
          .from('draw_request_lines')
          .update({
            invoice_file_id: null,
            invoice_file_url: null,
            invoice_vendor_name: null,
            invoice_number: null,
            invoice_date: null,
            matched_invoice_amount: null,
            confidence_score: null
          })
          .eq('invoice_file_id', invoice.id)
          .neq('id', selectedLineId)
      }
      
      onMatched()
      onClose()
    } catch (err: any) {
      console.error('Error matching invoice:', err)
      setError(err.message || 'Failed to save match')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Match Invoice to Category</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Select which draw line this invoice supports
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invoice Info */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {invoice.vendor_name}
              </p>
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                {invoice.invoice_number && <span>#{invoice.invoice_number}</span>}
                {invoice.invoice_date && <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                {formatCurrency(invoice.amount)}
              </p>
              {invoice.matched_to_category && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  AI suggested: {invoice.matched_to_category}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Draw Lines Selection */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Unmatched option */}
            <button
              onClick={() => setSelectedLineId(null)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                selectedLineId === null 
                  ? 'border-[var(--warning)]' 
                  : 'border-transparent hover:border-[var(--border-primary)]'
              }`}
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedLineId === null ? 'border-[var(--warning)]' : 'border-[var(--border-primary)]'
                  }`}
                >
                  {selectedLineId === null && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                  )}
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Leave Unmatched</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This invoice doesn't match any draw line</p>
                </div>
              </div>
            </button>

            {/* Grouped draw lines */}
            {Object.entries(groupedLines).map(([category, lines]) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                  {category}
                </p>
                <div className="space-y-2">
                  {lines.map(line => {
                    const isSelected = selectedLineId === line.id
                    const budget = line.budget
                    
                    return (
                      <button
                        key={line.id}
                        onClick={() => setSelectedLineId(line.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected 
                            ? 'border-[var(--accent)]' 
                            : 'border-transparent hover:border-[var(--border-primary)]'
                        }`}
                        style={{ background: 'var(--bg-secondary)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-[var(--accent)]' : 'border-[var(--border-primary)]'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {budget?.category || 'Unknown Category'}
                            </p>
                            {budget?.cost_code && (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Code: {budget.cost_code}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {formatCurrency(line.amount_requested)}
                            </p>
                            {budget && (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Budget: {formatCurrency(budget.budget_amount)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          {error && (
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary px-4 py-2 flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Match
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

