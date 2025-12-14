/**
 * Project Code Generation Utility
 * 
 * Generates unique project codes based on subdivision name and lot number.
 * Examples:
 *   - "Discovery West" + "244" → "DW-244"
 *   - "Talline" + "56" → "TL-56"
 *   - "Oak Hills Estates" + "12" → "OHE-12"
 */

/**
 * Generate a project code from subdivision name and lot number
 * @param subdivision - The subdivision name (e.g., "Discovery West")
 * @param lotNumber - The lot number (e.g., "244")
 * @returns The generated project code (e.g., "DW-244") or empty string if inputs are missing
 */
export function generateProjectCode(subdivision: string, lotNumber: string): string {
  if (!subdivision || !lotNumber) return ''
  
  // Clean the lot number (remove any non-alphanumeric characters except dash)
  const cleanLot = lotNumber.trim().replace(/[^a-zA-Z0-9-]/g, '')
  if (!cleanLot) return ''
  
  // Extract initials from subdivision name
  // "Discovery West" → "DW", "Talline" → "TL", "Oak Hills Estates" → "OHE"
  const abbrev = subdivision
    .trim()
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase())
    .filter(Boolean)
    .join('')
  
  if (!abbrev) return ''
  
  return `${abbrev}-${cleanLot}`
}

/**
 * Parse a project code back into subdivision abbreviation and lot number
 * @param projectCode - The project code (e.g., "DW-244")
 * @returns Object with abbreviation and lot number, or null if invalid
 */
export function parseProjectCode(projectCode: string): { abbrev: string; lotNumber: string } | null {
  if (!projectCode) return null
  
  const parts = projectCode.split('-')
  if (parts.length < 2) return null
  
  const abbrev = parts[0]
  const lotNumber = parts.slice(1).join('-') // Handle lot numbers with dashes
  
  if (!abbrev || !lotNumber) return null
  
  return { abbrev, lotNumber }
}
