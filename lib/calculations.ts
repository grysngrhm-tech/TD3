/**
 * Financial calculations for loan income and IRR
 */

import type { DrawRequest, Project } from '@/types/database'
import { 
  calculateFeeRateAtMonth, 
  getMonthNumber, 
  resolveEffectiveTerms,
  type LoanTerms,
  DEFAULT_LOAN_TERMS,
} from '@/lib/loanTerms'

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
 * Calculate fee escalation schedule using accurate formula:
 * - Months 1-6: 2% flat
 * - Months 7-12: 2.25% + ((month - 7) * 0.25%)
 * - Month 13: 5.9% (extension fee jump)
 * - Month 14+: 5.9% + ((month - 13) * 0.4%)
 */
export function calculateFeeEscalationSchedule(
  baseFeeRate: number,
  loanStartDate: Date,
  endDate: Date,
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): FeeEscalationEntry[] {
  const schedule: FeeEscalationEntry[] = []
  
  // Calculate how many months from start to end
  const endMonth = getMonthNumber(loanStartDate, endDate)
  
  // Generate schedule for months where fee changes occur
  // Month 7 is first escalation (from base to 2.25%)
  for (let month = terms.feeEscalationAfterMonths + 1; month <= Math.max(endMonth, 18); month++) {
    const escalationDate = new Date(loanStartDate)
    escalationDate.setMonth(escalationDate.getMonth() + month - 1)
    
    const previousRate = calculateFeeRateAtMonth(month - 1, terms)
    const newRate = calculateFeeRateAtMonth(month, terms)
    
    // Only add if there's an actual rate change
    if (Math.abs(newRate - previousRate) > 0.0001) {
      schedule.push({
        date: escalationDate,
        previousRate,
        newRate,
        monthNumber: month,
      })
    }
  }
  
  return schedule
}

/**
 * Calculate current fee rate with accurate escalation formula
 * Returns rate, months active, and next escalation date
 */
