/**
 * Accent Word Rotation for Welcome Page Headlines
 *
 * This module manages the rotating accent words displayed in the Hero and CTA sections.
 *
 * WORD LIST: Edit ACCENT_WORDS array below to change available phrases.
 *
 * RULES:
 * 1. Hero and CTA sections always display DIFFERENT words on the same page view
 * 2. Primary word (Hero) differs from last visit's word (stored in localStorage)
 * 3. Words remain stable during a page view (no re-randomizing on re-render)
 */

// ============================================================
// ACCENT WORD LIST - Edit this array to change available words
// These appear after "Construction Finance." in accent color
// ============================================================
export const ACCENT_WORDS = [
  'Refined',
  'Clearly Organized',
  'Structured',
  'Streamlined',
  'Unified',
  'Centralized',
  'Simplified',
  'Made Clear',
  'Transparent',
  'Fully Visible',
  'Clearly Defined',
  'Improved',
  'Modernized',
  'Redefined',
  'Reimagined',
  'Made Better',
  'Elevated',
  'Upgraded',
  'Disciplined',
  'Systematized',
  'Under Control',
  'Thoughtfully Designed',
  'Automated',
  'Made Reliable',
  'Built for Scale',
] as const

export type AccentWord = typeof ACCENT_WORDS[number]

// localStorage key for persisting last-used word
const STORAGE_KEY = 'td3-accent-word-last'

/**
 * Gets the last-used accent word from localStorage.
 * Returns null if not found or on server-side.
 */
function getLastUsedWord(): AccentWord | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && ACCENT_WORDS.includes(stored as AccentWord)) {
      return stored as AccentWord
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }

  return null
}

/**
 * Stores the primary word as last-used in localStorage.
 */
function setLastUsedWord(word: AccentWord): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, word)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Selects a random word from the list, optionally excluding certain words.
 */
function selectRandomWord(exclude: AccentWord[] = []): AccentWord {
  const available = ACCENT_WORDS.filter(word => !exclude.includes(word))

  // Fallback to full list if all words are excluded (shouldn't happen with 25 words)
  const pool = available.length > 0 ? available : ACCENT_WORDS

  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}

/**
 * Selection result containing words for both Hero and CTA sections.
 */
export interface AccentWordSelection {
  /** Word for Hero section (top of page) */
  heroWord: AccentWord
  /** Word for CTA section (bottom of page) */
  ctaWord: AccentWord
}

/**
 * Selects two distinct accent words for Hero and CTA sections.
 *
 * SELECTION LOGIC:
 * 1. Get last-used word from localStorage (if any)
 * 2. Select Hero word: random, but different from last-used if possible
 * 3. Select CTA word: random, but different from Hero word
 * 4. Store Hero word as new last-used word
 *
 * This ensures:
 * - Hero and CTA never show the same word on a page view
 * - Consecutive visits show different Hero words
 * - Selection is deterministic per call (call once, use the result)
 *
 * @returns Object containing heroWord and ctaWord
 */
export function selectAccentWords(): AccentWordSelection {
  const lastUsed = getLastUsedWord()

  // Select Hero word: different from last-used if possible
  const heroWord = selectRandomWord(lastUsed ? [lastUsed] : [])

  // Select CTA word: different from Hero word
  const ctaWord = selectRandomWord([heroWord])

  // Persist Hero word for next visit
  setLastUsedWord(heroWord)

  return { heroWord, ctaWord }
}

/**
 * Server-safe selection that returns default words.
 * Use this for SSR/initial render to avoid hydration mismatch.
 */
export function getDefaultAccentWords(): AccentWordSelection {
  return {
    heroWord: 'Refined',
    ctaWord: 'Clearly Organized',
  }
}
