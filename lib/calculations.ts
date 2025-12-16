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
 * Get LTV color based on value (≤65% green, 66-74% yellow, ≥75% red)
 */
export function getLTVColor(ltv: number | null): string {
  if (ltv === null) return 'var(--text-muted)'
  if (ltv <= 65) return 'var(--success)' // ≤65% = green
  if (ltv <= 74) return 'var(--warning)' // 66-74% = yellow
  return 'var(--error)' // ≥75% = red
}

/**
 * Calculate utilization percentage (spent / budget)
 */
export function calculateUtilization(spent: number, budget: number): number {
  if (budget === 0) return 0
  return (spent / budget) * 100
}

// =============================================================================
// AMORTIZATION CALCULATIONS
// =============================================================================

type DrawLineWithDate = {
  amount: number
  date: string
  drawNumber?: number
}

type AmortizationProjectFinancials = {
  interest_rate_annual: number | null
  origination_fee_pct: number | null
  loan_start_date: string | null
  loan_amount: number | null
}

/**
 * Amortization schedule row type
 */
export type AmortizationRow = {
  date: Date
  drawNumber: number | null  // null for payoff row or fee rows
  type: 'draw' | 'interest' | 'fee' | 'payoff'
  description: string
  amount: number             // draw amount, interest, or fee
  days: number               // days since previous row
  interest: number           // interest accrued for this period
  feeRate: number            // current fee rate (with escalation)
  balance: number            // running principal balance
  cumulativeInterest: number // total interest accrued to date
}

/**
 * Fee escalation schedule entry
 */
export type FeeEscalationEntry = {
  date: Date
  previousRate: number
  newRate: number
  monthNumber: number
}

/**
 * Calculate fee escalation schedule
 * Base fee + 0.25% per month after 6 months
 */
