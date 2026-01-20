import { supabase } from './supabase'
import type { UserPreferences } from '@/types/database'
import { DEFAULT_PREFERENCES } from '@/types/database'

/**
 * Load preferences from database (with defaults for missing keys)
 */
export async function loadPreferences(userId: string): Promise<UserPreferences> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single()

    if (error || !data?.preferences) {
      return DEFAULT_PREFERENCES
    }

    // Merge with defaults (handles missing keys from older records)
    return { ...DEFAULT_PREFERENCES, ...(data.preferences as Partial<UserPreferences>) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/**
 * Save preferences to database
 */
export async function savePreferences(
  userId: string,
  preferences: UserPreferences
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Error saving preferences:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error in savePreferences:', err)
    return false
  }
}

/**
 * Update a single preference
 */
export async function updatePreference<K extends keyof UserPreferences>(
  userId: string,
  key: K,
  value: UserPreferences[K]
): Promise<boolean> {
  const current = await loadPreferences(userId)
  return savePreferences(userId, { ...current, [key]: value })
}

/**
 * Get preferences from localStorage (for immediate UI updates before DB sync)
 */
export function getLocalPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem('td3-preferences')
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Save preferences to localStorage (for immediate UI updates)
 */
export function setLocalPreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem('td3-preferences', JSON.stringify(preferences))
  } catch {
    // Ignore storage errors
  }
}
