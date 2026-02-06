import type { Database } from './database'

// ============================================
// CONVENIENCE TYPE ALIASES
// ============================================

export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type Budget = Database["public"]["Tables"]["budgets"]["Row"]
export type DrawRequest = Database["public"]["Tables"]["draw_requests"]["Row"]
export type DrawRequestLine = Database["public"]["Tables"]["draw_request_lines"]["Row"]
export type NahbCostCode = Database["public"]["Tables"]["nahb_cost_codes"]["Row"]
export type NahbCategory = Database["public"]["Tables"]["nahb_categories"]["Row"]
export type NahbSubcategory = Database["public"]["Tables"]["nahb_subcategories"]["Row"]
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Approval = Database["public"]["Tables"]["approvals"]["Row"]
export type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"]
export type Builder = Database["public"]["Tables"]["builders"]["Row"]
export type Lender = Database["public"]["Tables"]["lenders"]["Row"]

export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"]
export type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"]
export type DrawRequestInsert = Database["public"]["Tables"]["draw_requests"]["Insert"]
export type DrawRequestLineInsert = Database["public"]["Tables"]["draw_request_lines"]["Insert"]
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"]
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"]
export type ApprovalInsert = Database["public"]["Tables"]["approvals"]["Insert"]
export type AuditEventInsert = Database["public"]["Tables"]["audit_events"]["Insert"]
export type BuilderInsert = Database["public"]["Tables"]["builders"]["Insert"]
export type BuilderUpdate = Database["public"]["Tables"]["builders"]["Update"]
export type WireBatch = Database["public"]["Tables"]["wire_batches"]["Row"]
export type WireBatchInsert = Database["public"]["Tables"]["wire_batches"]["Insert"]
export type WireBatchUpdate = Database["public"]["Tables"]["wire_batches"]["Update"]

// Draw Request Status Types
export type DrawStatus = 'draft' | 'processing' | 'review' | 'staged' | 'pending_wire' | 'funded' | 'rejected'

export const DRAW_STATUS_LABELS: Record<DrawStatus, string> = {
  draft: 'Draft',
  processing: 'Processing',
  review: 'Ready for Review',
  staged: 'Staged for Funding',
  pending_wire: 'Pending Wire',
  funded: 'Funded',
  rejected: 'Rejected'
}

// Flag types for draw request lines
export type DrawLineFlag = 'AMOUNT_MISMATCH' | 'NO_INVOICE' | 'OVER_BUDGET' | 'LOW_CONFIDENCE' | 'DUPLICATE_INVOICE' | 'NO_BUDGET_MATCH'

export const DRAW_FLAG_LABELS: Record<DrawLineFlag, string> = {
  AMOUNT_MISMATCH: 'Invoice total doesn\'t match requested amount',
  NO_INVOICE: 'No invoice attached',
  OVER_BUDGET: 'Would exceed remaining budget',
  LOW_CONFIDENCE: 'Low confidence in AI match',
  DUPLICATE_INVOICE: 'Invoice already used in previous draw',
  NO_BUDGET_MATCH: 'Category not found in budget'
}

// Validation Types
export type ValidationResult = {
  overages: Array<{
    budgetId: string
    category: string
    requested: number
    remaining: number
    overage: number
  }>
  missingDocs: Array<{
    lineId: string
    category: string
    amount: number
  }>
  duplicateInvoices: Array<{
    invoiceId: string
    vendor: string
    amount: number
    matchedWith: string
  }>
  categoryMismatches: Array<{
    lineId: string
    expected: string
    actual: string
  }>
  flags: string[]
  isValid: boolean
}

// Extended Types with Relations
export type DrawRequestWithDetails = DrawRequest & {
  project?: Project
  invoices?: Invoice[]
  documents?: Document[]
  lines?: DrawRequestLine[]
  wire_batch?: WireBatch | null
}

// Draw request with project and builder info for list views
export type DrawRequestWithProject = DrawRequest & {
  project?: Project & {
    builder?: Builder | null
  }
}

