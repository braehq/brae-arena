'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  opponentSlug: z.string().min(2),
  challengeId: z.string().uuid('Select a challenge'),
  format: z.enum(['2v2', '3v3']),
})
type Fields = z.infer<typeof schema>

export default function ChallengePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [myTeam, setMyTeam] = useState<{ slug: string; name: string; tag: string } | null>(null)
  const [challenges, setChallenges] = useState<{ id: string; title: string; game_type: string }[]>([])

  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { format: '2v2' },
  })

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('arena_team_members')
        .select('team:arena_teams(slug, name, tag)')
        .eq('user_id', user.id)
        .single()

      setMyTeam((membership?.team as unknown as { slug: string; name: string; tag: string }) ?? null)

      const { data: c } = await supabase
        .from('arena_challenges')
        .select('id, title, game_type')
        .eq('active', true)
        .order('title')

      setChallenges(c ?? [])
    }
    load()
  }, [])

  async function onSubmit(data: Fields) {
    if (!myTeam) return
    setLoading(true)
    const res = await fetch('/api/arena/team-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamSlug: myTeam.slug, ...data }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to challenge'); setLoading(false); return }
    toast.success('Challenge sent!')
    router.push(`/team-matches/${json.matchId}`)
  }

  if (!myTeam) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted-foreground">You need to be in a team to issue a challenge.</p>
        <Link href="/teams" className="mt-4 inline-block text-sm text-primary hover:underline">Browse Teams →</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-2">
        <Link href="/team-matches" className="text-sm text-muted-foreground hover:text-foreground">← Team Matches</Link>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">Issue a Challenge</h1>
      <p className="mb-6 text-sm text-muted-foreground">Challenging as <span className="font-semibold text-foreground">[{myTeam.tag}] {myTeam.name}</span></p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Opponent Team Slug</label>
          <input {...register('opponentSlug')} placeholder="their-team-slug"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
          <p className="text-xs text-muted-foreground">Find the slug on their team page URL: /teams/their-team-slug</p>
          {errors.opponentSlug && <p className="text-xs text-destructive">{errors.opponentSlug.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Challenge</label>
          <select {...register('challengeId')} className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select a challenge…</option>
            {challenges.map(c => <option key={c.id} value={c.id}>{c.title} ({c.game_type.replace(/_/g, ' ')})</option>)}
          </select>
          {errors.challengeId && <p className="text-xs text-destructive">{errors.challengeId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Format</label>
          <div className="flex gap-3">
            {(['2v2', '3v3'] as const).map(f => (
              <label key={f} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" {...register('format')} value={f} className="accent-primary" />
                <span className="text-sm text-foreground font-mono">{f}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send Challenge
        </button>
      </form>
    </div>
  )
}
