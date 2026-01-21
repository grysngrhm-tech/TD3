/**
 * React Hook for Accent Word Selection
 *
 * Provides stable accent words for Hero and CTA sections that:
 * - Don't cause hydration mismatch (SSR-safe with useEffect)
 * - Remain stable throughout the page view (no re-randomizing)
 * - Persist last-used word to localStorage for cross-visit variation
 */

import { useState, useEffect } from 'react'
import {
  type AccentWordSelection,
  getDefaultAccentWords,
  selectAccentWords,
} from '@/lib/accentWords'

/**
 * Hook that returns stable accent words for the welcome page.
 *
 * STABILITY GUARANTEE:
 * Words are selected once on mount and never change during the session.
 * This prevents any visual flickering or re-randomization on re-render.
 *
 * SSR HANDLING:
 * Returns default words during SSR/initial render, then updates on client.
 * The useEffect ensures hydration completes before randomization.
 *
 * @returns Object with heroWord and ctaWord strings
 */
export function useAccentWords(): AccentWordSelection {
  // Start with defaults for SSR compatibility
  const [words, setWords] = useState<AccentWordSelection>(getDefaultAccentWords)

  useEffect(() => {
    // Select words once on client mount
    // This runs only once due to empty dependency array
    setWords(selectAccentWords())
  }, [])

  return words
}

export type { AccentWordSelection }
