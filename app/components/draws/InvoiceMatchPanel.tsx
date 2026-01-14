'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Invoice, Budget, MatchCandidate, InvoiceMatchDecision } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { recordMatchCorrection } from '@/lib/invoiceLearning'

type DrawLine = {
  id: string
  budget_id: string | null
  amount_requested: number
  budget?: Budget | null
}

type InvoiceMatchPanelProps = {
  invoice: Invoice & {
    extracted_data?: any
    match_status?: string
    candidate_count?: number
    was_manually_corrected?: boolean
  }
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

// Format percentage
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

// Get score color based on value
function getScoreColor(score: number): string {
  if (score >= 0.85) return 'var(--success)'
  if (score >= 0.65) return 'var(--accent)'
  if (score >= 0.50) return 'var(--warning)'
  return 'var(--error)'
}

// Correction reasons
const CORRECTION_REASONS = [
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'wrong_project', label: 'Wrong project/lot' },
  { value: 'split_invoice', label: 'Invoice covers multiple categories' },
  { value: 'amount_adjusted', label: 'Amount was adjusted' },
  { value: 'vendor_misidentified', label: 'Vendor misidentified' },
  { value: 'other', label: 'Other' },
]

export function InvoiceMatchPanel({
  invoice,
  drawLines,
  allBudgets,
  onClose,
  onMatched
}: InvoiceMatchPanelProps) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(invoice.draw_request_line_id || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [lastDecision, setLastDecision] = useState<InvoiceMatchDecision | null>(null)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [correctionReason, setCorrectionReason] = useState<string>('')
  const [customReason, setCustomReason] = useState('')

  // Is this a correction (changing from a previous match)?
  const isCorrection = invoice.draw_request_line_id && selectedLineId !== invoice.draw_request_line_id
  const needsCorrectionReason = isCorrection && !correctionReason

  // Load candidates and last decision on mount
  useEffect(() => {
    async function loadMatchData() {
      // Load last decision (which contains candidates)
      const { data: decision } = await supabase
        .from('invoice_match_decisions')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (decision) {
        setLastDecision(decision as InvoiceMatchDecision)
        if (decision.candidates && Array.isArray(decision.candidates)) {
          setCandidates(decision.candidates as MatchCandidate[])
        }
      }
    }
    loadMatchData()
  }, [invoice.id])

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

  // Get candidate info for a draw line
  const getCandidateForLine = (lineId: string): MatchCandidate | undefined => {
    return candidates.find(c => c.drawLineId === lineId)
  }

  // Sort candidates by composite score
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => b.scores.composite - a.scores.composite)
  }, [candidates])

  const handleSave = async () => {
    if (needsCorrectionReason) {
      setError('Please select a reason for changing the match')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const selectedLine = selectedLineId ? drawLines.find(l => l.id === selectedLineId) : null
      const selectedCategory = selectedLine?.budget?.category || null

      // If this is a correction, record it for learning
      if (isCorrection && selectedLineId) {
        const reason = correctionReason === 'other' ? customReason : correctionReason
        await recordMatchCorrection(
          invoice.id,
          invoice.draw_request_line_id || null,
          selectedLineId,
          selectedCategory || '',
          reason,
          'user' // Would use actual user ID in production
        )
      }

      // Update invoice with matched line
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          draw_request_line_id: selectedLineId,
          match_status: selectedLineId ? 'manually_matched' : 'needs_review',
          confidence_score: selectedLineId ? 1.0 : null,
          matched_to_category: selectedCategory,
          was_manually_corrected: isCorrection || invoice.was_manually_corrected || false,
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
            confidence_score: 1.0
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

      // Record decision for audit trail
      await supabase
        .from('invoice_match_decisions')
        .insert({
          invoice_id: invoice.id,
          draw_request_line_id: selectedLineId,
          decision_type: isCorrection ? 'manual_override' : 'manual_initial',
          decision_source: 'user',
          candidates: candidates,
          selected_draw_line_id: selectedLineId,
          selected_confidence: 1.0,
          selection_factors: { manual_selection: true },
          previous_draw_line_id: isCorrection ? invoice.draw_request_line_id : null,
          correction_reason: isCorrection ? (correctionReason === 'other' ? customReason : correctionReason) : null,
          decided_at: new Date().toISOString(),
        })

      onMatched()
      onClose()
    } catch (err: any) {
      console.error('Error matching invoice:', err)
      setError(err.message || 'Failed to save match')
    } finally {
      setSaving(false)
    }
  }

  // Get file URL - prefer file_url, fall back to constructing from file_path
  const fileUrl = invoice.file_url || (invoice.file_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${invoice.file_path}`
    : null)

  // Get extracted data
  const extracted = invoice.extracted_data

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Match Invoice to Category</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {candidates.length > 0
                ? `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} found • Select the best match`
                : 'Review the invoice and select which draw line it supports'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Preview - Left Side */}
          <div className="w-1/2 border-r flex flex-col" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-tertiary)' }}>
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Invoice Preview
              </span>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:opacity-70"
                  style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
              )}
            </div>

            <div className="flex-1 p-2 overflow-hidden">
              {fileUrl && !pdfError ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full rounded-lg border"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: '#525659'
                  }}
                  title="Invoice Preview"
                  onError={() => setPdfError(true)}
                />
              ) : (
                <div
                  className="w-full h-full rounded-lg border flex flex-col items-center justify-center gap-4"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                    <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {pdfError ? 'Unable to load preview' : 'No preview available'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Click to open file directly
                        </a>
                      ) : (
                        'Invoice file not found'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Selection - Right Side */}
          <div className="w-1/2 flex flex-col">
            {/* Invoice Summary */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-glow)' }}>
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
                  {/* Extracted context */}
                  {extracted?.context && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                      "{extracted.context}"
                    </p>
                  )}
                  {/* Extracted keywords */}
                  {extracted?.keywords && extracted.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {extracted.keywords.slice(0, 5).map((kw: string) => (
                        <span
                          key={kw}
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                        >
                          {kw}
                        </span>
                      ))}
                      {extracted.keywords.length > 5 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          +{extracted.keywords.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(invoice.amount)}
                  </p>
                  {extracted?.trade && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Trade: {extracted.trade}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Reasoning (if available) */}
            {lastDecision?.ai_reasoning && (
              <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-glow)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>AI Reasoning</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lastDecision.ai_reasoning}</p>
              </div>
            )}

            {/* Draw Lines Selection */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Candidates Section (if available) */}
                {sortedCandidates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--accent)' }}>
                      Scored Candidates
                    </p>
                    <div className="space-y-2">
                      {sortedCandidates.slice(0, showAllCategories ? undefined : 3).map((candidate, idx) => {
                        const isSelected = selectedLineId === candidate.drawLineId
                        const line = drawLines.find(l => l.id === candidate.drawLineId)
                        if (!line) return null

                        return (
                          <button
                            key={candidate.drawLineId}
                            onClick={() => setSelectedLineId(candidate.drawLineId)}
                            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-[var(--accent)]'
                                : 'border-transparent hover:border-[var(--border-primary)]'
                            }`}
                            style={{ background: 'var(--bg-secondary)' }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  isSelected ? 'border-[var(--accent)]' : 'border-[var(--border-primary)]'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {candidate.budgetCategory}
                                  </p>
                                  {idx === 0 && (
                                    <span className="px-1.5 py-0.5 text-xs rounded" style={{ background: 'var(--success)', color: 'white' }}>
                                      Best
                                    </span>
                                  )}
                                </div>
                                {candidate.nahbCategory && (
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    NAHB: {candidate.nahbCategory}
                                  </p>
                                )}
                                {/* Score breakdown */}
                                <div className="flex items-center gap-3 mt-1.5 text-xs">
                                  <span style={{ color: getScoreColor(candidate.scores.composite) }}>
                                    {formatPercent(candidate.scores.composite)} match
                                  </span>
                                  {candidate.factors.tradeMatch && (
                                    <span style={{ color: 'var(--success)' }}>Trade match</span>
                                  )}
                                  {candidate.factors.vendorPreviousMatch && (
                                    <span style={{ color: 'var(--success)' }}>Vendor history</span>
                                  )}
                                  {candidate.factors.keywordMatches.length > 0 && (
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {candidate.factors.keywordMatches.length} keywords
                                    </span>
                                  )}
                                </div>
                                {/* Amount variance */}
                                {Math.abs(candidate.factors.amountVariance) > 0.02 && (
                                  <p className="text-xs mt-1" style={{
                                    color: candidate.factors.amountVariance > 0.10 ? 'var(--warning)' : 'var(--text-muted)'
                                  }}>
                                    {candidate.factors.amountVarianceAbsolute > 0 ? '+' : ''}
                                    {formatCurrency(invoice.amount - candidate.amountRequested)} variance
                                    ({formatPercent(Math.abs(candidate.factors.amountVariance))})
                                  </p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {formatCurrency(candidate.amountRequested)}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  requested
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                      {sortedCandidates.length > 3 && !showAllCategories && (
                        <button
                          onClick={() => setShowAllCategories(true)}
                          className="w-full py-2 text-sm hover:opacity-70"
                          style={{ color: 'var(--accent)' }}
                        >
                          Show {sortedCandidates.length - 3} more candidates
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Separator */}
                {sortedCandidates.length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="text-xs hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showAllCategories ? 'Show less' : 'Show all categories'}
                    </button>
                    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                  </div>
                )}

                {/* All Categories (fallback or expanded view) */}
                {(showAllCategories || sortedCandidates.length === 0) && (
                  <>
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
                            const candidate = getCandidateForLine(line.id)

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
                                    {candidate && (
                                      <p className="text-xs" style={{ color: getScoreColor(candidate.scores.composite) }}>
                                        {formatPercent(candidate.scores.composite)} match
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                      {formatCurrency(line.amount_requested)}
                                    </p>
                                    {budget && (
                                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        Budget: {formatCurrency(budget.current_amount)}
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
                  </>
                )}
              </div>
            </div>

            {/* Correction Reason (when changing from existing match) */}
            {isCorrection && (
              <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--warning-glow)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Why are you changing this match?
                </p>
                <div className="flex flex-wrap gap-2">
                  {CORRECTION_REASONS.map(reason => (
                    <button
                      key={reason.value}
                      onClick={() => setCorrectionReason(reason.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        correctionReason === reason.value
                          ? 'border-[var(--warning)]'
                          : 'border-transparent hover:border-[var(--border-primary)]'
                      }`}
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
                {correctionReason === 'other' && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full mt-2 px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-primary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                )}
              </div>
            )}
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
              disabled={saving || needsCorrectionReason}
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
                  {isCorrection ? 'Update Match' : 'Save Match'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
