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

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  url_submit:    'URL Submit',
  code_duel:     '⚡ Code Duel',
  css_battle:    '🎨 CSS Battle',
  bug_hunt_code: '🐛 Bug Hunt (Code)',
}

const schema = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  title: z.string().min(5),
  description: z.string().min(20),
  mode: z.enum(['speed_build', 'clone_battle', 'bug_hunt']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']),
  time_limit_mins: z.number().min(5).max(120),
  challenge_type: z.enum(['url_submit', 'code_duel', 'css_battle', 'bug_hunt_code']),
  language: z.string().optional(),
  reference_url: z.string().url().optional().or(z.literal('')),
  starter_repo: z.string().url().optional().or(z.literal('')),
  starter_code: z.string().optional(),
  test_cases: z.string().optional(), // JSON string
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
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'speed_build', difficulty: 'medium', time_limit_mins: 30, challenge_type: 'url_submit', language: 'javascript' },
  })

  const challengeType = watch('challenge_type')
  const isCodeBased = challengeType !== 'url_submit'

  async function onSubmit(data: Fields) {
    setSaving(true)
    const supabase = createClient()

    let testCases = null
    if (data.test_cases?.trim()) {
      try {
        testCases = JSON.parse(data.test_cases)
      } catch {
        toast.error('Test cases must be valid JSON')
        setSaving(false)
        return
      }
    }

    const { error } = await supabase.from('arena_challenges').insert({
      slug: data.slug,
      title: data.title,
      description: data.description,
      mode: data.mode,
      difficulty: data.difficulty,
      time_limit_mins: data.time_limit_mins,
      challenge_type: data.challenge_type,
      language: data.language || 'javascript',
      reference_url: data.reference_url || null,
      starter_repo: data.starter_repo || null,
      starter_code: data.starter_code || null,
      test_cases: testCases,
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
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Detailed challenge brief…"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Challenge Type</Label>
              <select {...register('challenge_type')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="url_submit">URL Submit</option>
                <option value="code_duel">Code Duel</option>
                <option value="css_battle">CSS Battle</option>
                <option value="bug_hunt_code">Bug Hunt (Code)</option>
              </select>
            </div>
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
              <Label>Time (mins)</Label>
              <Input type="number" {...register('time_limit_mins', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Code-based challenge fields */}
          {isCodeBased && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">In-Browser Challenge Settings</p>

              <div className="space-y-1.5">
                <Label>Language</Label>
                <select {...register('language')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="html">HTML/CSS</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Starter Code</Label>
                <textarea
                  {...register('starter_code')}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={'function solve(input) {\n  // your code here\n}'}
                />
              </div>

              {challengeType !== 'css_battle' && (
                <div className="space-y-1.5">
                  <Label>Test Cases (JSON array)</Label>
                  <textarea
                    {...register('test_cases')}
                    rows={5}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={'[\n  {"label": "basic case", "input": "[1,2,3]", "expected": "[1,2,3]"}\n]'}
                  />
                  <p className="text-xs text-muted-foreground">Each test: {`{ "label": "...", "input": "js expression", "expected": "JSON value" }`}</p>
                </div>
              )}
            </div>
          )}

          {/* URL-submit specific fields */}
          {!isCodeBased && (
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
          )}

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create Challenge'}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {challenges.map((c) => {
          const ct = (c as ArenaChallenge & { challenge_type?: string }).challenge_type ?? 'url_submit'
          return (
            <div key={c.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground truncate">{c.title}</p>
                  <Badge variant="outline" className="text-xs text-primary border-primary/40">
                    {CHALLENGE_TYPE_LABELS[ct] ?? ct}
                  </Badge>
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
          )
        })}
      </div>
    </div>
  )
}
