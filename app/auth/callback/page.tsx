'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    // Guard against double-firing in React StrictMode
    if (ran.current) return
    ran.current = true

    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next')

    const supabase = createClient()

    async function handle() {
      if (code) {
        // PKCE OAuth flow — browser client has the code verifier in storage
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/login?error=auth_failed')
          return
        }
        // Check if this is a new OAuth user without a username yet
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle()
          if (!profile?.username) {
            router.replace('/welcome')
            return
          }
        }
        router.replace(next ?? '/lobby')
        return
      }

      if (tokenHash && type) {
        // Email confirmation / magic link flow
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'email' | 'recovery' | 'invite' | 'email_change',
        })
        if (error) {
          router.replace('/login?error=auth_failed')
          return
        }
        router.replace(next ?? '/lobby')
        return
      }

      router.replace('/login?error=auth_failed')
    }

    handle()
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
