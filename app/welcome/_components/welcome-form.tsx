'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CountrySelect } from '@/components/country-select'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(20, 'Max 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only'),
})
type Fields = z.infer<typeof schema>

export function WelcomeForm({
  userId,
  next,
  defaultName,
  defaultCountry,
}: {
  userId: string
  next: string
  defaultName: string
  defaultCountry: string
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [country, setCountry] = useState(defaultCountry)

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: defaultName },
  })

  async function onSubmit(data: Fields) {
    setServerError('')
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        username: data.username,
        country: country || null,
      })
      .eq('id', userId)

    if (error) {
      // username has a UNIQUE constraint — RLS hides other users' rows so we
      // can't pre-check, we rely on the DB rejecting a duplicate here.
      if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
        setError('username', { message: 'Username already taken' })
      } else {
        setServerError(error.message)
      }
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Finish setting up</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Pick a username to complete your Brae account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Alex Smith"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            {...register('fullName')}
          />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="username">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">@</span>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="yourhandle"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              {...register('username')}
            />
          </div>
          <p className="text-xs text-muted-foreground">Shown on the Arena leaderboard.</p>
          {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Country <span className="text-muted-foreground font-normal">(optional)</span></label>
          <CountrySelect value={country} onChange={setCountry} />
          <p className="text-xs text-muted-foreground">Your flag shows on the Arena leaderboard.</p>
        </div>

        {serverError && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue
        </button>
      </form>
    </>
  )
}
