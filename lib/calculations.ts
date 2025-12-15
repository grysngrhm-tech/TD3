/**
 * Financial calculations for loan income and IRR
 */

import type { DrawRequest } from '@/types/database'

type ProjectFinancials = {
  loan_amount: number | null
  origination_fee_pct: number | null
  interest_rate_annual: number | null
  loan_start_date: string | null
  payoff_date: string | null
  payoff_amount: number | null
}

type DrawWithDate = {
  total_amount: number
  request_date: string | null
  status: string | null
}

/**
 * Calculate total loan income breakdown (origination fee + interest)
 */
export function calculateLoanIncome(
  project: ProjectFinancials,
  draws: DrawWithDate[]
): { fee: number; interest: number; total: number } {
  const loanAmount = project.loan_amount || 0
  const originationFeePct = project.origination_fee_pct || 0
  const annualRate = project.interest_rate_annual || 0
  
  // Origination fee (earned at loan start)
  const fee = loanAmount * originationFeePct
  
  // Calculate interest income based on draws
  // Interest accrues on each draw from its date until payoff
  const payoffDate = project.payoff_date ? new Date(project.payoff_date) : new Date()
  const dailyRate = annualRate / 365
  
  let interest = 0
  
  // Only count paid draws for interest calculation
  const paidDraws = draws.filter(d => d.status === 'paid' && d.request_date)
  
  for (const draw of paidDraws) {
    if (!draw.request_date) continue
    
    const drawDate = new Date(draw.request_date)
    const daysOutstanding = Math.max(0, Math.floor((payoffDate.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24)))
    const drawInterest = draw.total_amount * dailyRate * daysOutstanding
    interest += drawInterest
  }
  
  return {
    fee: Math.round(fee * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    total: Math.round((fee + interest) * 100) / 100,
  }
}

/**
 * Calculate IRR (Internal Rate of Return) using Newton-Raphson method
 * Returns annualized IRR as a decimal (0.15 = 15%)
 */
export function calculateIRR(
  draws: DrawWithDate[],
  payoffAmount: number | null,
  payoffDate: string | null
): number | null {
  if (!payoffAmount || !payoffDate) return null
  
  // Filter to only paid draws with dates
  const paidDraws = draws.filter(d => d.status === 'paid' && d.request_date)
  if (paidDraws.length === 0) return null
  
  // Build cash flow array: negative for draws (money out), positive for payoff (money in)
  const cashFlows: { amount: number; date: Date }[] = []
  
  for (const draw of paidDraws) {
    if (draw.request_date) {
      cashFlows.push({
        amount: -draw.total_amount, // Negative = money out
        date: new Date(draw.request_date),
      })
    }
  }
  
  // Add payoff as positive cash flow
  cashFlows.push({
    amount: payoffAmount, // Positive = money in
    date: new Date(payoffDate),
  })
  
  // Sort by date
  cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime())
  
  if (cashFlows.length < 2) return null
  
  // Use Newton-Raphson to solve for IRR
  // NPV = sum of (cash_flow / (1 + rate)^years)
  const firstDate = cashFlows[0].date
  
  // Convert dates to years from first date
  const flows = cashFlows.map(cf => ({
    amount: cf.amount,
    years: (cf.date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365),
  }))
  
  // Newton-Raphson iteration
  let rate = 0.1 // Initial guess: 10%
  const maxIterations = 100
  const tolerance = 0.0001
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0
    let npvDerivative = 0
    
    for (const flow of flows) {
      const discountFactor = Math.pow(1 + rate, flow.years)
      npv += flow.amount / discountFactor
      npvDerivative -= (flow.years * flow.amount) / Math.pow(1 + rate, flow.years + 1)
    }
    
    if (Math.abs(npv) < tolerance) {
      return Math.round(rate * 10000) / 10000 // Round to 4 decimal places
    }
    
    if (Math.abs(npvDerivative) < 1e-10) {
      // Derivative too small, can't continue
      break
    }
    
    const newRate = rate - npv / npvDerivative
    
    // Bound the rate to reasonable values
    if (newRate < -0.99) rate = -0.5
    else if (newRate > 10) rate = 5
    else rate = newRate
  }
  
  // If we didn't converge, return the last estimate if it's reasonable
  if (rate > -0.99 && rate < 5) {
    return Math.round(rate * 10000) / 10000
  }
  
  return null
}

/**
 * Format IRR as percentage string
 */
export function formatIRR(irr: number | null): string {
  if (irr === null) return '—'
  return `${(irr * 100).toFixed(1)}%`
}

/**
 * Get IRR color based on value
 */
export function getIRRColor(irr: number | null): string {
  if (irr === null) return 'var(--text-muted)'
  if (irr >= 0.15) return 'var(--success)' // 15%+ = green
  if (irr >= 0.10) return 'var(--warning)' // 10-15% = yellow
  return 'var(--error)' // < 10% = red
}

/**
 * Calculate LTV ratio
 */
export function calculateLTV(loanAmount: number | null, appraisedValue: number | null): number | null {
  if (!loanAmount || !appraisedValue || appraisedValue === 0) return null
  return (loanAmount / appraisedValue) * 100
}

/**
 * Get LTV color based on value
 */
export function getLTVColor(ltv: number | null): string {
  if (ltv === null) return 'var(--text-muted)'
  if (ltv <= 70) return 'var(--success)' // ≤70% = green
  if (ltv <= 80) return 'var(--warning)' // 70-80% = yellow
  return 'var(--error)' // >80% = red
}

/**
 * Calculate utilization percentage (spent / budget)
 */
export function calculateUtilization(spent: number, budget: number): number {
  if (budget === 0) return 0
  return (spent / budget) * 100
}
