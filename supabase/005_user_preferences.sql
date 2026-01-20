-- TD3 User Preferences Migration
-- Migration: 005_user_preferences.sql
-- Description: Adds user preferences JSONB column to profiles table

-- ============================================================================
-- PART 1: ADD PREFERENCES COLUMN
-- ============================================================================

-- Add preferences JSONB column to profiles
-- Stores: theme, fontSize, reducedMotion, defaultDashboard
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add index for common preference queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN (preferences);

-- Comment for documentation
COMMENT ON COLUMN profiles.preferences IS 'User UI preferences: theme (light/dark/system), fontSize (small/medium/large), reducedMotion (boolean), defaultDashboard (portfolio/draws)';

-- ============================================================================
-- PART 2: DEFAULT PREFERENCES STRUCTURE (Documentation)
-- ============================================================================
-- The following is the expected structure for the preferences JSONB column:
-- {
--   "theme": "light" | "dark" | "system",
--   "fontSize": "small" | "medium" | "large",
--   "reducedMotion": false | true,
--   "defaultDashboard": "portfolio" | "draws"
-- }
--
-- Default values (applied in application code):
-- {
--   "theme": "light",
--   "fontSize": "medium",
--   "reducedMotion": false,
--   "defaultDashboard": "portfolio"
-- }
