'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ArenaSeason } from '@/types/arena'

const schema = z.object({
  name: z.string().min(2),
  duration_days: z.number().min(7).max(90),
})
type Fields = z.infer<typeof schema>

interface Props { seasons: ArenaSeason[] }

export function SeasonManager({ seasons }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const nextNumber = Math.max(0, ...seasons.map(s => s.number)) + 1
  const activeSeason = seasons.find(s => s.is_active)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { name: `Season ${nextNumber}`, duration_days: 28 },
  })

  async function createSeason(data: Fields) {
    setLoading(true)
    const supabase = createClient()
    const starts = new Date()
    const ends = new Date(starts.getTime() + data.duration_days * 86400000)
    const { error } = await supabase.from('arena_seasons').insert({
      name: data.name,
      number: nextNumber,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      is_active: !activeSeason,
    })
    if (error) { toast.error(error.message) } else { toast.success('Season created'); reset(); setShowForm(false); router.refresh() }
    setLoading(false)
  }

  async function endSeason(season: ArenaSeason) {
    if (!confirm(`End "${season.name}" and snapshot rankings?`)) return
    setLoading(true)
    const supabase = createClient()

    // Snapshot top players into arena_season_rankings
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, arena_elo, arena_rank_tier, arena_wins, arena_losses, arena_matches_played')
      .gt('arena_matches_played', 0)
      .order('arena_elo', { ascending: false })
      .limit(500)

    if (profiles && profiles.length > 0) {
      const rows = profiles.map((p, i) => ({
        season_id: season.id,
        user_id: p.id,
        final_elo: p.arena_elo,
        final_tier: p.arena_rank_tier,
        rank_position: i + 1,
        matches_played: p.arena_matches_played,
        wins: p.arena_wins,
        losses: p.arena_losses,
      }))
      await supabase.from('arena_season_rankings').upsert(rows, { onConflict: 'season_id,user_id' })
    }

    await supabase.from('arena_seasons').update({ is_active: false, ends_at: new Date().toISOString() }).eq('id', season.id)
    toast.success('Season ended and rankings snapshotted')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Active season */}
      {activeSeason ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">ACTIVE</span>
                <span className="font-semibold text-foreground">{activeSeason.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Ends {new Date(activeSeason.ends_at).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => endSeason(activeSeason)}
              disabled={loading}
              className="rounded-lg border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              End Season
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No active season. Create one below.
        </div>
      )}

      {/* Past seasons */}
      {seasons.filter(s => !s.is_active).map(s => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="font-medium text-foreground">{s.name}</p>
            <p className="text-xs text-muted-foreground">{new Date(s.starts_at).toLocaleDateString()} — {new Date(s.ends_at).toLocaleDateString()}</p>
          </div>
          <span className="text-xs text-muted-foreground">Complete</span>
        </div>
      ))}

      {/* Create form */}
      {showForm ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 font-semibold text-foreground">New Season</h3>
          <form onSubmit={handleSubmit(createSeason)} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Season Name</label>
              <input {...register('name')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Duration (days)</label>
              <input type="number" {...register('duration_days', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.duration_days && <p className="text-xs text-destructive">{errors.duration_days.message}</p>}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create Season
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors w-full">
          <Plus className="h-4 w-4" /> Create New Season
        </button>
      )}
    </div>
  )
}
