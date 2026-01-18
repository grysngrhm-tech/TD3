-- TD3 Invoice Matching Architecture
-- Migration for self-improving invoice matching system
-- Run this after 001_schema.sql

-- ============================================
-- MODIFY INVOICES TABLE
-- Add new columns for extraction and matching status
-- ============================================

-- Extraction status tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS extraction_status TEXT
    DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'extracted', 'extraction_failed'));

-- Match status tracking (separate from old status column)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS match_status TEXT
    DEFAULT 'pending'
    CHECK (match_status IN ('pending', 'auto_matched', 'ai_matched', 'needs_review', 'manually_matched', 'no_match'));

-- Store full extraction result from n8n
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Track how many candidates were considered
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS candidate_count INTEGER DEFAULT 0;

-- Track if this invoice was manually corrected after auto/AI match
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS was_manually_corrected BOOLEAN DEFAULT FALSE;

-- Index for querying by match status
CREATE INDEX IF NOT EXISTS idx_invoices_match_status ON invoices(match_status);
CREATE INDEX IF NOT EXISTS idx_invoices_extraction_status ON invoices(extraction_status);

-- ============================================
-- INVOICE MATCH DECISIONS TABLE
-- Audit trail for every match decision
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_match_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    draw_request_line_id UUID REFERENCES draw_request_lines(id) ON DELETE SET NULL,

    -- Decision metadata
    decision_type TEXT NOT NULL CHECK (decision_type IN (
        'auto_single',      -- Automatic: single clear match
        'ai_selected',      -- AI chose from multiple candidates
        'manual_override',  -- Human corrected AI/auto decision
        'manual_initial'    -- Human matched when no auto match occurred
    )),
    decision_source TEXT NOT NULL CHECK (decision_source IN ('system', 'ai', 'user')),
    decided_by TEXT,  -- User identifier for manual decisions
    decided_at TIMESTAMPTZ DEFAULT NOW(),

    -- Candidates that were considered (JSON array of candidate objects)
    candidates JSONB NOT NULL DEFAULT '[]',

    -- The selected match
    selected_draw_line_id UUID REFERENCES draw_request_lines(id) ON DELETE SET NULL,
    selected_confidence DECIMAL(3,2),

    -- Reasoning (structured)
    selection_factors JSONB,  -- { amount_score, trade_score, keyword_score, training_score }
    ai_reasoning TEXT,        -- If AI selected, the explanation

    -- Flags generated
    flags TEXT[],

    -- Previous match (for corrections)
    previous_draw_line_id UUID REFERENCES draw_request_lines(id) ON DELETE SET NULL,
    correction_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying decisions
CREATE INDEX IF NOT EXISTS idx_match_decisions_invoice ON invoice_match_decisions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_match_decisions_line ON invoice_match_decisions(draw_request_line_id);
CREATE INDEX IF NOT EXISTS idx_match_decisions_type ON invoice_match_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_match_decisions_created ON invoice_match_decisions(created_at DESC);

