/**
 * TD3 Polymorphic UI Utilities
 * 
 * Context-aware styling functions for dynamic UI adaptations
 * based on status, content, and user preferences.
 */

// =============================================================================
// STATUS-BASED TINTING
// =============================================================================

export type WorkflowStatus = 
  | 'draft'
  | 'pending'
  | 'pending_review'
  | 'review'
  | 'staged'
  | 'funded'
  | 'approved'
  | 'rejected'
  | 'pending_wire'
  | 'paid'
  | 'complete'
  | 'active'
  | 'historic'
  | 'on_hold'

export type ThemeMode = 'light' | 'dark'

/**
 * Get a subtle background tint based on status
 * Used for cards, rows, and sections to provide visual context
 */
export function getStatusTint(status: WorkflowStatus, theme: ThemeMode = 'dark'): string {
  const tints: Record<WorkflowStatus, { light: string; dark: string }> = {
    draft: { 
      light: 'rgba(107, 114, 128, 0.05)', 
      dark: 'rgba(107, 114, 128, 0.08)' 
    },
    pending: { 
      light: 'rgba(245, 158, 11, 0.05)', 
      dark: 'rgba(245, 158, 11, 0.08)' 
    },
    pending_review: { 
      light: 'rgba(245, 158, 11, 0.05)', 
      dark: 'rgba(245, 158, 11, 0.08)' 
    },
    review: {
      light: 'rgba(149, 6, 6, 0.05)',
      dark: 'rgba(149, 6, 6, 0.08)'
    },
    staged: { 
      light: 'rgba(59, 130, 246, 0.05)', 
      dark: 'rgba(59, 130, 246, 0.08)' 
    },
    funded: {
      light: 'rgba(16, 185, 129, 0.05)',
      dark: 'rgba(16, 185, 129, 0.08)'
    },
    approved: { 
      light: 'rgba(16, 185, 129, 0.05)', 
      dark: 'rgba(16, 185, 129, 0.08)' 
    },
    rejected: { 
      light: 'rgba(239, 68, 68, 0.05)', 
      dark: 'rgba(239, 68, 68, 0.08)' 
    },
    pending_wire: { 
      light: 'rgba(139, 92, 246, 0.05)', 
      dark: 'rgba(139, 92, 246, 0.08)' 
    },
    paid: { 
      light: 'rgba(16, 185, 129, 0.08)', 
      dark: 'rgba(16, 185, 129, 0.12)' 
    },
    complete: { 
      light: 'rgba(16, 185, 129, 0.05)', 
      dark: 'rgba(16, 185, 129, 0.08)' 
    },
    active: { 
      light: 'transparent', 
      dark: 'transparent' 
    },
    historic: { 
      light: 'rgba(107, 114, 128, 0.03)', 
      dark: 'rgba(107, 114, 128, 0.05)' 
    },
    on_hold: { 
      light: 'rgba(245, 158, 11, 0.05)', 
      dark: 'rgba(245, 158, 11, 0.08)' 
    },
  }

  return tints[status]?.[theme] || 'transparent'
}

/**
 * Get the semantic color variable for a status
 */
export function getStatusColor(status: WorkflowStatus): string {
  const colors: Record<WorkflowStatus, string> = {
    draft: 'var(--text-muted)',
    pending: 'var(--warning)',
    pending_review: 'var(--warning)',
    review: 'var(--accent)',
    staged: 'var(--info)',
    funded: 'var(--success)',
    approved: 'var(--success)',
    rejected: 'var(--error)',
    pending_wire: 'var(--purple)',
    paid: 'var(--success)',
    complete: 'var(--success)',
    active: 'var(--success)',
    historic: 'var(--text-muted)',
    on_hold: 'var(--warning)',
  }

  return colors[status] || 'var(--text-muted)'
}

/**
 * Get the muted background color for a status badge
 */
export function getStatusBadgeBackground(status: WorkflowStatus): string {
  const backgrounds: Record<WorkflowStatus, string> = {
    draft: 'var(--bg-hover)',
    pending: 'var(--warning-muted)',
    pending_review: 'var(--warning-muted)',
    review: 'var(--accent-muted)',
    staged: 'var(--info-muted)',
    funded: 'var(--success-muted)',
    approved: 'var(--success-muted)',
    rejected: 'var(--error-muted)',
    pending_wire: 'var(--purple-muted)',
    paid: 'var(--success-muted)',
    complete: 'var(--success-muted)',
    active: 'var(--success-muted)',
    historic: 'var(--bg-hover)',
    on_hold: 'var(--warning-muted)',
  }

  return backgrounds[status] || 'var(--bg-hover)'
}

