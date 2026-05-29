'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { ArenaChallenge } from '@/types/arena'
import { GAME_TYPE_LABELS, DIFFICULTY_LABELS } from '@/types/arena'

const schema = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  title: z.string().min(5),
  description: z.string().min(20),
  mode: z.enum(['speed_build', 'clone_battle', 'bug_hunt']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']),
  time_limit_mins: z.number().min(5).max(120),
  reference_url: z.string().url().optional().or(z.literal('')),
  starter_repo: z.string().url().optional().or(z.literal('')),
})
type Fields = z.infer<typeof schema>

interface Props {
  challenges: ArenaChallenge[]
  totalMatches: number
  activeInQueue: number
}

export function ChallengeManager({ challenges, totalMatches, activeInQueue }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'speed_build', difficulty: 'medium', time_limit_mins: 30 },
  })

  async function onSubmit(data: Fields) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('arena_challenges').insert({
      ...data,
      reference_url: data.reference_url || null,
      starter_repo: data.starter_repo || null,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Challenge created!')
      reset()
      setShowForm(false)
      router.refresh()
    }
    setSaving(false)
  }

  async function toggleChallenge(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('arena_challenges').update({ active }).eq('id', id)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arena Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalMatches} total matches · {activeInQueue} in queue now
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Challenge'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-8 rounded-xl border border-primary/30 bg-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">New Challenge</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input placeholder="my-challenge" {...register('slug')} />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Challenge title" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (shown to players)</Label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Detailed challenge brief…"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <select {...register('mode')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="speed_build">Speed Build</option>
                <option value="clone_battle">Clone Battle</option>
                <option value="bug_hunt">Bug Hunt</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <select {...register('difficulty')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Time Limit (mins)</Label>
              <Input type="number" {...register('time_limit_mins', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Reference URL (clone_battle)</Label>
              <Input placeholder="https://example.com" {...register('reference_url')} />
            </div>
            <div className="space-y-1.5">
              <Label>Starter Repo URL (optional)</Label>
              <Input placeholder="https://github.com/…" {...register('starter_repo')} />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create Challenge'}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {challenges.map((c) => (
          <div key={c.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">{c.title}</p>
                {!c.active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{GAME_TYPE_LABELS[c.mode]}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[c.difficulty]}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{c.time_limit_mins}min</span>
              </div>
            </div>
            <Button
              size="sm"
              variant={c.active ? 'outline' : 'default'}
              onClick={() => toggleChallenge(c.id, !c.active)}
            >
              {c.active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
