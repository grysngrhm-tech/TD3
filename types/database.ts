export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          address: string | null
          loan_amount: number | null
          status: 'active' | 'completed' | 'on_hold'
          // New fields from MVP extensions
          project_code: string | null
          builder_name: string | null
          borrower_name: string | null
          interest_rate_annual: number | null
          loan_start_date: string | null
          loan_term_months: number | null
          origination_fee_pct: number | null
          maturity_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          loan_amount?: number | null
          status?: 'active' | 'completed' | 'on_hold'
          project_code?: string | null
          builder_name?: string | null
          borrower_name?: string | null
          interest_rate_annual?: number | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          origination_fee_pct?: number | null
          maturity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          loan_amount?: number | null
          status?: 'active' | 'completed' | 'on_hold'
          project_code?: string | null
          builder_name?: string | null
          borrower_name?: string | null
          interest_rate_annual?: number | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          origination_fee_pct?: number | null
          maturity_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          project_id: string
          category: string
          description: string | null
          original_amount: number
          current_amount: number
          spent_amount: number
          remaining_amount: number
          sort_order: number
          // New fields for NAHB cost code mapping
          builder_category_raw: string | null
          cost_code: string | null
          nahb_category: string | null
          nahb_subcategory: string | null
          ai_confidence: number | null
          is_change_order: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          category: string
          description?: string | null
          original_amount?: number
          current_amount?: number
          spent_amount?: number
          sort_order?: number
          builder_category_raw?: string | null
          cost_code?: string | null
          nahb_category?: string | null
          nahb_subcategory?: string | null
          ai_confidence?: number | null
          is_change_order?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          category?: string
          description?: string | null
          original_amount?: number
          current_amount?: number
          spent_amount?: number
          sort_order?: number
          builder_category_raw?: string | null
          cost_code?: string | null
          nahb_category?: string | null
          nahb_subcategory?: string | null
          ai_confidence?: number | null
          is_change_order?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      draw_requests: {
        Row: {
          id: string
          project_id: string
          draw_number: number
          request_date: string
          total_amount: number
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          draw_number: number
          request_date?: string
          total_amount?: number
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          draw_number?: number
          request_date?: string
          total_amount?: number
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      draw_request_lines: {
        Row: {
          id: string
          draw_request_id: string
          budget_id: string
          amount_requested: number
          amount_approved: number | null
          notes: string | null
          // New fields for invoice matching
          matched_invoice_amount: number | null
          variance: number | null
          invoice_file_id: string | null
          invoice_file_url: string | null
          invoice_file_name: string | null
          invoice_vendor_name: string | null
          invoice_number: string | null
          invoice_date: string | null
          confidence_score: number | null
          flags: string | null
          created_at: string
        }
        Insert: {
          id?: string
          draw_request_id: string
          budget_id: string
          amount_requested?: number
          amount_approved?: number | null
          notes?: string | null
          matched_invoice_amount?: number | null
          variance?: number | null
          invoice_file_id?: string | null
          invoice_file_url?: string | null
          invoice_file_name?: string | null
          invoice_vendor_name?: string | null
          invoice_number?: string | null
          invoice_date?: string | null
          confidence_score?: number | null
          flags?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          draw_request_id?: string
          budget_id?: string
          amount_requested?: number
          amount_approved?: number | null
          notes?: string | null
          matched_invoice_amount?: number | null
          variance?: number | null
          invoice_file_id?: string | null
          invoice_file_url?: string | null
          invoice_file_name?: string | null
          invoice_vendor_name?: string | null
          invoice_number?: string | null
          invoice_date?: string | null
          confidence_score?: number | null
          flags?: string | null
          created_at?: string
        }
      }
      // New tables from MVP extensions
      nahb_cost_codes: {
        Row: {
          code: string
          category: string
          subcategory: string | null
          parent_code: string | null
          sort_order: number
        }
        Insert: {
          code: string
          category: string
          subcategory?: string | null
          parent_code?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          category?: string
          subcategory?: string | null
          parent_code?: string | null
          sort_order?: number
        }
      }
      invoices: {
        Row: {
          id: string
          draw_request_id: string | null
          draw_request_line_id: string | null
          project_id: string | null
          vendor_name: string
          invoice_number: string | null
          invoice_date: string | null
          amount: number
          file_hash: string | null
          file_path: string | null
          file_url: string | null
          status: 'pending' | 'matched' | 'rejected'
          matched_to_category: string | null
          matched_to_nahb_code: string | null
          confidence_score: number | null
          flags: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          draw_request_id?: string | null
          draw_request_line_id?: string | null
          project_id?: string | null
          vendor_name: string
          invoice_number?: string | null
          invoice_date?: string | null
          amount: number
          file_hash?: string | null
          file_path?: string | null
          file_url?: string | null
          status?: 'pending' | 'matched' | 'rejected'
          matched_to_category?: string | null
          matched_to_nahb_code?: string | null
          confidence_score?: number | null
          flags?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          draw_request_id?: string | null
          draw_request_line_id?: string | null
          project_id?: string | null
          vendor_name?: string
          invoice_number?: string | null
          invoice_date?: string | null
          amount?: number
          file_hash?: string | null
          file_path?: string | null
          file_url?: string | null
          status?: 'pending' | 'matched' | 'rejected'
          matched_to_category?: string | null
          matched_to_nahb_code?: string | null
          confidence_score?: number | null
          flags?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          invoice_id: string | null
          draw_request_id: string | null
          project_id: string | null
          file_name: string
          file_path: string
          file_url: string | null
          file_size: number | null
          mime_type: string | null
          file_hash: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          draw_request_id?: string | null
          project_id?: string | null
          file_name: string
          file_path: string
          file_url?: string | null
          file_size?: number | null
          mime_type?: string | null
          file_hash?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          draw_request_id?: string | null
          project_id?: string | null
          file_name?: string
          file_path?: string
          file_url?: string | null
          file_size?: number | null
          mime_type?: string | null
          file_hash?: string | null
          uploaded_at?: string
        }
      }
      approvals: {
        Row: {
          id: string
          draw_request_id: string | null
          step_number: number
          approved_by: string | null
          decision: 'approved' | 'rejected' | 'pending'
          comments: string | null
          decided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          draw_request_id?: string | null
          step_number?: number
          approved_by?: string | null
          decision?: 'approved' | 'rejected' | 'pending'
          comments?: string | null
          decided_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          draw_request_id?: string | null
          step_number?: number
          approved_by?: string | null
          decision?: 'approved' | 'rejected' | 'pending'
          comments?: string | null
          decided_at?: string | null
          created_at?: string
        }
      }
      audit_events: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          actor: string | null
          old_data: Record<string, unknown> | null
          new_data: Record<string, unknown> | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          actor?: string | null
          old_data?: Record<string, unknown> | null
          new_data?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          actor?: string | null
          old_data?: Record<string, unknown> | null
          new_data?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
      }
    }
  }
}

