import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RankBadge } from '@/components/arena/rank-badge'
import { cn } from '@/lib/utils'

const MATCH_FLOW = [
  { step: '01', title: 'Join the Queue', desc: 'Pick Ranked or Casual, select a game type. We find you an opponent at your ELO.' },
  { step: '02', title: 'Challenge Revealed', desc: 'Both players see the same brief at the same moment. Timer starts. Build.' },
  { step: '03', title: 'Build & Deploy', desc: 'Build on your own machine, deploy wherever you want — Vercel, Netlify, Railway.' },
  { step: '04', title: 'Submit Your URL', desc: 'Paste your live URL before the clock hits zero. Late submissions forfeit.' },
  { step: '05', title: 'Automated Scoring', desc: 'Lighthouse runs against both URLs. Performance, Accessibility, SEO, and speed bonus.' },
  { step: '06', title: 'ELO Updated', desc: "Results screen shows scores side-by-side. ELO shifts. Streak tracked. Rematch?" },
]

const GAME_TYPES = [
  {
    type: 'Speed Build',
    icon: '⚡',
    desc: 'Same prompt, same clock. Build and deploy the best solution fastest.',
    color: '#6366f1',
  },
  {
    type: 'Clone Battle',
    icon: '🎯',
    desc: 'Recreate a given UI as accurately as possible. Pixel-perfect wins.',
    color: '#22c55e',
  },
  {
    type: 'Bug Hunt',
    icon: '🐛',
    desc: 'Fix a broken project. Tests and Lighthouse determine who patched it best.',
    color: '#f59e0b',
  },
]

const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'mythic'] as const

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="arena-grid relative flex flex-col items-center justify-center px-4 pt-32 pb-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
            Phase 1 · MVP · Now Open
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Build battles.<br />
            <span className="text-primary">Real stakes.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            1v1 competitive development. Queue up, get a timed challenge, deploy your solution,
            and let Lighthouse decide who built it better. Climb from Bronze to Mythic.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}>
              Start playing free
            </Link>
            <Link href="/leaderboard" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}>
              View leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Game modes */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          Game Modes
        </h2>
        <p className="mb-12 text-center text-3xl font-bold text-foreground">Three ways to compete</p>
        <div className="grid gap-4 md:grid-cols-3">
          {GAME_TYPES.map(({ type, icon, desc, color }) => (
            <div
              key={type}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                style={{ background: color + '15' }}>
                {icon}
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{type}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Match Flow
          </h2>
          <p className="mb-12 text-center text-3xl font-bold text-foreground">How a match works</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MATCH_FLOW.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <span className="mt-0.5 shrink-0 font-mono text-sm font-bold text-primary/60">{step}</span>
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rank tiers */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          Ranking System
        </h2>
        <p className="mb-4 text-center text-3xl font-bold text-foreground">Six tiers. One ladder.</p>
        <p className="mb-12 text-center text-muted-foreground">
          Win ranked matches to gain ELO. Lose to drop. Every match counts.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {TIERS.map(tier => (
            <RankBadge key={tier} tier={tier} elo={undefined} size="lg" showElo={false} />
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Starting ELO: 1,000 · Bronze starts at 0 · Mythic: 2,400+
        </p>
      </section>

      {/* Scoring */}
      <section className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Scoring
          </h2>
          <p className="mb-12 text-center text-3xl font-bold text-foreground">Objective. Automatic. Fast.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Deployment', points: '30 pts', desc: 'URL must return 200 before anything else counts.' },
              { label: 'Performance', points: '20 pts', desc: 'Lighthouse mobile performance score.' },
              { label: 'Accessibility', points: '15 pts', desc: 'WCAG compliance via Lighthouse.' },
              { label: 'Best Practices', points: '15 pts', desc: 'Security, HTTPS, no deprecated APIs.' },
              { label: 'SEO', points: '10 pts', desc: 'Meta tags, structured data, crawlability.' },
              { label: 'Speed Bonus', points: '10 pts', desc: 'Submit early to earn up to 10 bonus points.' },
            ].map(({ label, points, desc }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs font-bold text-primary">{points}</span>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center px-4 py-24 text-center">
        <h2 className="mb-4 text-4xl font-bold text-foreground">Ready to compete?</h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          Free to play. No subscription. Just build better than the person in front of you.
        </p>
        <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
          Create your account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>
            Brae Arena · Part of the{' '}
            <a href="https://braehq.co" className="text-foreground hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">
              BRAE ecosystem
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
