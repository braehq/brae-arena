// Convert a 2-letter ISO 3166-1 alpha-2 country code to an emoji flag.
// e.g. "GB" → "🇬🇧", "US" → "🇺🇸"
// Returns empty string for null/unknown codes.

// Tag-sequence flags for GB subdivisions (stored as "GB-SCT" etc. by the Site)
function mkTag(...chars: number[]) {
  return chars.map(c => String.fromCodePoint(c)).join('') + String.fromCodePoint(0xE007F)
}

const SUBDIVISION_FLAGS: Record<string, string> = {
  // Short codes (legacy / fallback)
  'ENG': mkTag(0xE0067, 0xE0062, 0xE0065, 0xE006E, 0xE0067),
  'SCT': mkTag(0xE0067, 0xE0062, 0xE0073, 0xE0063, 0xE0074),
  'WLS': mkTag(0xE0067, 0xE0062, 0xE0077, 0xE006C, 0xE0073),
  // Full codes as stored by braehq.co CountrySelect
  'GB-ENG': mkTag(0xE0067, 0xE0062, 0xE0065, 0xE006E, 0xE0067),
  'GB-SCT': mkTag(0xE0067, 0xE0062, 0xE0073, 0xE0063, 0xE0074),
  'GB-WLS': mkTag(0xE0067, 0xE0062, 0xE0077, 0xE006C, 0xE0073),
}

export function countryFlag(code: string | null | undefined): string {
  if (!code) return ''
  const upper = code.toUpperCase()
  // Check subdivision map first (covers GB-SCT, GB-ENG, GB-WLS etc.)
  if (SUBDIVISION_FLAGS[upper]) return SUBDIVISION_FLAGS[upper]
  // Standard 2-letter ISO 3166-1 alpha-2 → regional indicator emoji
  if (upper.length !== 2) return ''
  return [...upper]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}
