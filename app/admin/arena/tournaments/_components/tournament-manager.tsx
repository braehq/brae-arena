'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ArenaTournament, ArenaSeason } from '@/types/arena'

const schema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and hyphens only'),
  description: z.string().optional(),
  game_type: z.enum(['speed_build', 'clone_battle', 'bug_hunt']),
  bracket_type: z.enum(['single_elimination', 'double_elimination', 'round_robin']),
  max_participants: z.number().refine(v => [4, 8, 16, 32].includes(v)),
  min_elo: z.number().min(0),
  season_id: z.string().optional(),
  prize_description: z.string().optional(),
  registration_ends: z.string().optional(),
  starts_at: z.string().optional(),
})
type Fields = z.infer<typeof schema>

interface Props {
  tournaments: ArenaTournament[]
  seasons: Pick<ArenaSeason, 'id' | 'name' | 'number'>[]
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'text-muted-foreground',
  registration: 'text-primary',
  active: 'text-green-400',
  complete: 'text-muted-foreground',
  cancelled: 'text-destructive',
}

export function TournamentManager({ tournaments, seasons }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { game_type: 'speed_build', bracket_type: 'single_elimination', max_participants: 8, min_elo: 0 },
  })

  // Auto-generate slug from name
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  async function onCreate(data: Fields) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('arena_tournaments').insert({
      ...data,
      status: 'upcoming',
      season_id: data.season_id || null,
      prize_description: data.prize_description || null,
      registration_ends: data.registration_ends || null,
      starts_at: data.starts_at || null,
      description: data.description || null,
    })
    if (error) { toast.error(error.message) }
    else { toast.success('Tournament created'); reset(); setShowForm(false); router.refresh() }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.from('arena_tournaments').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated'); router.refresh() }
  }

  return (
    <div className="space-y-4">
      {/* Tournament list */}
      {tournaments.map(t => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">{t.name}</p>
              <Link href={`/tournaments/${t.slug}`} className="shrink-0 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></Link>
            </div>
            <p className="text-xs text-muted-foreground">{t.game_type.replace(/_/g, ' ')} · {t.max_participants} players · {t.bracket_type.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold ${STATUS_COLORS[t.status] ?? ''}`}>{t.status}</span>
            <select
              value={t.status}
              onChange={e => updateStatus(t.id, e.target.value)}
              className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {['upcoming','registration','active','complete','cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {tournaments.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No tournaments yet.</div>
      )}

      {/* Create form */}
      {showForm ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">New Tournament</h3>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Name</label>
                <input {...register('name', { onChange: handleNameChange })} placeholder="Spring Cup" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Slug (URL)</label>
                <input {...register('slug')} placeholder="spring-cup" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Description (optional)</label>
              <input {...register('description')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Game Type</label>
                <select {...register('game_type')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="speed_build">Speed Build</option>
                  <option value="clone_battle">Clone Battle</option>
                  <option value="bug_hunt">Bug Hunt</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Format</label>
                <select {...register('bracket_type')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="single_elimination">Single Elim</option>
                  <option value="double_elimination">Double Elim</option>
                  <option value="round_robin">Round Robin</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Max Players</label>
                <select {...register('max_participants', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {[4, 8, 16, 32].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Min ELO (0 = open)</label>
                <input type="number" {...register('min_elo', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Season (optional)</label>
                <select {...register('season_id')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">None</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Registration Closes</label>
                <input type="datetime-local" {...register('registration_ends')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Starts At</label>
                <input type="datetime-local" {...register('starts_at')} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Prize (optional)</label>
              <input {...register('prize_description')} placeholder="e.g. Brae Premium 3 months" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create Tournament
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors w-full">
          <Plus className="h-4 w-4" /> Create New Tournament
        </button>
      )}
    </div>
  )
}
