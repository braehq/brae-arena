// Picks today's challenge deterministically from the pool.
// Same date always returns the same challenge — no cron, no DB column.

export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

// Simple hash: sum of char codes, stable across runtimes
function hashDate(dateStr: string): number {
  return dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

export function pickDailyChallenge<T>(challenges: T[], dateStr: string): T {
  const idx = hashDate(dateStr) % challenges.length
  return challenges[idx]
}

export function formatDailyDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Seconds until midnight UTC
export function secondsUntilReset(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}
