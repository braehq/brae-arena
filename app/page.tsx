import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { RankBadge } from '@/components/arena/rank-badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'mythic'] as const

const GAME_MODES = [
  {
    icon: '⚡',
    name: 'Code Duel',
    tag: 'In-browser',
    desc: 'A function challenge drops into your editor. Write the solution. Tests run live. Faster perfect solve = higher score.',
    color: '#6366f1',
    example: 'flatten(arr) · twoSum(nums, target) · isPalindrome(str)',
  },
  {
    icon: '🐛',
    name: 'Bug Hunt',
    tag: 'In-browser',
    desc: 'Broken code is pre-loaded in your editor. Find and fix every bug before your opponent does. Tests verify each fix.',
    color: '#f59e0b',
    example: '3 bugs hidden · Fix the calculator · Patch the recursive fn',
  },
  {
    icon: '🎨',
    name: 'CSS Battle',
    tag: 'In-browser',
    desc: 'Recreate a target design using HTML and CSS. A live preview updates as you type. Submit when it matches.',
    color: '#22c55e',
    example: 'Pricing card · Profile badge · Stat card row',
  },
  {
    icon: '🚀',
    name: 'Deploy & Score',
    tag: 'Classic',
    desc: 'Build on your machine, deploy anywhere. Submit a live URL — Lighthouse audits it automatically and decides the winner.',
    color: '#0ea5e9',
    example: 'Vercel · Netlify · Railway · any live URL',
  },
]

