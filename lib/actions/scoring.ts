import type { ScoringWeights } from '@/types/arena'

export interface LighthouseScores {
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
}

export async function runLighthouseScore(url: string): Promise<LighthouseScores | null> {
  const apiKey = process.env.PAGESPEED_API_KEY
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ''}`

  try {
    const res = await fetch(endpoint, { cache: 'no-store' })
    if (!res.ok) return null

    const json = await res.json()
    const cats = json?.lighthouseResult?.categories

    if (!cats) return null

    return {
      performance:   Math.round((cats.performance?.score   ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
      seo:           Math.round((cats.seo?.score ?? 0) * 100),
    }
  } catch {
    return null
  }
}

export function calculateSpeedBonus(submittedAt: Date, endsAt: Date, startedAt: Date): number {
  const totalDuration = endsAt.getTime() - startedAt.getTime()
  const timeUsed = submittedAt.getTime() - startedAt.getTime()
  const timeRemainingPct = Math.max(0, (totalDuration - timeUsed) / totalDuration)
  return Math.floor(timeRemainingPct * 10)
}

export function calculateTotalScore(
  scores: LighthouseScores,
  speedBonus: number,
  weights: ScoringWeights,
  deploymentSuccess: boolean
): number {
  if (!deploymentSuccess) return 0

  const deployScore = weights.deployment_success
  const perfScore   = (scores.performance   / 100) * weights.lighthouse_performance
  const a11yScore   = (scores.accessibility / 100) * weights.lighthouse_accessibility
  const bpScore     = (scores.bestPractices / 100) * weights.lighthouse_best_practices
  const seoScore    = (scores.seo           / 100) * weights.lighthouse_seo
  const speedScore  = (speedBonus           / 10)  * weights.speed_bonus

  return Math.round(deployScore + perfScore + a11yScore + bpScore + seoScore + speedScore)
}

export async function checkDeploymentReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}
