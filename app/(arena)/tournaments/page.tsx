import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Trophy, Users, Calendar, Lock } from 'lucide-react'
import type { ArenaTournament } from '@/types/arena'

export const metadata: Metadata = { title: 'Tournaments' }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  upcoming:     { label: 'Upcoming',     color: 'text-muted-foreground border-border' },
  registration: { label: 'Registering',  color: 'text-primary border-primary/50 bg-primary/10' },
  active:       { label: 'Live',         color: 'text-green-400 border-green-500/50 bg-green-500/10' },
  complete:     { label: 'Complete',     color: 'text-muted-foreground border-border' },
}

export default async function TournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournaments } = await supabase
    .from('arena_tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  // Participant counts
  const counts: Record<string, number> = {}
  if (tournaments && tournaments.length > 0) {
    const { data: participants } = await supabase
      .from('arena_tournament_participants')
      .select('tournament_id')
      .in('tournament_id', tournaments.map(t => t.id))

    for (const p of participants ?? []) {
      counts[p.tournament_id] = (counts[p.tournament_id] ?? 0) + 1
    }
  }

  // User's registrations
  const registeredIds = new Set<string>()
  if (user && tournaments && tournaments.length > 0) {
    const { data: mine } = await supabase
      .from('arena_tournament_participants')
      .select('tournament_id')
      .eq('user_id', user.id)
      .in('tournament_id', tournaments.map(t => t.id))

    for (const p of mine ?? []) registeredIds.add(p.tournament_id)
  }

  const active = (tournaments ?? []).filter(t => ['registration', 'active'].includes(t.status))
  const upcoming = (tournaments ?? []).filter(t => t.status === 'upcoming')
  const past = (tournaments ?? []).filter(t => ['complete', 'cancelled'].includes(t.status))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tournaments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bracket-based competitions. Win to climb the bracket. Last one standing takes it.</p>
      </div>

      {[
        { title: 'Active & Registration', items: active },
        { title: 'Upcoming', items: upcoming },
        { title: 'Past', items: past },
      ].map(({ title, items }) => items.length > 0 && (
        <section key={title} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(t => {
              const tournament = t as ArenaTournament
              const count = counts[t.id] ?? 0
              const isRegistered = registeredIds.has(t.id)
              const statusStyle = STATUS_LABEL[t.status] ?? STATUS_LABEL.upcoming
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.slug}`}
                  className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                      {t.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{count}/{tournament.max_participants}</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{t.game_type.replace('_', ' ')}</span>
                    {t.min_elo > 0 && <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{t.min_elo}+ ELO</span>}
                    {t.starts_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(t.starts_at).toLocaleDateString()}</span>}
                  </div>

                  {isRegistered && (
                    <div className="mt-2 text-xs font-medium text-primary">✓ Registered</div>
                  )}
                  {t.prize_description && (
                    <div className="mt-2 text-xs text-muted-foreground">🏆 {t.prize_description}</div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {(!tournaments || tournaments.length === 0) && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No tournaments yet. Check back soon.</p>
        </div>
      )}
    </div>
  )
}
