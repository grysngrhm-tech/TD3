/**
 * Loan Terms Management
 * Centralizes term resolution with hierarchy: Project > Lender > Default
 */

import { DEFAULT_TERM_SHEET, type Project } from '@/types/database'

/**
 * Complete loan terms structure
 */
export type LoanTerms = {
  // Interest
  interestRateAnnual: number
  
  // Base Fee & Escalation (Months 1-12)
  baseFee: number
  feeEscalationPct: number
  feeEscalationAfterMonths: number
  feeRateAtMonth7: number
  
  // Extension Fee (Month 13+)
  extensionFeeMonth: number
  extensionFeeRate: number
  postExtensionEscalation: number
  
  // Fixed Fees
  documentFee: number
  
  // Term
  loanTermMonths: number
}

/**
 * Default loan terms from the system defaults
 */
export const DEFAULT_LOAN_TERMS: LoanTerms = {
  interestRateAnnual: DEFAULT_TERM_SHEET.interest_rate_annual,
  baseFee: DEFAULT_TERM_SHEET.origination_fee_pct,
  feeEscalationPct: DEFAULT_TERM_SHEET.fee_escalation_pct,
  feeEscalationAfterMonths: DEFAULT_TERM_SHEET.fee_escalation_after_months,
  feeRateAtMonth7: DEFAULT_TERM_SHEET.fee_rate_at_month_7,
  extensionFeeMonth: DEFAULT_TERM_SHEET.extension_fee_month,
  extensionFeeRate: DEFAULT_TERM_SHEET.extension_fee_rate,
  postExtensionEscalation: DEFAULT_TERM_SHEET.post_extension_escalation,
  documentFee: DEFAULT_TERM_SHEET.document_fee,
  loanTermMonths: DEFAULT_TERM_SHEET.loan_term_months,
}

/**
 * Lender-specific term overrides (can be extended to fetch from database)
 */
export type LenderTermOverrides = Partial<LoanTerms>

/**
 * Resolve effective loan terms using hierarchy:
 * 1. Project-specific values (highest priority)
 * 2. Lender overrides
 * 3. System defaults (lowest priority)
 */
export function resolveEffectiveTerms(
  project: Project,
  lenderOverrides?: LenderTermOverrides
): LoanTerms {
  const base = { ...DEFAULT_LOAN_TERMS }
  
  // Apply lender overrides if provided
  if (lenderOverrides) {
    Object.assign(base, lenderOverrides)
  }
  
  // Apply project-specific values (highest priority)
  return {
    ...base,
    interestRateAnnual: project.interest_rate_annual ?? base.interestRateAnnual,
    baseFee: project.origination_fee_pct ?? base.baseFee,
    loanTermMonths: project.loan_term_months ?? base.loanTermMonths,
  }
}

/**
 * Calculate the fee rate at a specific month using the exact Excel formula:
 * 
 * =IF((DATEDIF(D23,D24,"m")+1)<=6, 0.02,
 *    IF((DATEDIF(D23,D24,"m")+1)<=12, 0.0225+(((DATEDIF(D23,D24,"m")+1)-7)*0.0025),
 *      IF((DATEDIF(D23,D24,"m")+1)=13, 0.059,
 *        0.059+(((DATEDIF(D23,D24,"m")+1)-13)*0.004))))
 * 
 * @param month - Month number (1-indexed, where 1 = first month of loan)
 * @param terms - Loan terms to use for calculation
 */
export function calculateFeeRateAtMonth(month: number, terms: LoanTerms = DEFAULT_LOAN_TERMS): number {
  // Months 1-6: Base fee (flat 2%)
  if (month <= terms.feeEscalationAfterMonths) {
    return terms.baseFee
  }
  
  // Months 7-12: 2.25% + ((month - 7) * 0.25%)
  if (month <= 12) {
    return terms.feeRateAtMonth7 + ((month - 7) * terms.feeEscalationPct)
  }
  
  // Month 13: Extension fee (5.9%)
  if (month === terms.extensionFeeMonth) {
    return terms.extensionFeeRate
  }
  
  // Month 14+: 5.9% + ((month - 13) * 0.4%)
  return terms.extensionFeeRate + ((month - terms.extensionFeeMonth) * terms.postExtensionEscalation)
}

/**
 * Get the month number from loan start date to a given date
 * Returns 1-indexed month (month 1 = first month of loan)
 */
export function getMonthNumber(loanStartDate: Date, targetDate: Date): number {
  const start = new Date(loanStartDate)
  const target = new Date(targetDate)
  
  // Calculate months difference
  let months = (target.getFullYear() - start.getFullYear()) * 12
  months += target.getMonth() - start.getMonth()
  
  // Adjust for day of month
  if (target.getDate() < start.getDate()) {
    months--
  }
  
  // Return 1-indexed month (minimum 1)
  return Math.max(1, months + 1)
}

