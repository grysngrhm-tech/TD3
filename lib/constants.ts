/**
 * NAHB Category Constants
 * Categories are ordered roughly chronologically based on typical construction sequence
 */

// NAHB Category Order - maps cost_code prefix to sort order
// Lower numbers = earlier in construction process
export const NAHB_CATEGORY_ORDER: Record<string, number> = {
  '01': 1,   // Site Work / Preparation
  '02': 2,   // Foundation
  '03': 3,   // Framing
  '04': 4,   // Exterior Finishes
  '05': 5,   // Roofing
  '06': 6,   // Plumbing
  '07': 7,   // HVAC
  '08': 8,   // Electrical
  '09': 9,   // Insulation
  '10': 10,  // Drywall
  '11': 11,  // Interior Finishes
  '12': 12,  // Painting
  '13': 13,  // Flooring
  '14': 14,  // Cabinets & Countertops
  '15': 15,  // Appliances
  '16': 16,  // Final Finishes
  '17': 17,  // Landscaping
  '18': 18,  // Cleanup / Punch List
  '19': 19,  // Permits & Fees
  '20': 20,  // Contingency
  '99': 99,  // Other / Miscellaneous
}

// NAHB Category Names - maps cost_code prefix to display name
export const NAHB_CATEGORY_NAMES: Record<string, string> = {
  '01': 'Site Work',
  '02': 'Foundation',
  '03': 'Framing',
  '04': 'Exterior Finishes',
  '05': 'Roofing',
  '06': 'Plumbing',
  '07': 'HVAC',
  '08': 'Electrical',
  '09': 'Insulation',
  '10': 'Drywall',
  '11': 'Interior Finishes',
  '12': 'Painting',
  '13': 'Flooring',
  '14': 'Cabinets & Countertops',
  '15': 'Appliances',
  '16': 'Final Finishes',
  '17': 'Landscaping',
  '18': 'Cleanup / Punch List',
  '19': 'Permits & Fees',
  '20': 'Contingency',
  '99': 'Other',
}

/**
 * Get sort order for a category based on cost_code prefix
 * @param costCode - The cost code (e.g., "03-100" or "03")
 * @returns Sort order number (default 50 if not found)
 */
export function getCategoryOrder(costCode: string | null | undefined): number {
  if (!costCode) return 50 // Middle default for uncategorized
  const prefix = costCode.substring(0, 2)
  return NAHB_CATEGORY_ORDER[prefix] ?? 50
}

/**
 * Sort categories by their NAHB cost code order
 * @param categories - Array of category names with optional cost codes
 * @param getCostCode - Function to extract cost code from category object
 * @returns Sorted array
 */
export function sortCategoriesByOrder<T>(
  categories: T[],
  getCostCode: (item: T) => string | null | undefined
): T[] {
  return [...categories].sort((a, b) => {
    const orderA = getCategoryOrder(getCostCode(a))
    const orderB = getCategoryOrder(getCostCode(b))
    return orderA - orderB
  })
}

/**
 * Chart color schemes for consistent styling
 */
export const CHART_COLORS = {
  // Status colors
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  info: 'var(--info)',
  accent: 'var(--accent)',
  
  // Budget utilization thresholds
  underBudget: 'var(--success)',
  nearBudget: 'var(--warning)',
  overBudget: 'var(--error)',
  
  // Categorical palette for charts
  categorical: [
    'var(--accent)',
    'var(--success)',
    'var(--warning)',
    'var(--info)',
    'var(--error)',
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
    '#84cc16', // lime
  ],
}

/**
 * Chart tooltip descriptions for each chart type
 */
export const CHART_TOOLTIPS = {
  // Budget Report Charts
  fundFlow: {
    title: 'Fund Flow',
    description: 'Visualizes money flow from the loan through NAHB construction categories to individual draws. Categories are ordered chronologically by typical construction sequence.',
  },
  categoryUtilization: {
    title: 'Category Utilization',
    description: 'Horizontal bars show budget usage by category. Vertical markers indicate the budgeted amount - bars extending past the marker are over budget.',
    formula: 'Utilization = (Spent / Budget) × 100%',
  },
  spendingVelocity: {
    title: 'Spending Velocity',
    description: 'Compares actual cumulative spending (solid line) against expected linear burn rate (dashed line) based on total budget over a 6-month project timeline.',
    formula: 'Expected Pace = (Total Budget / 180 days) × Days Elapsed',
  },
  
  // Amortization Report Charts
  balanceGrowth: {
    title: 'Balance Growth Over Time',
    description: 'Shows how loan balance grows over time due to compound interest. Principal (draw amounts) forms the base, with interest accruing on the total balance.',
    formula: 'Daily Interest = Total Balance × (Annual Rate / 365)',
  },
  drawTimeline: {
    title: 'Draw Funding Timeline',
    description: 'Bar chart showing the amount and timing of each draw funded. Useful for understanding how principal was built up over time.',
  },
  interestAnalysis: {
    title: 'Interest Analysis',
    description: 'Breakdown of total payoff components: principal (draw amounts), compound interest, finance fee (based on loan month), and document fee.',
  },
  
  // Payoff Report Charts
  feeEscalation: {
    title: 'Fee Escalation Timeline',
    description: 'Shows how the finance fee rate increases over loan term. Months 1-6: base rate, 7-12: escalating rates, 13+: extension fees apply.',
    formula: 'M7-12: 2.25% + (Month - 7) × 0.25%\nM13+: 5.9% + (Month - 13) × 0.4%',
  },
  payoffProjection: {
    title: 'Payoff Projection',
    description: 'Projects how the total payoff amount grows over time as interest accrues daily. Helps visualize the cost of delaying payoff.',
  },
  whatIfComparison: {
    title: 'What-If Comparison',
    description: 'Compare payoff amounts at different future dates. Shows how much more you\'ll pay by waiting - useful for planning optimal payoff timing.',
  },
}

