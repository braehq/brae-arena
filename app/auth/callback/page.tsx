'use client'

import { useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

// The browser Supabase client (createBrowserClient with detectSessionInUrl:true
// and flowType:'pkce') automatically exchanges the ?code= in the URL when it
// initialises. We must NOT call exchangeCodeForSession manually — that would
// consume the single-use code first, leaving the auto-exchange to fail (or
// vice-versa). Instead we just wait for the auth state to settle.
function CallbackHandler() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          // Check if new OAuth user needs to pick a username
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .maybeSingle()
          window.location.replace(profile?.username ? '/lobby' : '/welcome')
        } else if (event === 'INITIAL_SESSION' && !session) {
          // No code in URL or exchange failed
          subscription.unsubscribe()
          window.location.replace('/login?error=auth_failed')
        }
      }
    )

    return () => subscription.unsubscribe()
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
