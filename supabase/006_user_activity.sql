-- TD3 User Activity Migration
-- Migration: 006_user_activity.sql
-- Description: Creates user activity tracking table for logins and entity mutations

-- ============================================================================
-- PART 1: CREATE USER ACTIVITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action classification
  action_type TEXT NOT NULL,  -- 'login' | 'created' | 'updated' | 'deleted' | 'funded' | 'approved' | 'staged' | 'exported' etc.

  -- Entity reference (nullable for login events)
  entity_type TEXT,           -- 'project' | 'draw_request' | 'wire_batch' | 'budget' | 'builder' | 'invoice' | 'user' | 'allowlist'
  entity_id UUID,
  entity_label TEXT,          -- Denormalized: "Draw #3 - 123 Main St"

  -- Human-readable
  description TEXT NOT NULL,  -- "Funded draw request for $15,000"
  url_path TEXT,              -- "/draws/abc-123" (clickable link)

  -- Login metadata (for security auditing)
  ip_address TEXT,            -- Client IP address
  user_agent TEXT,            -- Browser/device user agent string
  device_type TEXT,           -- 'desktop' | 'mobile' | 'tablet' (parsed from UA)
  browser TEXT,               -- 'Chrome' | 'Safari' | 'Firefox' etc. (parsed from UA)
  os TEXT,                    -- 'Windows' | 'macOS' | 'iOS' | 'Android' etc.
  location_city TEXT,         -- City from IP geolocation (if available)
  location_country TEXT,      -- Country from IP geolocation

  -- Additional context
  metadata JSONB,             -- Extra context: { amount: 15000, previous_status: 'staged' }

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- User activity queries (most common: "show my recent activity")
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON user_activity (user_id, created_at DESC);

-- Global activity feed (admin view)
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity (created_at DESC);

-- Filter by action type
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity (action_type);

-- Entity lookup (e.g., "show all activity for this project")
CREATE INDEX IF NOT EXISTS idx_user_activity_entity ON user_activity (entity_type, entity_id);

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Users can read their own activity
CREATE POLICY "user_activity_select_own" ON user_activity
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all activity
CREATE POLICY "user_activity_select_admin" ON user_activity
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- Any authenticated user can insert their own activity records
CREATE POLICY "user_activity_insert" ON user_activity
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS for API routes (automatic in Supabase)

-- ============================================================================
-- PART 4: COMMENTS
-- ============================================================================

COMMENT ON TABLE user_activity IS 'User activity log for logins and entity mutations. Supports security auditing and activity feeds.';
COMMENT ON COLUMN user_activity.action_type IS 'Type of action: login, created, updated, deleted, funded, approved, rejected, staged, submitted, exported';
COMMENT ON COLUMN user_activity.entity_type IS 'Type of entity affected: project, draw_request, wire_batch, budget, builder, invoice, user, allowlist';
COMMENT ON COLUMN user_activity.entity_label IS 'Human-readable label for the entity, denormalized for display without joins';
COMMENT ON COLUMN user_activity.metadata IS 'Additional context as JSON, e.g. { amount: 15000, previous_status: "staged" }';
