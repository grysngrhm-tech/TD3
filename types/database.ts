export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      approvals: {
        Row: {
          approved_by: string | null
          comments: string | null
          created_at: string | null
          decided_at: string | null
          decision: string | null
          draw_request_id: string | null
          id: string
          step_number: number | null
        }
        Insert: {
          approved_by?: string | null
          comments?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          draw_request_id?: string | null
          id?: string
          step_number?: number | null
        }
        Update: {
          approved_by?: string | null
          comments?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          draw_request_id?: string | null
          id?: string
          step_number?: number | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          ai_confidence: number | null
          builder_category_raw: string | null
          category: string
          cost_code: string | null
          created_at: string | null
          current_amount: number
          description: string | null
          id: string
          is_change_order: boolean | null
          nahb_category: string | null
          nahb_subcategory: string | null
          original_amount: number
          project_id: string | null
          remaining_amount: number | null
          sort_order: number | null
          spent_amount: number
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          builder_category_raw?: string | null
          category: string
          cost_code?: string | null
          created_at?: string | null
          current_amount?: number
          description?: string | null
          id?: string
          is_change_order?: boolean | null
          nahb_category?: string | null
          nahb_subcategory?: string | null
          original_amount?: number
          project_id?: string | null
          remaining_amount?: number | null
          sort_order?: number | null
          spent_amount?: number
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          builder_category_raw?: string | null
          category?: string
          cost_code?: string | null
          created_at?: string | null
          current_amount?: number
          description?: string | null
          id?: string
          is_change_order?: boolean | null
          nahb_category?: string | null
          nahb_subcategory?: string | null
          original_amount?: number
          project_id?: string | null
          remaining_amount?: number | null
          sort_order?: number | null
          spent_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          draw_request_id: string | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_url: string | null
          id: string
          invoice_id: string | null
          mime_type: string | null
          project_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          draw_request_id?: string | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          project_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          draw_request_id?: string | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          project_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      draw_request_lines: {
        Row: {
          amount_approved: number | null
          amount_requested: number
          budget_id: string | null
          confidence_score: number | null
          created_at: string | null
          draw_request_id: string | null
          flags: string | null
          id: string
          invoice_date: string | null
          invoice_file_id: string | null
          invoice_file_name: string | null
          invoice_file_url: string | null
          invoice_number: string | null
          invoice_vendor_name: string | null
          matched_invoice_amount: number | null
          notes: string | null
          variance: number | null
        }
        Insert: {
          amount_approved?: number | null
          amount_requested?: number
          budget_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          draw_request_id?: string | null
          flags?: string | null
          id?: string
          invoice_date?: string | null
          invoice_file_id?: string | null
          invoice_file_name?: string | null
          invoice_file_url?: string | null
          invoice_number?: string | null
          invoice_vendor_name?: string | null
          matched_invoice_amount?: number | null
          notes?: string | null
          variance?: number | null
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number
          budget_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          draw_request_id?: string | null
          flags?: string | null
          id?: string
          invoice_date?: string | null
          invoice_file_id?: string | null
          invoice_file_name?: string | null
          invoice_file_url?: string | null
          invoice_number?: string | null
          invoice_vendor_name?: string | null
          matched_invoice_amount?: number | null
          notes?: string | null
          variance?: number | null
        }
        Relationships: []
      }
      draw_requests: {
        Row: {
          created_at: string | null
          draw_number: number
          id: string
          notes: string | null
          project_id: string | null
          request_date: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          draw_number: number
          id?: string
          notes?: string | null
          project_id?: string | null
          request_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          draw_number?: number
          id?: string
          notes?: string | null
          project_id?: string | null
          request_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          confidence_score: number | null
          created_at: string | null
          draw_request_id: string | null
          draw_request_line_id: string | null
          file_hash: string | null
          file_path: string | null
          file_url: string | null
          flags: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          matched_to_category: string | null
          matched_to_nahb_code: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          confidence_score?: number | null
          created_at?: string | null
          draw_request_id?: string | null
          draw_request_line_id?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_url?: string | null
          flags?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          matched_to_category?: string | null
          matched_to_nahb_code?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          confidence_score?: number | null
          created_at?: string | null
          draw_request_id?: string | null
          draw_request_line_id?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_url?: string | null
          flags?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          matched_to_category?: string | null
          matched_to_nahb_code?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: []
      }
      nahb_cost_codes: {
        Row: {
          category: string
          code: string
          parent_code: string | null
          sort_order: number | null
          subcategory: string | null
        }
        Insert: {
          category: string
          code: string
          parent_code?: string | null
          sort_order?: number | null
          subcategory?: string | null
        }
        Update: {
          category?: string
          code?: string
          parent_code?: string | null
          sort_order?: number | null
          subcategory?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          borrower_name: string | null
          builder_name: string | null
          created_at: string | null
          id: string
          interest_rate_annual: number | null
          loan_amount: number | null
          loan_start_date: string | null
          loan_term_months: number | null
          lot_number: string | null
          maturity_date: string | null
          name: string
          origination_fee_pct: number | null
          project_code: string | null
          status: string | null
          subdivision_abbrev: string | null
          subdivision_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          borrower_name?: string | null
          builder_name?: string | null
          created_at?: string | null
          id?: string
          interest_rate_annual?: number | null
          loan_amount?: number | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          lot_number?: string | null
          maturity_date?: string | null
          name: string
          origination_fee_pct?: number | null
          project_code?: string | null
          status?: string | null
          subdivision_abbrev?: string | null
          subdivision_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          borrower_name?: string | null
          builder_name?: string | null
          created_at?: string | null
          id?: string
          interest_rate_annual?: number | null
          loan_amount?: number | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          lot_number?: string | null
          maturity_date?: string | null
          name?: string
          origination_fee_pct?: number | null
          project_code?: string | null
          status?: string | null
          subdivision_abbrev?: string | null
          subdivision_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Helper type aliases
export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type Budget = Database["public"]["Tables"]["budgets"]["Row"]
export type DrawRequest = Database["public"]["Tables"]["draw_requests"]["Row"]
export type DrawRequestLine = Database["public"]["Tables"]["draw_request_lines"]["Row"]
export type NahbCostCode = Database["public"]["Tables"]["nahb_cost_codes"]["Row"]
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Approval = Database["public"]["Tables"]["approvals"]["Row"]
export type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"]

export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"]
export type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"]
export type DrawRequestInsert = Database["public"]["Tables"]["draw_requests"]["Insert"]
export type DrawRequestLineInsert = Database["public"]["Tables"]["draw_request_lines"]["Insert"]
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"]
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"]
export type ApprovalInsert = Database["public"]["Tables"]["approvals"]["Insert"]
export type AuditEventInsert = Database["public"]["Tables"]["audit_events"]["Insert"]

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
}
