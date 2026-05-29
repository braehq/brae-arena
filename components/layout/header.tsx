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
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
            <span className="text-xs font-bold text-white">BA</span>
          </div>
          <span className="font-semibold tracking-tight text-foreground">Brae Arena</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/leaderboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Leaderboard
          </Link>
          {user && (
            <>
              <Link href="/lobby" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Lobby
              </Link>
              <Link href="/history" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                History
              </Link>
            </>
          )}
        </nav>

        <HeaderClient user={user} profile={profile} />
      </div>
    </header>
  )
}