export default function LandingPage() {

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="arena-grid relative pt-28 pb-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

            {/* Left — copy */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Live now · Free to play
              </div>
              <h1 className="mb-5 text-5xl font-black tracking-tight text-foreground leading-[1.1] md:text-6xl">
                1v1 coding<br />
                <span className="text-primary">in the browser.</span>
              </h1>
              <p className="mb-8 text-lg text-muted-foreground leading-relaxed max-w-lg">
                Queue up. A challenge appears in your editor. Both players code live, tests run in real-time,
                and ELO decides who's better. No setup. No deploys. Just code.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'text-base px-8')}>
                  Play free →
                </Link>
                <Link href="/leaderboard" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-base')}>
                  Leaderboard
                </Link>
              </div>

              {/* Feature highlights */}
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {[
                  { value: '25', label: 'challenges' },
                  { value: '4', label: 'game modes' },
                  { value: '6', label: 'rank tiers' },
                  { value: 'Free', label: 'to play' },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — editor mockup */}
            <div className="rounded-xl border border-border bg-[#1e1e1e] overflow-hidden shadow-2xl shadow-primary/10">
              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-[#2d2d2d] px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="rounded bg-[#2d2d2d] px-2 py-0.5">solution.js</span>
                  <span className="text-green-400 font-medium">5/5 ✓</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-semibold">LIVE</span>
                </div>
              </div>
              {/* Split pane */}
              <div className="flex" style={{ minHeight: '320px' }}>
                {/* Left — challenge + tests */}
                <div className="w-52 border-r border-[#2d2d2d] flex flex-col text-xs">
                  <div className="p-3 border-b border-[#2d2d2d]">
                    <p className="text-zinc-400 uppercase tracking-widest text-[10px] mb-1">Challenge</p>
                    <p className="text-white font-semibold text-sm leading-tight">Flatten Nested Array</p>
                    <p className="text-zinc-500 mt-1 leading-relaxed text-[11px]">Write flatten(arr) that deep-flattens any nested array.</p>
                  </div>
                  <div className="p-3 flex-1">
                    <p className="text-zinc-400 uppercase tracking-widest text-[10px] mb-2">Tests</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'flattens one level', pass: true },
                        { label: 'flattens deeply', pass: true },
                        { label: 'empty array', pass: true },
                        { label: 'already flat', pass: true },
                        { label: 'mixed nesting', pass: true },
                      ].map(({ label, pass }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className={pass ? 'text-green-400' : 'text-zinc-600'}>
                            {pass ? '✓' : '○'}
                          </span>
                          <span className={pass ? 'text-zinc-300' : 'text-zinc-600'}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 border-t border-[#2d2d2d]">
                    <div className="w-full rounded bg-primary py-1.5 text-center text-xs font-semibold text-white">
                      Submit ✓
                    </div>
                  </div>
                </div>
                {/* Right — code */}
                <div className="flex-1 p-4 font-mono text-sm leading-relaxed overflow-hidden">
                  <div className="text-zinc-500 select-none">
                    <span className="text-blue-400">function</span>{' '}
                    <span className="text-yellow-300">flatten</span>
                    <span className="text-zinc-300">(arr) {'{'}</span>
                  </div>
                  <div className="ml-4 text-zinc-300">
                    <span className="text-blue-400">return </span>
                    <span>arr.</span>
                    <span className="text-yellow-300">reduce</span>
                    <span>((acc, item) </span>
                    <span className="text-blue-400">=&gt;</span>
                    <span> {'{'}</span>
                  </div>
                  <div className="ml-8 text-zinc-300">
                    <span className="text-blue-400">if </span>
                    <span>(</span>
                    <span className="text-yellow-300">Array</span>
                    <span>.isArray(item))</span>
                  </div>
                  <div className="ml-12 text-zinc-300">
                    <span className="text-blue-400">return </span>
                    <span>acc.concat(</span>
                    <span className="text-yellow-300">flatten</span>
                    <span>(item));</span>
                  </div>
                  <div className="ml-8 text-zinc-300">
                    <span className="text-blue-400">return </span>
                    <span>[...acc, item];</span>
                  </div>
                  <div className="ml-4 text-zinc-300">{'}, []);\n}'}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-green-400 text-xs">● All 5 tests passing</span>
                  </div>
                  {/* Fake cursor blink */}
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-zinc-600 text-xs font-mono">{'>'}</span>
                    <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse" />
                  </div>
                </div>
              </div>
              {/* Timer bar */}
              <div className="border-t border-[#2d2d2d] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>vs</span>
                  <span className="text-zinc-300 font-medium">Yala</span>
                  <span className="text-red-400">● building…</span>
                </div>
                <span className="font-mono text-sm font-bold text-white">14:32</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Game modes ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">Game Modes</p>
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">Four ways to compete</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {GAME_MODES.map(({ icon, name, tag, desc, color, example }) => (
            <div key={name} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl"
                  style={{ background: color + '18' }}>
                  {icon}
                </div>
                <span className="rounded-full border text-[10px] font-semibold px-2 py-0.5"
                  style={{ color, borderColor: color + '40', background: color + '10' }}>
                  {tag}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              <p className="mt-3 text-[11px] text-muted-foreground/60 font-mono truncate">{example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">Match Flow</p>
          <h2 className="mb-16 text-center text-3xl font-bold text-foreground">A match in four steps</h2>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-6 top-6 bottom-6 w-px bg-border hidden sm:block" />
            <div className="space-y-10">
              {[
                { n: '1', title: 'Pick your mode and queue', body: 'Choose Ranked or Casual, pick a game type or leave it on Any. We find you an opponent near your ELO in seconds.' },
                { n: '2', title: 'Challenge drops — you\'re already coding', body: 'The challenge appears directly in your browser editor. Starter code is pre-loaded. Timer starts the moment you land. No setup, no deploys.' },
                { n: '3', title: 'Run tests, iterate, submit', body: 'Hit Run Tests any time to see which cases pass. Submit when you\'re ready — or when the clock hits zero. Speed bonus for early perfect submits.' },
                { n: '4', title: 'Results and ELO', body: 'Scores calculated instantly from test results. Side-by-side results screen. ELO shifts. XP awarded. Queue for the rematch.' },
              ].map(({ n, title, body }) => (
                <div key={n} className="flex gap-6 relative">
                  <div className="shrink-0 z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background font-bold text-primary">
                    {n}
                  </div>
                  <div className="pt-2">
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Rank tiers ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">Ranking</p>
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground">Six tiers. One ladder.</h2>
        <p className="mb-10 text-center text-muted-foreground text-sm">Everyone starts at 1,000 ELO. Win ranked matches to climb. Every account is on the leaderboard from day one.</p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {TIERS.map(tier => (
            <RankBadge key={tier} tier={tier} size="lg" showElo={false} />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Bronze (0–1199) · Silver (1200–1499) · Gold (1500–1799) · Platinum (1800–2099) · Diamond (2100–2399) · Mythic (2400+)
        </p>
        <div className="mt-6 text-center">
          <Link href="/elo" className="text-sm text-primary hover:underline">How does ELO work? →</Link>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card/40 py-20 px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">Ready to code?</h2>
          <p className="mb-8 text-muted-foreground">
            Free to play. No setup. Open your browser, queue up, and code.
          </p>
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'text-base px-10')}>
            Create your account
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Already have a Brae account?{' '}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Brae Arena · Part of the <a href="https://braehq.co" className="text-foreground hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">BRAE ecosystem</a></span>
          <div className="flex gap-4 text-xs">
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
            <Link href="/elo" className="hover:text-foreground transition-colors">ELO System</Link>
            <Link href="/tournaments" className="hover:text-foreground transition-colors">Tournaments</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