-- ============================================
-- INVOICE MATCH TRAINING TABLE
-- Training data from approved draws
-- The core of the self-improving system
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_match_training (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Source info
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    draw_request_id UUID REFERENCES draw_requests(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NOT NULL,

    -- Invoice extraction data (preserved for future matching)
    vendor_name_normalized TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    context TEXT,                       -- Semantic description from AI
    keywords TEXT[] NOT NULL DEFAULT '{}',  -- Normalized keywords
    trade TEXT,                         -- Extracted trade signal
    work_type TEXT,

    -- What it matched to (ground truth from approval)
    budget_category TEXT NOT NULL,
    nahb_category TEXT,
    nahb_subcategory TEXT,

    -- Match metadata
    match_method TEXT CHECK (match_method IN ('auto', 'ai', 'manual')),
    confidence_at_match DECIMAL(3,2),
    was_corrected BOOLEAN DEFAULT FALSE,  -- True if user changed AI/auto match

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying during matching
CREATE INDEX IF NOT EXISTS idx_training_vendor ON invoice_match_training(vendor_name_normalized);
CREATE INDEX IF NOT EXISTS idx_training_keywords ON invoice_match_training USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_training_category ON invoice_match_training(budget_category);
CREATE INDEX IF NOT EXISTS idx_training_trade ON invoice_match_training(trade);
CREATE INDEX IF NOT EXISTS idx_training_amount ON invoice_match_training(amount);
CREATE INDEX IF NOT EXISTS idx_training_approved ON invoice_match_training(approved_at DESC);

-- ============================================
-- VENDOR CATEGORY ASSOCIATIONS TABLE
-- Aggregated vendor->category mappings
-- Derived from training data for fast lookups
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_category_associations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_name_normalized TEXT NOT NULL,
    budget_category TEXT NOT NULL,
    nahb_category TEXT,
    match_count INTEGER DEFAULT 1,
    total_amount DECIMAL(15,2) DEFAULT 0,  -- Running total for this vendor->category
    last_matched_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(vendor_name_normalized, budget_category)
);

CREATE INDEX IF NOT EXISTS idx_vendor_assoc_vendor ON vendor_category_associations(vendor_name_normalized);
CREATE INDEX IF NOT EXISTS idx_vendor_assoc_category ON vendor_category_associations(budget_category);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to upsert vendor associations (called when draws are approved)
CREATE OR REPLACE FUNCTION upsert_vendor_association(
    p_vendor TEXT,
    p_category TEXT,
    p_nahb TEXT,
    p_amount DECIMAL
) RETURNS void AS $$
BEGIN
    INSERT INTO vendor_category_associations
        (id, vendor_name_normalized, budget_category, nahb_category, match_count, total_amount, last_matched_at)
    VALUES
        (gen_random_uuid(), p_vendor, p_category, p_nahb, 1, p_amount, NOW())
    ON CONFLICT (vendor_name_normalized, budget_category)
    DO UPDATE SET
        match_count = vendor_category_associations.match_count + 1,
        total_amount = vendor_category_associations.total_amount + p_amount,
        nahb_category = COALESCE(p_nahb, vendor_category_associations.nahb_category),
        last_matched_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to normalize vendor names for consistent matching
CREATE OR REPLACE FUNCTION normalize_vendor_name(vendor TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(TRIM(
        REGEXP_REPLACE(
            REGEXP_REPLACE(vendor, '\s+(LLC|Inc|Corp|Co|Ltd|LP|LLP)\.?$', '', 'i'),
            '\s+', ' ', 'g'
        )
    ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get training boost for a vendor/category combination
CREATE OR REPLACE FUNCTION get_vendor_training_score(
    p_vendor TEXT,
    p_category TEXT
) RETURNS TABLE(score DECIMAL, match_count INTEGER, reason TEXT) AS $$
DECLARE
    v_normalized TEXT;
    v_match_count INTEGER;
BEGIN
    v_normalized := normalize_vendor_name(p_vendor);

    SELECT vca.match_count INTO v_match_count
    FROM vendor_category_associations vca
    WHERE vca.vendor_name_normalized = v_normalized
    AND vca.budget_category = p_category;

    IF v_match_count IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL, 0, 'No vendor history'::TEXT;
    ELSIF v_match_count >= 5 THEN
        RETURN QUERY SELECT 0.9::DECIMAL, v_match_count,
            format('%s matched to %s %s times', p_vendor, p_category, v_match_count);
    ELSIF v_match_count >= 3 THEN
        RETURN QUERY SELECT 0.7::DECIMAL, v_match_count,
            format('%s matched to %s %s times', p_vendor, p_category, v_match_count);
    ELSE
        RETURN QUERY SELECT 0.4::DECIMAL, v_match_count,
            format('%s matched to %s %s times', p_vendor, p_category, v_match_count);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE invoice_match_decisions IS 'Audit trail for every invoice match decision (auto, AI, or manual)';
COMMENT ON TABLE invoice_match_training IS 'Training data from approved draws - the system learns from every approval';
COMMENT ON TABLE vendor_category_associations IS 'Aggregated vendor->category mappings for fast lookup during matching';

COMMENT ON COLUMN invoices.extraction_status IS 'Status of AI extraction: pending, processing, extracted, extraction_failed';
COMMENT ON COLUMN invoices.match_status IS 'Status of matching: pending, auto_matched, ai_matched, needs_review, manually_matched, no_match';
COMMENT ON COLUMN invoices.extracted_data IS 'Full extraction result from n8n including context, keywords, trade, etc.';
COMMENT ON COLUMN invoices.was_manually_corrected IS 'True if user changed an auto or AI match';

COMMENT ON COLUMN invoice_match_training.context IS 'Semantic description of invoice content from AI extraction';
COMMENT ON COLUMN invoice_match_training.keywords IS 'Normalized keywords extracted from invoice for fuzzy matching';
COMMENT ON COLUMN invoice_match_training.trade IS 'Construction trade signal (electrical, plumbing, etc.)';
COMMENT ON COLUMN invoice_match_training.was_corrected IS 'True if this match was manually corrected before approval';