// Wire batch with draws for funding view
export type WireBatchWithDraws = WireBatch & {
  builder?: Builder
  draws?: DrawRequestWithProject[]
}

// Draw request line with budget info for review
export type DrawRequestLineWithBudget = DrawRequestLine & {
  budget?: Budget
  invoices?: Invoice[]
}

// Project with builder relation
export type ProjectWithBuilder = Project & {
  builder?: Builder | null
}

// Lifecycle Stage Types
export type LifecycleStage = 'pending' | 'active' | 'historic'

// Project with computed lifecycle fields
export type ProjectWithLifecycle = Project & {
  lifecycle_stage: LifecycleStage
  stage_changed_at: string | null
  square_footage: number | null
  sales_price: number | null
  appraised_value: number | null
  payoff_date: string | null
  payoff_amount: number | null
  rejection_reason: string | null
  // Computed fields (calculated in app)
  ltv_ratio?: number | null
  cost_per_sqft?: number | null
}

// Project with budget totals for list views
export type ProjectWithBudget = Project & {
  lifecycle_stage: LifecycleStage
  total_budget: number
  total_spent: number
  builder?: Builder | null
  lender?: Lender | null
}

// Document Types for origination
export type DocumentType = 'floorplan' | 'valuation' | 'loan_agreement' | 'insurance' | 'other'

export const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: 'floorplan', label: 'Floor Plans / Construction Drawings' },
  { id: 'valuation', label: 'Valuation Document' },
  { id: 'loan_agreement', label: 'Loan Agreement' },
  { id: 'insurance', label: 'Insurance Certificate' },
  { id: 'other', label: 'Other Documents' },
]

// Default Term Sheet Values
export const DEFAULT_TERM_SHEET = {
  // Interest
  interest_rate_annual: 0.11, // 11%

  // Base Fee & Escalation (Months 1-12)
  origination_fee_pct: 0.02, // 2% base fee
  fee_escalation_pct: 0.0025, // +0.25% per month after escalation starts
  fee_escalation_after_months: 6, // Escalation begins month 7
  fee_rate_at_month_7: 0.0225, // 2.25% starting rate for escalation period

  // Extension Fee (Month 13+)
  extension_fee_month: 13, // Month when extension fee kicks in
  extension_fee_rate: 0.059, // 5.9% at month 13
  post_extension_escalation: 0.004, // +0.4% per month after 13

  // Fixed Fees
  document_fee: 1000, // $1,000

  // Term
  loan_term_months: 12, // 12 months standard term
}

// ============================================
// INVOICE MATCHING TYPES
// ============================================

// Extraction status from n8n workflow
export type ExtractionStatus = 'pending' | 'processing' | 'extracted' | 'extraction_failed'

// Match status after deterministic/AI matching
export type MatchStatus = 'pending' | 'auto_matched' | 'ai_processing' | 'ai_matched' | 'needs_review' | 'manually_matched' | 'no_match'

// Construction trades for AI extraction
export type ConstructionTrade =
  | 'electrical' | 'plumbing' | 'hvac' | 'framing' | 'roofing' | 'flooring'
  | 'foundation' | 'excavation' | 'landscaping' | 'painting' | 'drywall'
  | 'insulation' | 'windows_doors' | 'appliances' | 'fixtures' | 'general' | null

// Work type classification
export type WorkType = 'labor' | 'materials' | 'equipment' | 'mixed'

// Vendor type classification
export type VendorType = 'subcontractor' | 'supplier' | 'utility' | 'professional' | 'unknown'

// Extracted data from n8n AI extraction (stored in invoices.extracted_data)
export interface ExtractedInvoiceData {
  vendorName: string
  invoiceNumber: string | null
  invoiceDate: string | null
  amount: number
  context: string | null        // Semantic description of work
  keywords: string[]            // Normalized keywords for matching
  trade: ConstructionTrade      // Best guess at construction trade
  workType: WorkType            // Labor, materials, equipment, mixed
  vendorType: VendorType        // Subcontractor, supplier, etc.
  projectReference: string | null
  hasLienWaiver: boolean
  confidence: number            // AI's confidence in extraction (0-1)
}

