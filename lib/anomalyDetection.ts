/**
 * Anomaly Detection Module for Financial Reports
 * Identifies unusual patterns in budget and draw data
 */

import type { Budget, DrawRequestLine, DrawRequest, Project } from '@/types/database'

// Anomaly types that can be detected
export type AnomalyType = 
  | 'SPENDING_SPIKE'      // Single draw > 50% of category budget
  | 'VELOCITY_HIGH'       // Spending faster than typical pace (based on loan timeline)
  | 'VELOCITY_LOW'        // Spending slower than expected (potential project stall)
  | 'OVER_BUDGET'         // Category has exceeded its budget
  | 'NEAR_BUDGET'         // Category is >90% utilized
  | 'LARGE_VARIANCE'      // Draw line variance from invoice > 10%
  | 'DORMANT_CATEGORY'    // Budget allocated but no draws in 60+ days
  | 'CONCENTRATION_RISK'  // >40% of total spend in single category
  | 'UNUSUAL_TIMING'      // Draw submitted on weekend or holiday

// Severity levels for anomalies
export type AnomalySeverity = 'info' | 'warning' | 'critical'

// Anomaly interface
export interface Anomaly {
  type: AnomalyType
  severity: AnomalySeverity
  budgetId?: string
  drawId?: string
  lineId?: string
  category?: string
  message: string
  suggestion?: string
  data?: Record<string, number | string>
}

// Configuration thresholds
const THRESHOLDS = {
  SPENDING_SPIKE_PCT: 50,        // Single draw > 50% of budget = spike
  OVER_BUDGET_TRIGGER: 100,      // Trigger when utilization >= 100%
  NEAR_BUDGET_TRIGGER: 90,       // Warning when utilization >= 90%
  DORMANT_DAYS: 60,              // No activity in 60+ days
  CONCENTRATION_RISK_PCT: 40,    // >40% of total in single category
  VARIANCE_THRESHOLD: 0.10,      // 10% variance between requested and invoice
  VELOCITY_HIGH_MULTIPLIER: 1.5, // Spending 1.5x faster than expected
  VELOCITY_LOW_MULTIPLIER: 0.5,  // Spending 0.5x slower than expected
}

/**
 * Main anomaly detection function
 * Analyzes budgets and draw lines to find unusual patterns
 */
