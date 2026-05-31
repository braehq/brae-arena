import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeaderClient } from './header-client'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, arena_elo, arena_rank_tier')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/50 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">

        {/* Logo + back link */}
        <div className="flex items-center gap-3">
          <a href="https://braehq.co"
            className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors md:flex">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            braehq.co
          </a>
          <span className="hidden text-border md:block">|</span>
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Brae" className="h-8 w-auto mix-blend-multiply dark:mix-blend-screen" />
            <span className="font-semibold tracking-tight text-foreground">Arena</span>
          </Link>
        </div>

        {/* Primary nav — always visible */}
        <nav className="hidden items-center gap-5 md:flex">
          {user && (
            <Link href="/lobby" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Lobby
            </Link>
          )}
          <Link href="/daily" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            Daily
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </Link>
          <Link href="/leaderboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Leaderboard
          </Link>
          <Link href="/agents" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            Agents
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">AI</span>
          </Link>

          {/* More dropdown — Tournaments, Teams, Seasons, History */}
          <HeaderMoreMenu loggedIn={!!user} />
        </nav>

        <HeaderClient user={user} profile={profile} />
      </div>
    </header>
  )
}

// Server component — renders the More dropdown trigger
// Actual open/close handled client-side in HeaderClient via a shared pattern
function HeaderMoreMenu({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        More
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 mt-px">
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {/* Dropdown — shown on hover via group-hover */}
      <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-card shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 py-1">
        <Link href="/tournaments" className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
          🏆 Tournaments
        </Link>
        <Link href="/teams" className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
          🛡️ Teams
        </Link>
        <Link href="/seasons" className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
          📅 Seasons
        </Link>
        <Link href="/agent-battles" className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
          🤖 Agent Battles
        </Link>
        {loggedIn && (
          <>
            <div className="my-1 border-t border-border/50" />
            <Link href="/history" className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
              📋 Match History
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
