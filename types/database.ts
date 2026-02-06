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