export function calculateFeeEscalationSchedule(
  baseFeeRate: number,
  loanStartDate: Date,
  endDate: Date,
  escalationRate: number = 0.0025,  // 0.25% per month
  escalationStartMonth: number = 6
): FeeEscalationEntry[] {
  const schedule: FeeEscalationEntry[] = []
  
  // Calculate how many months from start to end
  const monthsDiff = Math.ceil(
    (endDate.getTime() - loanStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )
  
  // Start escalation after the specified month
  for (let month = escalationStartMonth + 1; month <= monthsDiff; month++) {
    const escalationDate = new Date(loanStartDate)
    escalationDate.setMonth(escalationDate.getMonth() + month)
    
    const monthsSinceEscalationStart = month - escalationStartMonth
    const previousRate = baseFeeRate + (escalationRate * (monthsSinceEscalationStart - 1))
    const newRate = baseFeeRate + (escalationRate * monthsSinceEscalationStart)
    
    schedule.push({
      date: escalationDate,
      previousRate,
      newRate,
      monthNumber: month,
    })
  }
  
  return schedule
}

/**
 * Calculate current fee rate with escalation
 * Returns rate and next escalation date
 */
export function calculateCurrentFeeRate(
  baseFeeRate: number,
  loanStartDate: Date,
  currentDate: Date,
  escalationRate: number = 0.0025,  // 0.25% per month
  escalationStartMonth: number = 6
): { rate: number; monthsActive: number; nextIncrease?: Date } {
  const monthsActive = Math.floor(
    (currentDate.getTime() - loanStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )
  
  let rate = baseFeeRate
  let nextIncrease: Date | undefined
  
  if (monthsActive > escalationStartMonth) {
    const escalationMonths = monthsActive - escalationStartMonth
    rate = baseFeeRate + (escalationRate * escalationMonths)
    
    // Calculate next increase date
    nextIncrease = new Date(loanStartDate)
    nextIncrease.setMonth(nextIncrease.getMonth() + monthsActive + 1)
  } else if (monthsActive === escalationStartMonth) {
    // Escalation starts next month
    nextIncrease = new Date(loanStartDate)
    nextIncrease.setMonth(nextIncrease.getMonth() + escalationStartMonth + 1)
  }
  
  return { rate, monthsActive, nextIncrease }
}

/**
 * Calculate per diem (daily interest amount)
 */
export function calculatePerDiem(
  principalBalance: number,
  annualRate: number
): number {
  if (principalBalance <= 0 || annualRate <= 0) return 0
  return (principalBalance * annualRate) / 365
}

/**
 * Calculate amortization schedule from draw lines
 * Uses draw_request_lines for granular interest tracking
 */
export function calculateAmortizationSchedule(
  drawLines: DrawLineWithDate[],
  project: AmortizationProjectFinancials,
  payoffDate?: Date
): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  
  const annualRate = project.interest_rate_annual || 0
  const dailyRate = annualRate / 365
  const baseFeeRate = project.origination_fee_pct || 0
  const loanStartDate = project.loan_start_date ? new Date(project.loan_start_date) : null
  
  if (!loanStartDate || drawLines.length === 0) {
    return schedule
  }
  
  // Sort draws by date
  const sortedDraws = [...drawLines].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  let runningBalance = 0
  let cumulativeInterest = 0
  let previousDate = loanStartDate
  
  // Process each draw
  for (const draw of sortedDraws) {
    const drawDate = new Date(draw.date)
    const days = Math.max(0, Math.floor((drawDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Calculate interest for the period before this draw
    const periodInterest = runningBalance * dailyRate * days
    cumulativeInterest += periodInterest
    
    // Get current fee rate
    const { rate: currentFeeRate } = calculateCurrentFeeRate(
      baseFeeRate,
      loanStartDate,
      drawDate
    )
    
    // Add draw row
    runningBalance += draw.amount
    
    schedule.push({
      date: drawDate,
      drawNumber: draw.drawNumber || null,
      type: 'draw',
      description: draw.drawNumber ? `Draw #${draw.drawNumber}` : 'Draw',
      amount: draw.amount,
      days,
      interest: periodInterest,
      feeRate: currentFeeRate,
      balance: runningBalance,
      cumulativeInterest,
    })
    
    previousDate = drawDate
  }
  
  // Add payoff row if date provided
  const endDate = payoffDate || new Date()
  const finalDays = Math.max(0, Math.floor((endDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)))
  const finalInterest = runningBalance * dailyRate * finalDays
  cumulativeInterest += finalInterest
  
  const { rate: finalFeeRate } = calculateCurrentFeeRate(
    baseFeeRate,
    loanStartDate,
    endDate
  )
  
  schedule.push({
    date: endDate,
    drawNumber: null,
    type: payoffDate ? 'payoff' : 'interest',
    description: payoffDate ? 'Payoff' : 'Current',
    amount: 0,
    days: finalDays,
    interest: finalInterest,
    feeRate: finalFeeRate,
    balance: runningBalance,
    cumulativeInterest,
  })
  
  return schedule
}

/**
 * Project interest at a future date
 */
export function projectInterestAtDate(
  currentSchedule: AmortizationRow[],
  targetDate: Date,
  annualRate: number
): { interest: number; total: number; daysDiff: number; perDiem: number } {
  if (currentSchedule.length === 0) {
    return { interest: 0, total: 0, daysDiff: 0, perDiem: 0 }
  }
  
  const lastRow = currentSchedule[currentSchedule.length - 1]
  const balance = lastRow.balance
  const currentInterest = lastRow.cumulativeInterest
  
  const daysDiff = Math.max(0, Math.floor(
    (targetDate.getTime() - lastRow.date.getTime()) / (1000 * 60 * 60 * 24)
  ))
  
  const dailyRate = annualRate / 365
  const additionalInterest = balance * dailyRate * daysDiff
  const perDiem = calculatePerDiem(balance, annualRate)
  
  return {
    interest: currentInterest + additionalInterest,
    total: balance + currentInterest + additionalInterest,
    daysDiff,
    perDiem,
  }
}

/**
 * Simulate adding a new draw to the schedule
 */
export function simulateNextDraw(
  currentSchedule: AmortizationRow[],
  drawAmount: number,
  drawDate: Date,
  project: AmortizationProjectFinancials
): AmortizationRow[] {
  if (currentSchedule.length === 0) {
    return calculateAmortizationSchedule(
      [{ amount: drawAmount, date: drawDate.toISOString() }],
      project,
      undefined
    )
  }
  
  // Get current state
  const lastRow = currentSchedule[currentSchedule.length - 1]
  const annualRate = project.interest_rate_annual || 0
  const dailyRate = annualRate / 365
  const baseFeeRate = project.origination_fee_pct || 0
  const loanStartDate = project.loan_start_date ? new Date(project.loan_start_date) : new Date()
  
  // Calculate days since last entry
  const days = Math.max(0, Math.floor(
    (drawDate.getTime() - lastRow.date.getTime()) / (1000 * 60 * 60 * 24)
  ))
  
  // Calculate interest for the period
  const periodInterest = lastRow.balance * dailyRate * days
  const newCumulativeInterest = lastRow.cumulativeInterest + periodInterest
  const newBalance = lastRow.balance + drawAmount
  
  // Get current fee rate
  const { rate: currentFeeRate } = calculateCurrentFeeRate(
    baseFeeRate,
    loanStartDate,
    drawDate
  )
  
  // Create new schedule with simulated draw
  const newSchedule = [...currentSchedule]
  
  // Remove the last row if it's not a draw (e.g., "Current" row)
  if (lastRow.type !== 'draw') {
    newSchedule.pop()
  }
  
  // Add the simulated draw
  newSchedule.push({
    date: drawDate,
    drawNumber: null, // Simulated
    type: 'draw',
    description: 'Simulated Draw',
    amount: drawAmount,
    days,
    interest: periodInterest,
    feeRate: currentFeeRate,
    balance: newBalance,
    cumulativeInterest: newCumulativeInterest,
  })
  
  return newSchedule
}

/**
 * Calculate total payoff amount
 */
export function calculateTotalPayoff(
  principal: number,
  totalInterest: number,
  docFee: number = 1000,
  financeFee: number = 0,
  credits: number = 0
): number {
  return principal + totalInterest + docFee + financeFee - credits
}

/**
 * Calculate origination fee from loan amount
 */
export function calculateOriginationFee(
  loanAmount: number,
  feeRate: number
): number {
  return loanAmount * feeRate
}

/**
 * Get amortization summary statistics
 */
export function getAmortizationSummary(schedule: AmortizationRow[]): {
  totalDraws: number
  maxPrincipal: number
  currentPrincipal: number
  totalInterest: number
  totalDays: number
  avgDailyInterest: number
} {
  if (schedule.length === 0) {
    return {
      totalDraws: 0,
      maxPrincipal: 0,
      currentPrincipal: 0,
      totalInterest: 0,
      totalDays: 0,
      avgDailyInterest: 0,
    }
  }
  
  const draws = schedule.filter(row => row.type === 'draw')
  const lastRow = schedule[schedule.length - 1]
  const maxPrincipal = Math.max(...schedule.map(row => row.balance))
  const totalDays = schedule.reduce((sum, row) => sum + row.days, 0)
  
  return {
    totalDraws: draws.length,
    maxPrincipal,
    currentPrincipal: lastRow.balance,
    totalInterest: lastRow.cumulativeInterest,
    totalDays,
    avgDailyInterest: totalDays > 0 ? lastRow.cumulativeInterest / totalDays : 0,
  }
}