// =============================================================================
// AMOUNT-BASED EMPHASIS
// =============================================================================

export type AmountEmphasis = 'normal' | 'medium' | 'high' | 'extreme'

/**
 * Determine emphasis level based on financial amount
 */
export function getAmountEmphasis(amount: number): AmountEmphasis {
  if (amount >= 10000000) return 'extreme'  // $10M+
  if (amount >= 1000000) return 'high'      // $1M+
  if (amount >= 100000) return 'medium'     // $100K+
  return 'normal'
}

/**
 * Get styling classes/styles for amount emphasis
 */
export function getAmountStyles(amount: number): {
  fontWeight: number
  color?: string
  className?: string
} {
  const emphasis = getAmountEmphasis(amount)

  switch (emphasis) {
    case 'extreme':
      return {
        fontWeight: 800,
        color: 'var(--gold)',
        className: 'financial-value text-lg'
      }
    case 'high':
      return {
        fontWeight: 700,
        color: 'var(--accent)',
        className: 'financial-value'
      }
    case 'medium':
      return {
        fontWeight: 600,
        className: 'financial-value'
      }
    default:
      return {
        fontWeight: 400,
        className: 'financial-value'
      }
  }
}

// =============================================================================
// LTV-BASED COLORING
// =============================================================================

export type LtvRisk = 'low' | 'medium' | 'high'

/**
 * Get risk level based on LTV ratio
 * ≤65% = low risk (green)
 * 66-74% = medium risk (yellow)
 * ≥75% = high risk (red)
 */
export function getLtvRisk(ltv: number): LtvRisk {
  if (ltv <= 65) return 'low'
  if (ltv <= 74) return 'medium'
  return 'high'
}

/**
 * Get color for LTV display
 */
export function getLtvColor(ltv: number): string {
  const risk = getLtvRisk(ltv)
  switch (risk) {
    case 'low': return 'var(--success)'
    case 'medium': return 'var(--warning)'
    case 'high': return 'var(--error)'
  }
}

// =============================================================================
// IRR-BASED COLORING
// =============================================================================

/**
 * Get color for IRR display based on performance
 * ≥15% = excellent (green)
 * 10-14% = good (warning/yellow)
 * <10% = below target (error/red)
 */
export function getIrrColor(irr: number | null | undefined): string {
  if (irr === null || irr === undefined) return 'var(--text-muted)'
  if (irr >= 0.15) return 'var(--success)'
  if (irr >= 0.10) return 'var(--warning)'
  return 'var(--error)'
}

// =============================================================================
// LIFECYCLE STAGE STYLING
// =============================================================================

export type LifecycleStage = 'pending' | 'active' | 'historic'

/**
 * Get styling adjustments based on lifecycle stage
 */
export function getLifecycleStyles(stage: LifecycleStage): {
  opacity: number
  saturation: string
  tint: string
} {
  switch (stage) {
    case 'pending':
      return {
        opacity: 1,
        saturation: '100%',
        tint: 'rgba(245, 158, 11, 0.03)'
      }
    case 'active':
      return {
        opacity: 1,
        saturation: '100%',
        tint: 'transparent'
      }
    case 'historic':
      return {
        opacity: 0.85,
        saturation: '90%',
        tint: 'rgba(107, 114, 128, 0.03)'
      }
  }
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Get appropriate animation for feedback type
 */
export function getFeedbackAnimation(type: 'success' | 'error' | 'warning' | 'info'): string {
  switch (type) {
    case 'success':
      return 'animate-scale-in'
    case 'error':
      return 'animate-shake'
    case 'warning':
      return 'animate-pulse'
    case 'info':
      return 'animate-fade-in'
  }
}

// =============================================================================
// ELEVATION HELPERS
// =============================================================================

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Get shadow variable for elevation level
 */
export function getElevation(level: ElevationLevel): string {
  if (level === 0) return 'none'
  return `var(--elevation-${level})`
}

/**
 * Get appropriate elevation for component type
 */
export function getComponentElevation(
  component: 'card' | 'dropdown' | 'modal' | 'tooltip' | 'toast',
  isHovered: boolean = false
): ElevationLevel {
  const baseElevations: Record<string, ElevationLevel> = {
    card: 2,
    dropdown: 3,
    modal: 5,
    tooltip: 4,
    toast: 4,
  }

  const base = baseElevations[component] || 2
  return isHovered ? Math.min(base + 1, 5) as ElevationLevel : base
}