// Extended Invoice type with new matching fields
export interface InvoiceWithMatching extends Invoice {
  extraction_status: ExtractionStatus
  match_status: MatchStatus
  extracted_data: ExtractedInvoiceData | null
  candidate_count: number
  was_manually_corrected: boolean
}

// Match candidate generated by deterministic scoring
export interface MatchCandidate {
  drawLineId: string
  budgetId: string | null
  budgetCategory: string
  nahbCategory: string | null
  amountRequested: number

  // Individual scores (0-1)
  scores: {
    amount: number      // Primary signal (50% weight)
    trade: number       // Trade match (20% weight)
    keywords: number    // Keyword overlap (15% weight)
    training: number    // Learned from past matches (15% weight)
    composite: number   // Weighted combination
  }

  // Factors that contributed to scores
  factors: {
    amountVariance: number          // Percentage difference
    amountVarianceAbsolute: number  // Dollar difference
    tradeMatch: boolean             // Did trade field match category?
    keywordMatches: string[]        // Which keywords matched
    vendorPreviousMatch: boolean    // Has vendor matched this category before?
    trainingReason: string | null   // Why training score was given
  }
}

// Classification result from candidate analysis
export type MatchClassification =
  | 'NO_CANDIDATES'        // No candidates above threshold
  | 'SINGLE_MATCH'         // One clear winner
  | 'MULTIPLE_CANDIDATES'  // Multiple viable candidates (needs AI)
  | 'AMBIGUOUS'            // AI couldn't decide, needs human

export interface MatchClassificationResult {
  status: MatchClassification
  candidates: MatchCandidate[]
  topCandidate: MatchCandidate | null
  confidence: number
  needsAI: boolean
  needsReview: boolean
}

// Decision type for audit trail
export type MatchDecisionType = 'auto_single' | 'ai_selected' | 'manual_override' | 'manual_initial'
export type MatchDecisionSource = 'system' | 'ai' | 'user'

// Invoice match decision (audit trail)
export interface InvoiceMatchDecision {
  id: string
  invoice_id: string
  draw_request_line_id: string | null
  decision_type: MatchDecisionType
  decision_source: MatchDecisionSource
  decided_by: string | null
  decided_at: string
  candidates: MatchCandidate[]
  selected_draw_line_id: string | null
  selected_confidence: number | null
  selection_factors: Record<string, number> | null
  ai_reasoning: string | null
  flags: string[] | null
  previous_draw_line_id: string | null
  correction_reason: string | null
  created_at: string
}

// Training record (created when draw is approved)
export interface InvoiceMatchTraining {
  id: string
  invoice_id: string | null
  draw_request_id: string | null
  approved_at: string
  vendor_name_normalized: string
  amount: number
  context: string | null
  keywords: string[]
  trade: string | null
  work_type: string | null
  budget_category: string
  nahb_category: string | null
  nahb_subcategory: string | null
  match_method: 'auto' | 'ai' | 'manual'
  confidence_at_match: number | null
  was_corrected: boolean
  created_at: string
}

// Vendor category association (learned from training)
export interface VendorCategoryAssociation {
  id: string
  vendor_name_normalized: string
  budget_category: string
  nahb_category: string | null
  match_count: number
  total_amount: number
  last_matched_at: string
}

// Matching thresholds (configurable)
export const MATCHING_THRESHOLDS = {
  AUTO_MATCH_SCORE: 0.85,       // Above this = auto-match
  CLEAR_WINNER_GAP: 0.15,       // Gap needed for single match
  MIN_CANDIDATE_SCORE: 0.35,    // Below = not considered
  AMOUNT_EXACT_TOLERANCE: 50,   // $50 or less = exact match
  AMOUNT_EXACT_PCT: 0.02,       // 2% or less = exact match
}