export function detectAnomalies(
  budgets: Budget[],
  draws: DrawRequest[],
  drawLines: DrawRequestLine[],
  project: Project
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Create lookup maps for efficiency
  const budgetMap = new Map(budgets.map(b => [b.id, b]))
  const drawMap = new Map(draws.map(d => [d.id, d]))

  // Group draw lines by budget
  const linesByBudget = new Map<string, DrawRequestLine[]>()
  for (const line of drawLines) {
    if (line.budget_id) {
      const existing = linesByBudget.get(line.budget_id) || []
      existing.push(line)
      linesByBudget.set(line.budget_id, existing)
    }
  }

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)

  // Check each budget for anomalies
  for (const budget of budgets) {
    const budgetAmount = budget.current_amount || 0
    const spentAmount = budget.spent_amount || 0
    const lines = linesByBudget.get(budget.id) || []

    // Skip zero-budget items
    if (budgetAmount === 0 && spentAmount === 0) continue

    // 1. Over Budget Detection
    if (spentAmount > budgetAmount && budgetAmount > 0) {
      const overage = spentAmount - budgetAmount
      const overagePct = ((spentAmount / budgetAmount) - 1) * 100

      anomalies.push({
        type: 'OVER_BUDGET',
        severity: overagePct > 20 ? 'critical' : 'warning',
        budgetId: budget.id,
        category: budget.category,
        message: `${budget.category} is ${overagePct.toFixed(1)}% over budget ($${overage.toLocaleString()} overage)`,
        suggestion: 'Review if a change order is needed to increase the budget allocation.',
        data: {
          budget_amount: budgetAmount,
          spent_amount: spentAmount,
          overage_amount: overage,
          overage_percentage: `${overagePct.toFixed(1)}%`,
        }
      })
    }

    // 2. Near Budget Warning (>90% but not over)
    else if (budgetAmount > 0) {
      const utilization = (spentAmount / budgetAmount) * 100
      if (utilization >= THRESHOLDS.NEAR_BUDGET_TRIGGER && utilization < THRESHOLDS.OVER_BUDGET_TRIGGER) {
        anomalies.push({
          type: 'NEAR_BUDGET',
          severity: 'info',
          budgetId: budget.id,
          category: budget.category,
          message: `${budget.category} is at ${utilization.toFixed(1)}% utilization`,
          suggestion: 'Monitor closely - only $' + (budgetAmount - spentAmount).toLocaleString() + ' remaining.',
          data: {
            utilization: `${utilization.toFixed(1)}%`,
            remaining: budgetAmount - spentAmount,
          }
        })
      }
    }

    // 3. Spending Spike Detection
    for (const line of lines) {
      const lineAmount = line.amount_approved || line.amount_requested || 0
      if (budgetAmount > 0 && lineAmount > budgetAmount * (THRESHOLDS.SPENDING_SPIKE_PCT / 100)) {
        const draw = line.draw_request_id ? drawMap.get(line.draw_request_id) : null
        anomalies.push({
          type: 'SPENDING_SPIKE',
          severity: 'warning',
          budgetId: budget.id,
          lineId: line.id,
          drawId: line.draw_request_id || undefined,
          category: budget.category,
          message: `Large draw in ${budget.category}: $${lineAmount.toLocaleString()} (${((lineAmount / budgetAmount) * 100).toFixed(1)}% of budget)`,
          suggestion: 'Verify this is expected for this category and review supporting documentation.',
          data: {
            draw_number: draw?.draw_number || 'Unknown',
            line_amount: lineAmount,
            budget_amount: budgetAmount,
            percentage: `${((lineAmount / budgetAmount) * 100).toFixed(1)}%`,
          }
        })
      }
    }

    // 4. Dormant Category Detection (has budget but no draws in 60+ days)
    if (budgetAmount > 0 && spentAmount === 0 && project.loan_start_date) {
      const loanStart = new Date(project.loan_start_date)
      const daysSinceStart = Math.floor((Date.now() - loanStart.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceStart > THRESHOLDS.DORMANT_DAYS) {
        anomalies.push({
          type: 'DORMANT_CATEGORY',
          severity: 'info',
          budgetId: budget.id,
          category: budget.category,
          message: `${budget.category} has $${budgetAmount.toLocaleString()} allocated but no draws after ${daysSinceStart} days`,
          suggestion: 'Verify this category is still needed or if work has been delayed.',
          data: {
            budget_amount: budgetAmount,
            days_since_loan_start: daysSinceStart,
          }
        })
      }
    }

    // 5. Concentration Risk Detection
    if (totalSpent > 0 && spentAmount > totalSpent * (THRESHOLDS.CONCENTRATION_RISK_PCT / 100)) {
      const concentrationPct = (spentAmount / totalSpent) * 100
      anomalies.push({
        type: 'CONCENTRATION_RISK',
        severity: 'info',
        budgetId: budget.id,
        category: budget.category,
        message: `${budget.category} represents ${concentrationPct.toFixed(1)}% of total spend`,
        suggestion: 'High concentration in a single category - verify this aligns with project progress.',
        data: {
          category_spent: spentAmount,
          total_spent: totalSpent,
          concentration: `${concentrationPct.toFixed(1)}%`,
        }
      })
    }
  }

  // 6. Check draw lines for variance issues
  for (const line of drawLines) {
    const requested = line.amount_requested || 0
    const invoiceAmount = line.matched_invoice_amount
    
    if (invoiceAmount && requested > 0) {
      const variance = Math.abs(requested - invoiceAmount) / requested
      if (variance > THRESHOLDS.VARIANCE_THRESHOLD) {
        const budget = line.budget_id ? budgetMap.get(line.budget_id) : null
        anomalies.push({
          type: 'LARGE_VARIANCE',
          severity: variance > 0.25 ? 'warning' : 'info',
          lineId: line.id,
          drawId: line.draw_request_id || undefined,
          budgetId: line.budget_id || undefined,
          category: budget?.category,
          message: `Variance of ${(variance * 100).toFixed(1)}% between requested ($${requested.toLocaleString()}) and invoice ($${invoiceAmount.toLocaleString()})`,
          suggestion: 'Review the invoice and draw request amounts to ensure they align.',
          data: {
            requested_amount: requested,
            invoice_amount: invoiceAmount,
            variance_percentage: `${(variance * 100).toFixed(1)}%`,
          }
        })
      }
    }
  }

  // 7. Velocity Analysis (if we have enough data)
  if (project.loan_start_date && project.loan_term_months && totalBudget > 0) {
    const loanStart = new Date(project.loan_start_date)
    const monthsElapsed = (Date.now() - loanStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const expectedProgress = monthsElapsed / project.loan_term_months
    const actualProgress = totalSpent / totalBudget

    // High velocity (spending too fast)
    if (actualProgress > expectedProgress * THRESHOLDS.VELOCITY_HIGH_MULTIPLIER && monthsElapsed > 1) {
      anomalies.push({
        type: 'VELOCITY_HIGH',
        severity: 'warning',
        message: `Project is spending faster than expected: ${(actualProgress * 100).toFixed(1)}% spent after ${(expectedProgress * 100).toFixed(1)}% of term`,
        suggestion: 'Review if construction is ahead of schedule or if there are cost overruns.',
        data: {
          months_elapsed: monthsElapsed.toFixed(1),
          expected_progress: `${(expectedProgress * 100).toFixed(1)}%`,
          actual_progress: `${(actualProgress * 100).toFixed(1)}%`,
        }
      })
    }

    // Low velocity (spending too slow)
    if (actualProgress < expectedProgress * THRESHOLDS.VELOCITY_LOW_MULTIPLIER && monthsElapsed > 2) {
      anomalies.push({
        type: 'VELOCITY_LOW',
        severity: 'info',
        message: `Project spending is slower than expected: ${(actualProgress * 100).toFixed(1)}% spent after ${(expectedProgress * 100).toFixed(1)}% of term`,
        suggestion: 'Check if there are construction delays or if draws are being held.',
        data: {
          months_elapsed: monthsElapsed.toFixed(1),
          expected_progress: `${(expectedProgress * 100).toFixed(1)}%`,
          actual_progress: `${(actualProgress * 100).toFixed(1)}%`,
        }
      })
    }
  }

  // Sort by severity (critical first, then warning, then info)
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

/**
 * Get count of anomalies by severity
 */
export function countAnomaliesBySeverity(anomalies: Anomaly[]): Record<AnomalySeverity, number> {
  return anomalies.reduce(
    (acc, a) => {
      acc[a.severity]++
      return acc
    },
    { critical: 0, warning: 0, info: 0 }
  )
}

/**
 * Check if a specific budget has any anomalies
 */
export function getBudgetAnomalies(budgetId: string, anomalies: Anomaly[]): Anomaly[] {
  return anomalies.filter(a => a.budgetId === budgetId)
}

/**
 * Get the highest severity for a budget
 */
export function getBudgetSeverity(budgetId: string, anomalies: Anomaly[]): AnomalySeverity | null {
  const budgetAnomalies = getBudgetAnomalies(budgetId, anomalies)
  if (budgetAnomalies.length === 0) return null
  
  if (budgetAnomalies.some(a => a.severity === 'critical')) return 'critical'
  if (budgetAnomalies.some(a => a.severity === 'warning')) return 'warning'
  return 'info'
}

