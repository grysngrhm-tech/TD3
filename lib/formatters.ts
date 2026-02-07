// =============================================================================
// Shared Formatting Utilities
// =============================================================================

/**
 * Format as USD currency with 2 decimal places (cents).
 * Example: 1234.5 → "$1,234.50"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format as USD currency with no decimal places (whole dollars).
 * Example: 1234.5 → "$1,235"
 */
export function formatCurrencyWhole(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format as USD currency with 4 decimal places.
 * Example: 0.0825 → "$0.0825"
 */
export function formatCurrencyPrecise(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount)
}

/**
 * Format as compact USD currency with K/M abbreviation.
 * Example: 1500000 → "$1.5M", 250000 → "$250k", 500 → "$500"
 */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`
  }
  return `$${amount}`
}

/**
 * Format a date with short month, numeric day, and year.
 * Accepts Date objects, ISO strings, or null/undefined.
 * Example: "2024-03-15" → "Mar 15, 2024"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date with short month and day only (no year).
 * Example: "2024-03-15" → "Mar 15"
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date with long month, numeric day, and year.
 * Example: "2024-03-15" → "March 15, 2024"
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date with weekday, long month, numeric day, and year.
 * Example: "2024-03-15" → "Friday, March 15, 2024"
 */
export function formatDateFull(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date string with short month, day, year, and time (hour:minute).
 * Example: "2024-03-15T14:30:00Z" → "Mar 15, 2024, 02:30 PM"
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a decimal rate as a percentage with 2 decimal places.
 * Example: 0.085 → "8.50%"
 */
export function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(2)}%`
}