// Helper types for existing tables
export type Project = Database['public']['Tables']['projects']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type DrawRequest = Database['public']['Tables']['draw_requests']['Row']
export type DrawRequestLine = Database['public']['Tables']['draw_request_lines']['Row']

export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type DrawRequestInsert = Database['public']['Tables']['draw_requests']['Insert']
export type DrawRequestLineInsert = Database['public']['Tables']['draw_request_lines']['Insert']

// Helper types for new tables
export type NahbCostCode = Database['public']['Tables']['nahb_cost_codes']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Approval = Database['public']['Tables']['approvals']['Row']
export type AuditEvent = Database['public']['Tables']['audit_events']['Row']

export type NahbCostCodeInsert = Database['public']['Tables']['nahb_cost_codes']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type ApprovalInsert = Database['public']['Tables']['approvals']['Insert']
export type AuditEventInsert = Database['public']['Tables']['audit_events']['Insert']

// Draw Request with related data (for detail view)
export type DrawRequestWithDetails = DrawRequest & {
  project?: Project
  lines?: (DrawRequestLine & { budget?: Budget })[]
  invoices?: Invoice[]
  documents?: Document[]
  approvals?: Approval[]
  audit_events?: AuditEvent[]
}

// Validation result types
export type ValidationResult = {
  overages: {
    budgetId: string
    category: string
    requested: number
    remaining: number
    overage: number
  }[]
  missingDocs: {
    lineId: string
    category: string
    amount: number
  }[]
  duplicateInvoices: {
    invoiceId: string
    vendor: string
    amount: number
    matchedWith: string
  }[]
  categoryMismatches: {
    lineId: string
    invoiceVendor: string
    budgetCategory: string
  }[]
  flags: string[]
  isValid: boolean
}

// Budget summary for reports
export type BudgetSummary = {
  projectId: string
  projectName: string
  totalOriginal: number
  totalCurrent: number
  totalSpent: number
  totalRemaining: number
  categories: {
    nahbCode: string
    nahbCategory: string
    original: number
    current: number
    spent: number
    remaining: number
    percentComplete: number
  }[]
}
