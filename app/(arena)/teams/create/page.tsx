'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(32, 'Max 32 characters'),
  tag: z.string().min(2).max(5).regex(/^[A-Z0-9]+$/i, '2–5 letters/numbers only').transform(v => v.toUpperCase()),
  slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'lowercase, numbers, hyphens only'),
  description: z.string().max(200).optional(),
  is_open: z.boolean().optional(),
})
type Fields = z.infer<typeof schema>

export default function CreateTeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { is_open: false },
  })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    setValue('tag', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))
  }

  async function onSubmit(data: Fields) {
    setLoading(true)
    const res = await fetch('/api/arena/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to create team'); setLoading(false); return }
    toast.success('Team created!')
    router.push(`/teams/${json.slug}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-2">
        <Link href="/teams" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Teams</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Create a Team</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Team Name</label>
          <input
            {...register('name', { onChange: handleNameChange })}
            placeholder="Brae Legends"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tag</label>
            <input
              {...register('tag')}
              placeholder="BRE"
              maxLength={5}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors uppercase"
            />
            <p className="text-xs text-muted-foreground">2–5 chars shown in brackets [BRE]</p>
            {errors.tag && <p className="text-xs text-destructive">{errors.tag.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">URL Slug</label>
            <input
              {...register('slug')}
              placeholder="brae-legends"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Tell players what your team is about…"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" {...register('is_open')} className="h-4 w-4 rounded accent-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Open recruitment</p>
            <p className="text-xs text-muted-foreground">Any player can request to join without an invite</p>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Team
        </button>
      </form>
    </div>
  )
}
