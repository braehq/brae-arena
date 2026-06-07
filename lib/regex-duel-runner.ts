// Regex Duel runner — pure, dependency-free, runs identically on client and server.
// The player writes a regex pattern (+ a subset of flags). It must MATCH every string in
// the "match" corpus and REJECT every string in the "reject" corpus.
//
// Used by:
//   - components/arena/match-room-regex.tsx  (live preview + highlighting, client)
//   - app/api/arena/submit-regex/route.ts    (authoritative scoring, server)

export type RegexExpected = 'match' | 'reject'

export interface RegexCorpusItem {
  label: string
  input: string
  expected: RegexExpected
}

export interface RegexItemResult extends RegexCorpusItem {
  passed: boolean
  /** [start, end) ranges of matches within `input`, for live highlighting */
  ranges: Array<[number, number]>
}

export interface RegexRunResult {
  results: RegexItemResult[]
  passed: number
  total: number
  error: string | null
}

// Only flags that affect *whether* a string matches are user-toggleable.
// (`g`/`y` only affect statefulness and would cause lastIndex foot-guns.)
export const REGEX_FLAGS = ['i', 'm', 's'] as const
export type RegexFlag = (typeof REGEX_FLAGS)[number]

export const REGEX_FLAG_LABELS: Record<RegexFlag, string> = {
  i: 'ignore case',
  m: 'multiline',
  s: 'dotall',
}

/** Normalise a flags string to the allowed, de-duplicated subset. */
export function normaliseFlags(flags: string): string {
  const seen = new Set<string>()
  let out = ''
  for (const ch of flags) {
    if ((REGEX_FLAGS as readonly string[]).includes(ch) && !seen.has(ch)) {
      seen.add(ch)
      out += ch
    }
  }
  return out
}

export function compileRegex(
  pattern: string,
  flags: string,
): { re: RegExp | null; error: string | null } {
  if (pattern.length === 0) return { re: null, error: 'Pattern is empty' }
  try {
    return { re: new RegExp(pattern, normaliseFlags(flags)), error: null }
  } catch (err) {
    return { re: null, error: err instanceof Error ? err.message : String(err) }
  }
}

/** All non-overlapping match ranges within `input` (always global, capped). */
function matchRanges(pattern: string, flags: string, input: string): Array<[number, number]> {
  let re: RegExp
  try {
    re = new RegExp(pattern, normaliseFlags(flags) + 'g')
  } catch {
    return []
  }
  const ranges: Array<[number, number]> = []
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(input)) !== null) {
    if (guard++ > 1000) break
    const start = m.index
    const end = m.index + m[0].length
    ranges.push([start, end])
    // Avoid infinite loops on zero-width matches
    if (m[0].length === 0) re.lastIndex++
  }
  return ranges
}

export function runRegexTests(
  pattern: string,
  flags: string,
  corpus: RegexCorpusItem[],
): RegexRunResult {
  const { re, error } = compileRegex(pattern, flags)
  if (!re) {
    return {
      results: corpus.map((c) => ({ ...c, passed: false, ranges: [] })),
      passed: 0,
      total: corpus.length,
      error,
    }
  }

  const results: RegexItemResult[] = corpus.map((c) => {
    // Fresh, non-global regex for the boolean test (no lastIndex state)
    const testRe = new RegExp(re.source, re.flags.replace(/g/g, ''))
    const matched = testRe.test(c.input)
    const passed = c.expected === 'match' ? matched : !matched
    return { ...c, passed, ranges: matched ? matchRanges(pattern, flags, c.input) : [] }
  })

  return {
    results,
    passed: results.filter((r) => r.passed).length,
    total: corpus.length,
    error: null,
  }
}

export interface RegexScore {
  testsPassed: number
  testsTotal: number
  /** correctness (0-80) + brevity bonus (0-20) */
  scoreTotal: number
  brevityBonus: number
  allPassed: boolean
  error: string | null
}

/**
 * Authoritative score. 80 pts for correctness (proportional), plus up to 20 brevity pts
 * awarded ONLY on a fully-correct pattern. Brevity = how close to (or under) `parLength`
 * the player's pattern is. If no par is known, a perfect pattern gets a flat 10.
 */
export function scoreRegex(
  pattern: string,
  flags: string,
  corpus: RegexCorpusItem[],
  parLength: number | null,
): RegexScore {
  const run = runRegexTests(pattern, flags, corpus)
  const testScore = run.total > 0 ? Math.round((run.passed / run.total) * 80) : 0
  const allPassed = run.total > 0 && run.passed === run.total

  let brevityBonus = 0
  if (allPassed) {
    if (parLength && parLength > 0) {
      const len = Math.max(1, pattern.length)
      brevityBonus = Math.max(0, Math.min(20, Math.round((parLength / len) * 20)))
    } else {
      brevityBonus = 10
    }
  }

  return {
    testsPassed: run.passed,
    testsTotal: run.total,
    scoreTotal: testScore + brevityBonus,
    brevityBonus,
    allPassed,
    error: run.error,
  }
}
