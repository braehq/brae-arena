import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { RankBadge } from '@/components/arena/rank-badge'
import { RANK_TIERS } from '@/types/arena'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'ELO System — Brae Arena' }

const tiers = Object.entries(RANK_TIERS) as [RankTier, typeof RANK_TIERS[RankTier]][]

export default function EloPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14">
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">

          {/* Hero */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">How ELO Works</h1>
            <p className="mt-2 text-muted-foreground">
              Brae Arena uses a standard ELO rating system — the same model used in chess and competitive gaming.
              Every player starts at <strong className="text-foreground">1,000 ELO</strong>. Win matches to climb. Lose to fall.
              Your rank tier updates instantly.
            </p>
          </div>

          {/* Starting ELO */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Starting ELO</h2>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black text-primary tabular-nums">1,000</div>
              <div className="text-sm text-muted-foreground">
                <p>Every new account starts at exactly 1,000 ELO.</p>
                <p className="mt-1">This keeps you visible on the leaderboard from day one and gives you room to climb or fall without hitting zero.</p>
              </div>
            </div>
          </section>

          {/* Rank Tiers */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Rank Tiers</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">ELO Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tiers.map(([tier, data]) => (
                    <tr key={tier} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <RankBadge tier={tier} size="sm" />
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">
                        {data.min.toLocaleString()} – {data.max === Infinity ? '∞' : data.max.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                        {tier === 'bronze' && 'Starting tier. All new players begin here.'}
                        {tier === 'silver' && 'First promotion. You\'ve proven you can compete.'}
                        {tier === 'gold' && 'Skilled player. Consistent performance required.'}
                        {tier === 'platinum' && 'High-level play. Top 10–15% of active players.'}
                        {tier === 'diamond' && 'Elite. Very few reach here.'}
                        {tier === 'mythic' && 'Legendary. The very best on the platform.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* K-factor */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">K-Factor (How much ELO moves per match)</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              The K-factor controls how much a single match can change your ELO. New players have a higher K-factor so they find their true level faster. Experienced players move more slowly — your rating is more accurate and harder to swing.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'New Players', range: '0 – 29 matches', k: 32, desc: 'Fast calibration' },
                { label: 'Intermediate', range: '30 – 99 matches', k: 24, desc: 'Settling in' },
                { label: 'Veteran', range: '100+ matches', k: 16, desc: 'Stable, accurate' },
              ].map(({ label, range, k, desc }) => (
                <div key={k} className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <p className="text-2xl font-black text-primary">K={k}</p>
                  <p className="text-xs font-semibold text-foreground mt-1">{label}</p>
                  <p className="text-xs text-muted-foreground">{range}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Formula */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">The Formula</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/50 px-4 py-3 font-mono text-sm text-foreground">
                <p>Expected score: <span className="text-primary">E = 1 / (1 + 10^((opponent_elo − your_elo) / 400))</span></p>
                <p className="mt-2">New ELO: <span className="text-primary">new_elo = old_elo + K × (result − E)</span></p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <p className="text-2xl font-black text-green-400">1</p>
                  <p className="text-xs text-green-400 font-semibold">Win</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-2xl font-black text-muted-foreground">0.5</p>
                  <p className="text-xs text-muted-foreground font-semibold">Draw</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-2xl font-black text-destructive">0</p>
                  <p className="text-xs text-destructive font-semibold">Loss</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Example:</strong> You&apos;re at 1,000 ELO and beat a 1,200 ELO opponent (K=32).
                Expected score = 1/(1+10^(200/400)) = 0.24.
                ELO change = 32 × (1 − 0.24) = <span className="text-green-400">+24 ELO</span>. Beating stronger opponents pays more.
              </p>
            </div>
          </section>

          {/* XP awards */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">XP Awards</h2>
            <p className="mb-4 text-sm text-muted-foreground">XP is separate from ELO and shared across the entire Brae platform. Arena XP adds to your global Brae XP total.</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['Match completed (any result)', '+25'],
                    ['Casual win', '+50'],
                    ['Ranked win', '+100'],
                    ['Perfect Lighthouse score (100)', '+200'],
                    ['Rank tier promotion', '+500'],
                    ['Win streak ×3', '+150'],
                    ['Win streak ×5', '+300'],
                    ['Win streak ×10', '+750'],
                  ].map(([event, xp]) => (
                    <tr key={event} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">{event}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary">{xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Casual vs Ranked */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Ranked vs Casual</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <p className="font-semibold text-primary mb-2">Ranked</p>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>✓ ELO changes after every match</li>
                  <li>✓ Counts toward seasonal standings</li>
                  <li>✓ Higher XP for wins</li>
                  <li>✓ Rank tier can promote or demote</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="font-semibold text-foreground mb-2">Casual</p>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>— ELO is not affected</li>
                  <li>— Not tracked in seasonal standings</li>
                  <li>✓ Lower XP for wins</li>
                  <li>✓ Good for practice and testing</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="text-center">
            <Link href="/lobby" className="inline-flex rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Start Competing →
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