/**
 * Get the date when the next fee increase will occur
 */
export function getNextFeeIncreaseDate(
  loanStartDate: Date,
  currentDate: Date,
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): { date: Date; newRate: number; currentRate: number } | null {
  const currentMonth = getMonthNumber(loanStartDate, currentDate)
  const currentRate = calculateFeeRateAtMonth(currentMonth, terms)
  
  // If we're past month 13, fee increases every month
  if (currentMonth >= terms.extensionFeeMonth) {
    const nextMonth = currentMonth + 1
    const nextDate = new Date(loanStartDate)
    nextDate.setMonth(nextDate.getMonth() + nextMonth - 1)
    return {
      date: nextDate,
      newRate: calculateFeeRateAtMonth(nextMonth, terms),
      currentRate,
    }
  }
  
  // If we're in months 7-12, fee increases monthly
  if (currentMonth > terms.feeEscalationAfterMonths && currentMonth < terms.extensionFeeMonth) {
    const nextMonth = currentMonth + 1
    const nextDate = new Date(loanStartDate)
    nextDate.setMonth(nextDate.getMonth() + nextMonth - 1)
    return {
      date: nextDate,
      newRate: calculateFeeRateAtMonth(nextMonth, terms),
      currentRate,
    }
  }
  
  // If we're in months 1-6, next increase is at month 7
  if (currentMonth <= terms.feeEscalationAfterMonths) {
    const nextMonth = terms.feeEscalationAfterMonths + 1 // Month 7
    const nextDate = new Date(loanStartDate)
    nextDate.setMonth(nextDate.getMonth() + nextMonth - 1)
    return {
      date: nextDate,
      newRate: calculateFeeRateAtMonth(nextMonth, terms),
      currentRate,
    }
  }
  
  return null
}

/**
 * Calculate days until next fee increase
 */
export function getDaysUntilNextFeeIncrease(
  loanStartDate: Date,
  currentDate: Date,
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): number | null {
  const nextIncrease = getNextFeeIncreaseDate(loanStartDate, currentDate, terms)
  if (!nextIncrease) return null
  
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((nextIncrease.date.getTime() - currentDate.getTime()) / msPerDay)
}

/**
 * Generate a complete fee schedule for display
 */
export function generateFeeSchedule(
  loanStartDate: Date,
  throughMonth: number = 18,
  terms: LoanTerms = DEFAULT_LOAN_TERMS
): Array<{
  month: number
  date: Date
  feeRate: number
  feeRatePct: string
  isExtensionMonth: boolean
  escalationType: 'base' | 'standard' | 'extension' | 'post-extension'
}> {
  const schedule = []
  
  for (let month = 1; month <= throughMonth; month++) {
    const date = new Date(loanStartDate)
    date.setMonth(date.getMonth() + month - 1)
    
    const feeRate = calculateFeeRateAtMonth(month, terms)
    
    let escalationType: 'base' | 'standard' | 'extension' | 'post-extension'
    if (month <= terms.feeEscalationAfterMonths) {
      escalationType = 'base'
    } else if (month <= 12) {
      escalationType = 'standard'
    } else if (month === terms.extensionFeeMonth) {
      escalationType = 'extension'
    } else {
      escalationType = 'post-extension'
    }
    
    schedule.push({
      month,
      date,
      feeRate,
      feeRatePct: `${(feeRate * 100).toFixed(2)}%`,
      isExtensionMonth: month === terms.extensionFeeMonth,
      escalationType,
    })
  }
  
  return schedule
}

/**
 * Urgency level based on days to maturity
 */
export type UrgencyLevel = 'critical' | 'urgent' | 'warning' | 'caution' | 'normal'

export function getUrgencyLevel(daysToMaturity: number): UrgencyLevel {
  if (daysToMaturity < 0) return 'critical'  // Past due
  if (daysToMaturity <= 14) return 'urgent'  // 2 weeks
  if (daysToMaturity <= 30) return 'warning' // 1 month
  if (daysToMaturity <= 60) return 'caution' // 2 months
  return 'normal'
}

/**
 * Get urgency color based on level
 */
export function getUrgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case 'critical': return 'var(--error)'
    case 'urgent': return 'var(--error)'
    case 'warning': return 'var(--warning)'
    case 'caution': return 'var(--warning)'
    case 'normal': return 'var(--success)'
  }
}

/**
 * Calculate days to maturity from current date
 */
export function getDaysToMaturity(maturityDate: Date | string | null, currentDate: Date = new Date()): number | null {
  if (!maturityDate) return null
  const maturity = typeof maturityDate === 'string' ? new Date(maturityDate) : maturityDate
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((maturity.getTime() - currentDate.getTime()) / msPerDay)
}

