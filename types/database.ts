export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      allowlist: {
        Row: {
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          notes: string | null
        }
        Insert: {
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          notes?: string | null
        }
        Update: {
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          notes?: string | null
        }
        Relationships: []
      }
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
        Relationships: [
          {
            foreignKeyName: "approvals_draw_request_id_fkey"
            columns: ["draw_request_id"]
            isOneToOne: false
            referencedRelation: "draw_requests"
            referencedColumns: ["id"]
          },
        ]
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
          subcategory_id: string | null
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
          subcategory_id?: string | null
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
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "nahb_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      builders: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_routing_number: string | null
          borrower_name: string | null
          company_name: string
          created_at: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          borrower_name?: string | null
          company_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          borrower_name?: string | null
          company_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
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
        Relationships: [
          {
            foreignKeyName: "documents_draw_request_id_fkey"
            columns: ["draw_request_id"]
            isOneToOne: false
            referencedRelation: "draw_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "draw_request_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_request_lines_draw_request_id_fkey"
            columns: ["draw_request_id"]
            isOneToOne: false
            referencedRelation: "draw_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_requests: {
        Row: {
          created_at: string | null
          draw_number: number
          funded_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          request_date: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          wire_batch_id: string | null
        }
        Insert: {
          created_at?: string | null
          draw_number: number
          funded_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          request_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          wire_batch_id?: string | null
        }
        Update: {
          created_at?: string | null
          draw_number?: number
          funded_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          request_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          wire_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draw_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_requests_wire_batch_id_fkey"
            columns: ["wire_batch_id"]
            isOneToOne: false
            referencedRelation: "wire_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_match_decisions: {
        Row: {
          ai_reasoning: string | null
          candidates: Json
          correction_reason: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision_source: string
          decision_type: string
          draw_request_line_id: string | null
          flags: string[] | null
          id: string
          invoice_id: string | null
          previous_draw_line_id: string | null
          selected_confidence: number | null
          selected_draw_line_id: string | null
          selection_factors: Json | null
        }
        Insert: {
          ai_reasoning?: string | null
          candidates?: Json
          correction_reason?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_source: string
          decision_type: string
          draw_request_line_id?: string | null
          flags?: string[] | null
          id?: string
          invoice_id?: string | null
          previous_draw_line_id?: string | null
          selected_confidence?: number | null
          selected_draw_line_id?: string | null
          selection_factors?: Json | null
        }
        Update: {
          ai_reasoning?: string | null
          candidates?: Json
          correction_reason?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_source?: string
          decision_type?: string
          draw_request_line_id?: string | null
          flags?: string[] | null
          id?: string
          invoice_id?: string | null
          previous_draw_line_id?: string | null
          selected_confidence?: number | null
          selected_draw_line_id?: string | null
          selection_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_match_decisions_draw_request_line_id_fkey"
            columns: ["draw_request_line_id"]
            isOneToOne: false
            referencedRelation: "draw_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_match_decisions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_match_decisions_previous_draw_line_id_fkey"
            columns: ["previous_draw_line_id"]
            isOneToOne: false
            referencedRelation: "draw_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_match_decisions_selected_draw_line_id_fkey"
            columns: ["selected_draw_line_id"]
            isOneToOne: false
            referencedRelation: "draw_request_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_match_training: {
        Row: {
          amount: number
          approved_at: string
          budget_category: string
          confidence_at_match: number | null
          context: string | null
          created_at: string | null
          draw_request_id: string | null
          id: string
          invoice_id: string | null
          keywords: string[]
          match_method: string | null
          nahb_category: string | null
          nahb_subcategory: string | null
          trade: string | null
          vendor_name_normalized: string
          was_corrected: boolean | null
          work_type: string | null
        }
        Insert: {
          amount: number
          approved_at: string
          budget_category: string
          confidence_at_match?: number | null
          context?: string | null
          created_at?: string | null
          draw_request_id?: string | null
          id?: string
          invoice_id?: string | null
          keywords?: string[]
          match_method?: string | null
          nahb_category?: string | null
          nahb_subcategory?: string | null
          trade?: string | null
          vendor_name_normalized: string
          was_corrected?: boolean | null
          work_type?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string
          budget_category?: string
          confidence_at_match?: number | null
          context?: string | null
          created_at?: string | null
          draw_request_id?: string | null
          id?: string
          invoice_id?: string | null
          keywords?: string[]
          match_method?: string | null
          nahb_category?: string | null
          nahb_subcategory?: string | null
          trade?: string | null
          vendor_name_normalized?: string
          was_corrected?: boolean | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_match_training_draw_request_id_fkey"
            columns: ["draw_request_id"]
            isOneToOne: false
            referencedRelation: "draw_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_match_training_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          candidate_count: number | null
          confidence_score: number | null
          created_at: string | null
          draw_request_id: string | null
          draw_request_line_id: string | null
          extracted_data: Json | null
          extraction_status: string | null
          file_hash: string | null
          file_path: string | null
          file_url: string | null
          flags: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          match_status: string | null
          matched_to_category: string | null
          matched_to_nahb_code: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
          vendor_name: string
          was_manually_corrected: boolean | null
        }
        Insert: {
          amount: number
          candidate_count?: number | null
          confidence_score?: number | null
          created_at?: string | null
          draw_request_id?: string | null
          draw_request_line_id?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_url?: string | null
          flags?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          matched_to_category?: string | null
          matched_to_nahb_code?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name: string
          was_manually_corrected?: boolean | null
        }
        Update: {
          amount?: number
          candidate_count?: number | null
          confidence_score?: number | null
          created_at?: string | null
          draw_request_id?: string | null
          draw_request_line_id?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_url?: string | null
          flags?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          matched_to_category?: string | null
          matched_to_nahb_code?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name?: string
          was_manually_corrected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_draw_request_id_fkey"
            columns: ["draw_request_id"]
            isOneToOne: false
            referencedRelation: "draw_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_draw_request_line_id_fkey"
            columns: ["draw_request_line_id"]
            isOneToOne: false
            referencedRelation: "draw_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lenders: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      nahb_categories: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
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
      nahb_subcategories: {
        Row: {
          category_id: string
          code: string
          created_at: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string | null
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "nahb_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "nahb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_login_completed: boolean | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_login_completed?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_login_completed?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          appraised_value: number | null
          borrower_name: string | null
          builder_id: string | null
          created_at: string | null
          id: string
          interest_rate_annual: number | null
          lender_id: string | null
          lifecycle_stage: string | null
          loan_amount: number | null
          loan_docs_recorded: boolean | null
          loan_docs_recorded_at: string | null
          loan_start_date: string | null
          loan_term_months: number | null
          lot_number: string | null
          maturity_date: string | null
          name: string
          origination_fee_pct: number | null
          payoff_amount: number | null
          payoff_approved: boolean | null
          payoff_approved_at: string | null
          payoff_date: string | null
          project_code: string | null
          rejection_reason: string | null
          sales_price: number | null
          square_footage: number | null
          stage_changed_at: string | null
          status: string | null
          subdivision_abbrev: string | null
          subdivision_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          appraised_value?: number | null
          borrower_name?: string | null
          builder_id?: string | null
          created_at?: string | null
          id?: string
          interest_rate_annual?: number | null
          lender_id?: string | null
          lifecycle_stage?: string | null
          loan_amount?: number | null
          loan_docs_recorded?: boolean | null
          loan_docs_recorded_at?: string | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          lot_number?: string | null
          maturity_date?: string | null
          name: string
          origination_fee_pct?: number | null
          payoff_amount?: number | null
          payoff_approved?: boolean | null
          payoff_approved_at?: string | null
          payoff_date?: string | null
          project_code?: string | null
          rejection_reason?: string | null
          sales_price?: number | null
          square_footage?: number | null
          stage_changed_at?: string | null
          status?: string | null
          subdivision_abbrev?: string | null
          subdivision_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          appraised_value?: number | null
          borrower_name?: string | null
          builder_id?: string | null
          created_at?: string | null
          id?: string
          interest_rate_annual?: number | null
          lender_id?: string | null
          lifecycle_stage?: string | null
          loan_amount?: number | null
          loan_docs_recorded?: boolean | null
          loan_docs_recorded_at?: string | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          lot_number?: string | null
          maturity_date?: string | null
          name?: string
          origination_fee_pct?: number | null
          payoff_amount?: number | null
          payoff_approved?: boolean | null
          payoff_approved_at?: string | null
          payoff_date?: string | null
          project_code?: string | null
          rejection_reason?: string | null
          sales_price?: number | null
          square_footage?: number | null
          stage_changed_at?: string | null
          status?: string | null
          subdivision_abbrev?: string | null
          subdivision_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "lenders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action_type: string
          browser: string | null
          created_at: string | null
          description: string
          device_type: string | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          metadata: Json | null
          os: string | null
          url_path: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          browser?: string | null
          created_at?: string | null
          description: string
          device_type?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          metadata?: Json | null
          os?: string | null
          url_path?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          browser?: string | null
          created_at?: string | null
          description?: string
          device_type?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          metadata?: Json | null
          os?: string | null
          url_path?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_code: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_code: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      vendor_category_associations: {
        Row: {
          budget_category: string
          id: string
          last_matched_at: string | null
          match_count: number | null
          nahb_category: string | null
          total_amount: number | null
          vendor_name_normalized: string
        }
        Insert: {
          budget_category: string
          id?: string
          last_matched_at?: string | null
          match_count?: number | null
          nahb_category?: string | null
          total_amount?: number | null
          vendor_name_normalized: string
        }
        Update: {
          budget_category?: string
          id?: string
          last_matched_at?: string | null
          match_count?: number | null
          nahb_category?: string | null
          total_amount?: number | null
          vendor_name_normalized?: string
        }
        Relationships: []
      }
      wire_batches: {
        Row: {
          builder_id: string
          created_at: string | null
          funded_at: string | null
          funded_by: string | null
          id: string
          notes: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number
          wire_reference: string | null
        }
        Insert: {
          builder_id: string
          created_at?: string | null
          funded_at?: string | null
          funded_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount: number
          wire_reference?: string | null
        }
        Update: {
          builder_id?: string
          created_at?: string | null
          funded_at?: string | null
          funded_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number
          wire_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wire_batches_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_permissions: {
        Args: { check_user_id: string }
        Returns: string[]
      }
      get_vendor_training_score: {
        Args: { p_category: string; p_vendor: string }
        Returns: {
          match_count: number
          reason: string
          score: number
        }[]
      }
      has_permission: {
        Args: { check_user_id: string; required_permission: string }
        Returns: boolean
      }
      increment_budget_spent: {
        Args: { p_amount: number; p_budget_id: string }
        Returns: {
          current_amount: number
          new_spent_amount: number
        }[]
      }
      is_allowlisted: { Args: { check_email: string }; Returns: boolean }
      normalize_vendor_name: { Args: { vendor: string }; Returns: string }
      upsert_vendor_association: {
        Args: {
          p_amount: number
          p_category: string
          p_nahb: string
          p_vendor: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