// Scoring weights
export const MATCHING_WEIGHTS = {
  AMOUNT: 0.50,     // 50% - Primary signal
  TRADE: 0.20,      // 20% - Trade match
  KEYWORDS: 0.15,   // 15% - Keyword overlap
  TRAINING: 0.15,   // 15% - Learned patterns
}

// Draw line flags extended for matching
export type ExtendedDrawLineFlag = DrawLineFlag | 'EXTRACTION_FAILED' | 'AI_SELECTED' | 'NEEDS_REVIEW'

// Callback payload from n8n extraction
export interface ExtractionCallbackPayload {
  invoiceId: string
  n8nExecutionId?: string
  success: boolean
  error?: string
  extractedData?: ExtractedInvoiceData
}

// AI selection request (when multiple candidates)
export interface AISelectionRequest {
  invoice: ExtractedInvoiceData
  candidates: MatchCandidate[]
  maxCandidates?: number
}

// AI selection response
export interface AISelectionResponse {
  selectedDrawLineId: string | null
  confidence: number
  reasoning: string
  flagForReview: boolean
  factors: {
    primary: string
    supporting: string[]
  }
}

// ============================================
// USER PREFERENCES & ACTIVITY TYPES
// ============================================

// User preferences stored in profiles.preferences JSONB
export type Theme = 'light' | 'dark' | 'system'
export type FontSize = 'small' | 'medium' | 'large'
export type DefaultDashboard = 'portfolio' | 'draws'

export interface UserPreferences {
  theme: Theme
  fontSize: FontSize
  reducedMotion: boolean
  defaultDashboard: DefaultDashboard
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  fontSize: 'medium',
  reducedMotion: false,
  defaultDashboard: 'portfolio',
}

// Device types for login tracking
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

// Activity action types
export type ActivityActionType =
  | 'login'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'funded'
  | 'approved'
  | 'rejected'
  | 'staged'
  | 'submitted'
  | 'exported'

// Activity entity types
export type ActivityEntityType =
  | 'project'
  | 'draw_request'
  | 'wire_batch'
  | 'budget'
  | 'builder'
  | 'invoice'
  | 'user'
  | 'allowlist'

// User activity record
export interface UserActivity {
  id: string
  user_id: string
  action_type: ActivityActionType
  entity_type: ActivityEntityType | null
  entity_id: string | null
  entity_label: string | null
  description: string
  url_path: string | null
  // Login metadata (for security auditing)
  ip_address: string | null
  user_agent: string | null
  device_type: DeviceType | null
  browser: string | null
  os: string | null
  location_city: string | null
  location_country: string | null
  // Additional context
  metadata: Record<string, unknown> | null
  created_at: string
}

// Activity with user info for admin view
export interface UserActivityWithUser extends UserActivity {
  profiles?: {
    email: string
    full_name: string | null
  } | null
}

// Activity insert type (for creating new records)
export interface UserActivityInsert {
  user_id: string
  action_type: ActivityActionType
  entity_type?: ActivityEntityType | null
  entity_id?: string | null
  entity_label?: string | null
  description: string
  url_path?: string | null
  ip_address?: string | null
  user_agent?: string | null
  device_type?: DeviceType | null
  browser?: string | null
  os?: string | null
  location_city?: string | null
  location_country?: string | null
  metadata?: Record<string, unknown> | null
}

// Action type labels for display
export const ACTION_TYPE_LABELS: Record<ActivityActionType, string> = {
  login: 'Signed in',
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  funded: 'Funded',
  approved: 'Approved',
  rejected: 'Rejected',
  staged: 'Staged',
  submitted: 'Submitted',
  exported: 'Exported',
}

// Entity type labels for display
export const ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  project: 'Loan',
  draw_request: 'Draw Request',
  wire_batch: 'Wire Batch',
  budget: 'Budget',
  builder: 'Builder',
  invoice: 'Invoice',
  user: 'User',
  allowlist: 'Invited User',
}