export function calculateCurrentFeeRate(
  baseFeeRate: number,
  loanStartDate: Date,
  currentDate: Date,
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): { rate: number; monthsActive: number; nextIncrease?: Date; isExtension: boolean } {
  const monthsActive = getMonthNumber(loanStartDate, currentDate)
  
  // Use accurate fee calculation
  const rate = calculateFeeRateAtMonth(monthsActive, terms)
  const isExtension = monthsActive >= terms.extensionFeeMonth
  
  // Calculate next increase date
  let nextIncrease: Date | undefined
  
  // Fee increases every month after month 6
  if (monthsActive >= terms.feeEscalationAfterMonths) {
    nextIncrease = new Date(loanStartDate)
    nextIncrease.setMonth(nextIncrease.getMonth() + monthsActive) // Next month
  } else {
    // Before escalation starts, next increase is at month 7
    nextIncrease = new Date(loanStartDate)
    nextIncrease.setMonth(nextIncrease.getMonth() + terms.feeEscalationAfterMonths)
  }
  
  return { rate, monthsActive, nextIncrease, isExtension }
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
  
  // Add trailing "Current" row with interest accrued from simulated draw to today
  const today = new Date()
  const daysAfterSimDraw = Math.max(0, Math.floor(
    (today.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24)
  ))
  const trailingInterest = newBalance * dailyRate * daysAfterSimDraw
  const { rate: trailingFeeRate } = calculateCurrentFeeRate(
    baseFeeRate,
    loanStartDate,
    today
  )
  
  newSchedule.push({
    date: today,
    drawNumber: null,
    type: 'interest',
    description: 'Current (Simulated)',
    amount: 0,
    days: daysAfterSimDraw,
    interest: trailingInterest,
    feeRate: trailingFeeRate,
    balance: newBalance,
    cumulativeInterest: newCumulativeInterest + trailingInterest,
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

// =============================================================================
// PAYOFF CALCULATIONS
// =============================================================================

/**
 * Payoff breakdown type
 */
export type PayoffBreakdown = {
  principalBalance: number
  accruedInterest: number
  daysOfInterest: number
  perDiem: number
  financeFee: number
  feeRate: number
  feeRatePct: string
  documentFee: number
  credits: number
  totalPayoff: number
  goodThroughDate: Date
  isExtension: boolean
  monthNumber: number
}

/**
 * Calculate complete payoff breakdown
 */
export function calculatePayoffBreakdown(
  project: {
    loan_amount: number | null
    interest_rate_annual: number | null
    origination_fee_pct: number | null
    loan_start_date: string | null
  },
  drawLines: DrawLineWithDate[],
  payoffDate: Date = new Date(),
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): PayoffBreakdown {
  const loanAmount = project.loan_amount || 0
  const annualRate = project.interest_rate_annual || terms.interestRateAnnual
  const loanStartDate = project.loan_start_date ? new Date(project.loan_start_date) : new Date()
  
  // Calculate amortization schedule to get current state
  const schedule = calculateAmortizationSchedule(
    drawLines,
    {
      interest_rate_annual: annualRate,
      origination_fee_pct: project.origination_fee_pct,
      loan_start_date: project.loan_start_date,
      loan_amount: loanAmount,
    },
    payoffDate
  )
  
  const summary = getAmortizationSummary(schedule)
  
  // Calculate current fee rate using accurate formula
  const monthNumber = getMonthNumber(loanStartDate, payoffDate)
  const feeRate = calculateFeeRateAtMonth(monthNumber, terms)
  const isExtension = monthNumber >= terms.extensionFeeMonth
  
  // Calculate fees
  const financeFee = loanAmount * feeRate
  const documentFee = terms.documentFee
  const perDiem = calculatePerDiem(summary.currentPrincipal, annualRate)
  
  // Calculate total payoff
  const totalPayoff = summary.currentPrincipal + summary.totalInterest + financeFee + documentFee
  
  return {
    principalBalance: summary.currentPrincipal,
    accruedInterest: summary.totalInterest,
    daysOfInterest: summary.totalDays,
    perDiem,
    financeFee,
    feeRate,
    feeRatePct: `${(feeRate * 100).toFixed(2)}%`,
    documentFee,
    credits: 0,
    totalPayoff,
    goodThroughDate: payoffDate,
    isExtension,
    monthNumber,
  }
}

/**
 * Calculate payoff at a future date
 */
export function projectPayoffAtDate(
  currentBreakdown: PayoffBreakdown,
  futureDate: Date,
  loanStartDate: Date,
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): PayoffBreakdown {
  const daysDiff = Math.max(0, Math.floor(
    (futureDate.getTime() - currentBreakdown.goodThroughDate.getTime()) / (1000 * 60 * 60 * 24)
  ))
  
  // Calculate additional interest
  const additionalInterest = currentBreakdown.perDiem * daysDiff
  const newAccruedInterest = currentBreakdown.accruedInterest + additionalInterest
  
  // Calculate fee rate at future date
  const monthNumber = getMonthNumber(loanStartDate, futureDate)
  const feeRate = calculateFeeRateAtMonth(monthNumber, terms)
  const isExtension = monthNumber >= terms.extensionFeeMonth
  
  // Recalculate finance fee if in a different month
  const loanAmount = currentBreakdown.principalBalance // Approximate with principal
  const financeFee = loanAmount * feeRate
  
  return {
    ...currentBreakdown,
    accruedInterest: newAccruedInterest,
    daysOfInterest: currentBreakdown.daysOfInterest + daysDiff,
    financeFee,
    feeRate,
    feeRatePct: `${(feeRate * 100).toFixed(2)}%`,
    totalPayoff: currentBreakdown.principalBalance + newAccruedInterest + financeFee + currentBreakdown.documentFee - currentBreakdown.credits,
    goodThroughDate: futureDate,
    isExtension,
    monthNumber,
  }
}

// =============================================================================
// PROJECTION DATA FOR CHARTS
// =============================================================================

/**
 * Projection data point for Nivo charts
 */
export type ProjectionDataPoint = {
  month: number
  date: string
  dateObj: Date
  feeRate: number           // Fee rate at this month (as decimal)
  feeRatePct: number        // Fee rate as percentage (for display)
  cumulativeFee: number     // Total fee cost at this point
  cumulativeInterest: number // Total interest at this point
  totalPayoff: number       // Principal + interest + fees
  principalBalance: number  // Principal balance at this point
  isActual: boolean         // true = past, false = projected
  isCurrentMonth: boolean   // Highlight current position
  isExtensionMonth: boolean // Month 13 extension fee
}

/**
 * Generate projection data for Fee + Interest chart
 * Combines actual past data with projected future data
 */
export function generateProjectionData(
  project: {
    loan_amount: number | null
    interest_rate_annual: number | null
    origination_fee_pct: number | null
    loan_start_date: string | null
  },
  drawLines: DrawLineWithDate[],
  terms: LoanTerms = DEFAULT_LOAN_TERMS,
  throughMonth: number = 18
): ProjectionDataPoint[] {
  const projectionData: ProjectionDataPoint[] = []
  
  const loanAmount = project.loan_amount || 0
  const annualRate = project.interest_rate_annual || terms.interestRateAnnual
  const dailyRate = annualRate / 365
  const loanStartDate = project.loan_start_date ? new Date(project.loan_start_date) : new Date()
  
  // Get current month number
  const today = new Date()
  const currentMonthNum = getMonthNumber(loanStartDate, today)
  
  // Sort draws by date for accurate cumulative calculation
  const sortedDraws = [...drawLines].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // Track running totals
  let runningBalance = 0
  let cumulativeInterest = 0
  let lastDate = loanStartDate
  
  // Pre-compute draw amounts by month
  const drawsByMonth: Map<number, number> = new Map()
  for (const draw of sortedDraws) {
    const drawDate = new Date(draw.date)
    const drawMonth = getMonthNumber(loanStartDate, drawDate)
    const existing = drawsByMonth.get(drawMonth) || 0
    drawsByMonth.set(drawMonth, existing + draw.amount)
  }
  
  // Generate data for each month
  for (let month = 1; month <= throughMonth; month++) {
    const monthDate = new Date(loanStartDate)
    monthDate.setMonth(monthDate.getMonth() + month - 1)
    
    const isActual = month <= currentMonthNum
    const isCurrentMonth = month === currentMonthNum
    const isExtensionMonth = month === terms.extensionFeeMonth
    
    // Add draws for this month
    const monthDraws = drawsByMonth.get(month) || 0
    
    // Add draws for this month to running balance first
    runningBalance += monthDraws
    
    // Calculate interest for this month
    // For actual months: use period interest based on actual draw dates
    // For projected months: assume steady monthly interest on current balance
    const daysInPeriod = 30 // Approximate month length
    const monthInterest = runningBalance * dailyRate * daysInPeriod
    cumulativeInterest += monthInterest
    
    // Calculate fee for this month
    const feeRate = calculateFeeRateAtMonth(month, terms)
    const cumulativeFee = loanAmount * feeRate + terms.documentFee
    
    // Calculate total payoff
    const totalPayoff = runningBalance + cumulativeInterest + cumulativeFee
    
    projectionData.push({
      month,
      date: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      dateObj: monthDate,
      feeRate,
      feeRatePct: feeRate * 100,
      cumulativeFee,
      cumulativeInterest,
      totalPayoff,
      principalBalance: runningBalance,
      isActual,
      isCurrentMonth,
      isExtensionMonth,
    })
  }
  
  return projectionData
}

/**
 * Format projection data for Nivo Line chart
 */
export function formatProjectionForNivo(data: ProjectionDataPoint[]): {
  feeRateSeries: { id: string; data: { x: string; y: number }[] }
  interestSeries: { id: string; data: { x: string; y: number }[] }
  payoffSeries: { id: string; data: { x: string; y: number }[] }
} {
  return {
    feeRateSeries: {
      id: 'Fee Rate %',
      data: data.map(d => ({ x: d.date, y: d.feeRatePct })),
    },
    interestSeries: {
      id: 'Cumulative Interest',
      data: data.map(d => ({ x: d.date, y: d.cumulativeInterest })),
    },
    payoffSeries: {
      id: 'Total Payoff',
      data: data.map(d => ({ x: d.date, y: d.totalPayoff })),
    },
  }
}

/**
 * Get chart annotations for key dates
 */
export function getChartAnnotations(
  data: ProjectionDataPoint[],
  loanTermMonths: number = 12
): Array<{
  type: string
  match: { x: string }
  note: { text: string; align: string }
  style: { stroke: string; strokeWidth: number; strokeDasharray: string }
}> {
  const annotations = []
  
  // Find current month
  const currentMonth = data.find(d => d.isCurrentMonth)
  if (currentMonth) {
    annotations.push({
      type: 'line',
      match: { x: currentMonth.date },
      note: { text: 'Today', align: 'top' },
      style: { stroke: 'var(--accent)', strokeWidth: 2, strokeDasharray: '5,5' },
    })
  }
  
  // Find extension month
  const extensionMonth = data.find(d => d.isExtensionMonth)
  if (extensionMonth) {
    annotations.push({
      type: 'line',
      match: { x: extensionMonth.date },
      note: { text: 'Extension Fee', align: 'top' },
      style: { stroke: 'var(--error)', strokeWidth: 2, strokeDasharray: '3,3' },
    })
  }
  
  // Find maturity (loan term end)
  const maturityMonth = data.find(d => d.month === loanTermMonths)
  if (maturityMonth) {
    annotations.push({
      type: 'line',
      match: { x: maturityMonth.date },
      note: { text: 'Maturity', align: 'top' },
      style: { stroke: 'var(--warning)', strokeWidth: 2, strokeDasharray: '3,3' },
    })
  }
  
  return annotations
}