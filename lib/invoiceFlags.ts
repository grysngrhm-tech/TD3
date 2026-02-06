import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * Parse draw-line flags from their stored JSON string format.
 * Handles both JSON arrays and comma-separated strings.
 */
function parseLineFlags(flagsStr: string | null): string[] {
  if (!flagsStr) return []
  try {
    const parsed = JSON.parse(flagsStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return flagsStr.split(',').map(s => s.trim()).filter(Boolean)
  }
}

/**
 * Reconcile NO_INVOICE flags across all draw lines for a given draw request.
 *
 * Lines with amount > 0 and no matched invoice get the NO_INVOICE flag added.
 * Lines that have since been matched get the flag removed.
 * Only applies when the draw has at least one invoice uploaded.
 */
export async function reconcileNoInvoiceFlags(drawRequestId: string) {
  // Get all lines and their invoice status
  const { data: lines } = await supabaseAdmin
    .from('draw_request_lines')
    .select('id, amount_requested, invoice_file_id, matched_invoice_amount, flags')
    .eq('draw_request_id', drawRequestId)

  if (!lines) return

  // Check if draw has any invoices
  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('draw_request_id', drawRequestId)

  const hasAnyInvoices = (invoices?.length || 0) > 0

  // Only flag lines if the draw has at least one invoice
  if (!hasAnyInvoices) return

  for (const line of lines) {
    const hasInvoice = !!line.invoice_file_id || !!line.matched_invoice_amount
    const needsInvoice = (line.amount_requested || 0) > 0 && !hasInvoice

    const currentFlags = parseLineFlags(line.flags ?? null)
    const flagSet = new Set(currentFlags)
    const hadNoInvoice = flagSet.has('NO_INVOICE')

    if (needsInvoice && !hadNoInvoice) {
      flagSet.add('NO_INVOICE')
    } else if (!needsInvoice && hadNoInvoice) {
      flagSet.delete('NO_INVOICE')
    } else {
      continue // No change needed
    }

    await supabaseAdmin
      .from('draw_request_lines')
      .update({
        flags: flagSet.size > 0 ? JSON.stringify([...flagSet]) : null,
      })
      .eq('id', line.id)
  }
}
