// CSS Golf scorer — character-count golf on top of the css_battle DOM-check gate.
// Test execution runs client-side via runCssBattleTests (lib/css-battle-runner.ts).
// This module owns the authoritative scoring formula shared by client and server.

export interface CssGolfScore {
  testsPassed: number
  testsTotal: number
  charCount: number
  parLength: number | null
  brevityBonus: number
  scoreTotal: number
  allPassed: boolean
}

/**
 * Score a CSS Golf submission.
 * 80 pts for correctness (proportional across test cases).
 * Up to 20 brevity pts, awarded ONLY when ALL tests pass.
 * Brevity = ratio of par to code length, capped at 20. No par → flat 10 pts.
 */
export function scoreCssGolf(
  html: string,
  testsPassed: number,
  testsTotal: number,
  parLength: number | null,
): CssGolfScore {
  const allPassed = testsTotal > 0 && testsPassed === testsTotal
  const testScore = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 80) : 0
  const charCount = html.length

  let brevityBonus = 0
  if (allPassed) {
    if (parLength && parLength > 0) {
      brevityBonus = Math.max(0, Math.min(20, Math.round((parLength / Math.max(1, charCount)) * 20)))
    } else {
      brevityBonus = 10
    }
  }

  return {
    testsPassed,
    testsTotal,
    charCount,
    parLength,
    brevityBonus,
    scoreTotal: testScore + brevityBonus,
    allPassed,
  }
}
