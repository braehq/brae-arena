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
    let settled = false

    // Send the now-authenticated user onward: new OAuth users (no username
    // yet) go to onboarding, everyone else into the app.
    const routeForUser = async (userId: string) => {
      if (settled) return
      settled = true
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle()
      window.location.replace(profile?.username ? '/lobby' : '/welcome')
    }

    // The browser client exchanges the ?code= automatically. Depending on
    // timing we either get SIGNED_IN after the exchange, OR an INITIAL_SESSION
    // that already carries the session (when the exchange finished before this
    // listener attached). Handle any event that has a session so we never get
    // stuck on the spinner.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          subscription.unsubscribe()
          routeForUser(session.user.id)
        }
      }
    )

    // Belt-and-suspenders: if the session was already established before the
    // listener attached, no further event fires — pick it up directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        routeForUser(session.user.id)
      }
    })

    // Genuine failure (no code / exchange failed): stop spinning after a grace
    // period and send the user back to login.
    const timeout = setTimeout(async () => {
      if (settled) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session) routeForUser(session.user.id)
      else window.location.replace('/login?error=auth_failed')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
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
