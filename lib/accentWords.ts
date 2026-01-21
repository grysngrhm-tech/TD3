/**
 * Accent Word Rotation for Welcome Page Headlines
 *
 * This module manages the rotating accent words displayed in the Hero and CTA sections.
 *
 * WORD LIST: Edit ACCENT_WORDS array below to change available phrases.
 *
 * RULES:
 * 1. Hero and CTA sections always display DIFFERENT words on the same page view
 * 2. Words are randomly selected on each page load
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
 * Selects two distinct random accent words for Hero and CTA sections.
 *
 * Both words are randomly selected on each call, with the only constraint
 * being that Hero and CTA must display different words.
 *
 * @returns Object containing heroWord and ctaWord
 */
export function selectAccentWords(): AccentWordSelection {
  // Pick random index for Hero
  const heroIndex = Math.floor(Math.random() * ACCENT_WORDS.length)
  const heroWord = ACCENT_WORDS[heroIndex]

  // Pick random index for CTA, ensuring it differs from Hero
  let ctaIndex = Math.floor(Math.random() * (ACCENT_WORDS.length - 1))
  if (ctaIndex >= heroIndex) {
    ctaIndex++ // Skip over the hero index
  }
  const ctaWord = ACCENT_WORDS[ctaIndex]

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
