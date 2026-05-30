// Convert a 2-letter ISO 3166-1 alpha-2 country code to an emoji flag.
// e.g. "GB" → "🇬🇧", "US" → "🇺🇸"
// Returns empty string for null/unknown codes.

const SUBDIVISION_FLAGS: Record<string, string> = {
  // Common subdivisions not covered by the regional indicator approach
  'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'SCT': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'WLS': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

export function countryFlag(code: string | null | undefined): string {
  if (!code) return ''
  const upper = code.toUpperCase()
  if (SUBDIVISION_FLAGS[upper]) return SUBDIVISION_FLAGS[upper]
  if (upper.length !== 2) return ''
  return [...upper]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}
