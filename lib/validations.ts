import { supabase } from './supabase'
import type { ValidationResult, DrawRequest, DrawRequestLine, Budget, Invoice } from '@/types/custom'

/**
 * Validates a draw request for budget overages, missing documents,
 * duplicate invoices, and category mismatches
 */
export async function validateDrawRequest(drawId: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    overages: [],
    missingDocs: [],
    duplicateInvoices: [],
    categoryMismatches: [],
    flags: [],
    isValid: true,
  }

  try {
    // Fetch draw request with lines, budgets, and invoices
    const { data: drawRequest, error: drawError } = await supabase
      .from('draw_requests')
      .select(`
        *,
        draw_request_lines (
          *,
          budgets (*)
        )
      `)
      .eq('id', drawId)
      .single()

    if (drawError || !drawRequest) {
      result.flags.push('DRAW_NOT_FOUND')
      result.isValid = false
      return result
    }

    const lines = (drawRequest as any).draw_request_lines || []

    // Fetch invoices for this draw request
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('draw_request_id', drawId)
    const invoices = invoicesData as Invoice[] | null

    const parseLineFlags = (flagsStr: string | null): string[] => {
      if (!flagsStr) return []
      try {
        const parsed = JSON.parse(flagsStr)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        // Backwards compatibility for very old comma-separated storage
        return flagsStr.split(',').map(s => s.trim()).filter(Boolean)
      }
    }

    // Check each line for validations
    for (const line of lines) {
      const budget = line.budgets

      // 1. Check for budget overage
      if (budget && line.amount_requested > budget.remaining_amount) {
        result.overages.push({
          budgetId: budget.id,
          category: budget.category,
          requested: line.amount_requested,
          remaining: budget.remaining_amount,
          overage: line.amount_requested - budget.remaining_amount,
        })
        result.flags.push('BUDGET_OVERAGE')
      }

      // 2. Check for missing documents (lines without matched invoices)
      const hasMatchedInvoice = line.invoice_file_url || line.matched_invoice_amount
      if (!hasMatchedInvoice && line.amount_requested > 0) {
        result.missingDocs.push({
          lineId: line.id,
          category: budget?.category || 'Unknown',
          amount: line.amount_requested,
        })
        result.flags.push('MISSING_INVOICE')
      }

      // 3. Check variance flags from AI matching
      const lineFlags = parseLineFlags(line.flags)
      if (lineFlags.includes('AMOUNT_MISMATCH')) result.flags.push('VARIANCE_ALERT')
      if (lineFlags.includes('NO_INVOICE')) result.flags.push('NO_INVOICE_MATCH')

      // 4. Check confidence score
      if (line.confidence_score !== null && line.confidence_score < 0.7) {
        result.flags.push('LOW_CONFIDENCE_MATCH')
      }
    }

    // Check for duplicate invoices across all project invoices
    if (invoices && invoices.length > 0) {
      const duplicates = await checkDuplicateInvoices(
        invoices,
        (drawRequest as DrawRequest).project_id || ''
      )
      result.duplicateInvoices = duplicates
      if (duplicates.length > 0) {
        result.flags.push('DUPLICATE_INVOICE')
      }
    }

    // Remove duplicate flags
    result.flags = [...new Set(result.flags)]

    // Determine overall validity
    result.isValid = result.overages.length === 0 && 
                     result.duplicateInvoices.length === 0

  } catch (error) {
    console.error('Error validating draw request:', error)
    result.flags.push('VALIDATION_ERROR')
    result.isValid = false
  }

  return result
}

/**
 * Checks for duplicate invoices by comparing:
 * - File hash (SHA-256)
 * - Vendor + Amount + Date combination
 */
async function checkDuplicateInvoices(
  currentInvoices: Invoice[],
  projectId: string
): Promise<ValidationResult['duplicateInvoices']> {
  const duplicates: ValidationResult['duplicateInvoices'] = []

  // Get all existing invoices for this project
  const { data: existingData } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
  const existingInvoices = existingData as Invoice[] | null

  if (!existingInvoices) return duplicates

  for (const invoice of currentInvoices) {
    // Check by file hash first (most reliable)
    if (invoice.file_hash) {
      const hashMatch = existingInvoices.find(
        (e) => e.file_hash === invoice.file_hash && e.id !== invoice.id
      )
      if (hashMatch) {
        duplicates.push({
          invoiceId: invoice.id,
          vendor: invoice.vendor_name,
          amount: invoice.amount,
          matchedWith: hashMatch.id,
        })
        continue
      }
    }

    // Check by vendor + amount + date combination
    const comboMatch = existingInvoices.find(
      (e) =>
        e.id !== invoice.id &&
        e.vendor_name === invoice.vendor_name &&
        e.amount === invoice.amount &&
        e.invoice_date === invoice.invoice_date
    )
    if (comboMatch) {
      duplicates.push({
        invoiceId: invoice.id,
        vendor: invoice.vendor_name,
        amount: invoice.amount,
        matchedWith: comboMatch.id,
      })
    }
  }

  return duplicates
}

/**
 * Quick check if a draw request can be approved
 * Returns true if no blocking issues found
 */
export async function canApprove(drawId: string): Promise<{
  canApprove: boolean
  blockers: string[]
}> {
  const validation = await validateDrawRequest(drawId)
  
  const blockers: string[] = []
  
  if (validation.overages.length > 0) {
    blockers.push(`${validation.overages.length} budget line(s) exceed remaining funds`)
  }
  
  if (validation.duplicateInvoices.length > 0) {
    blockers.push(`${validation.duplicateInvoices.length} potential duplicate invoice(s) detected`)
  }

  return {
    canApprove: blockers.length === 0,
    blockers,
  }
}

/**
 * Validate a single budget line amount against remaining budget
 */
export function validateLineAmount(
  requestedAmount: number,
  remainingBudget: number
): { valid: boolean; message?: string } {
  if (requestedAmount <= 0) {
    return { valid: false, message: 'Amount must be greater than zero' }
  }
  
  if (requestedAmount > remainingBudget) {
    return {
      valid: false,
      message: `Amount exceeds remaining budget by ${formatCurrency(requestedAmount - remainingBudget)}`,
    }
  }
  
  return { valid: true }
}

/**
 * Format currency helper
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get validation summary as human-readable string
 */
export function getValidationSummary(validation: ValidationResult): string {
  const issues: string[] = []
  
  if (validation.overages.length > 0) {
    issues.push(`${validation.overages.length} budget overage(s)`)
  }
  if (validation.missingDocs.length > 0) {
    issues.push(`${validation.missingDocs.length} line(s) missing documentation`)
  }
  if (validation.duplicateInvoices.length > 0) {
    issues.push(`${validation.duplicateInvoices.length} duplicate invoice(s)`)
  }
  if (validation.categoryMismatches.length > 0) {
    issues.push(`${validation.categoryMismatches.length} category mismatch(es)`)
  }
  
  if (issues.length === 0) {
    return 'No validation issues found'
  }
  
  return issues.join(', ')
}

