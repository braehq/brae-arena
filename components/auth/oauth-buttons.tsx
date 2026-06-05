'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Provider = 'google' | 'github'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.62 8.21 11.18.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.37-1.34-1.74-1.34-1.74-1.09-.73.08-.72.08-.72 1.21.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.24-3.17-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21.96-.26 1.98-.39 3-.4 1.02 0 2.04.14 3 .4 2.28-1.53 3.29-1.21 3.29-1.21.66 1.66.24 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.54-2.81 5.54-5.49 5.83.43.36.81 1.09.81 2.19 0 1.58-.01 2.86-.01 3.25 0 .31.21.68.83.56C20.56 21.9 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z" />
    </svg>
  )
}

export function OAuthButtons({ next = '/lobby' }: { next?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState('')

  async function signIn(provider: Provider) {
    setError('')
    setLoading(provider)
    const supabase = createClient()
    // Carry the destination in a short-lived cookie instead of the redirect_to
    // query string. Supabase matches the redirect allow-list exactly, and a
    // '?next=' query makes the callback URL fail to match (email signup works
    // precisely because it uses the bare /auth/callback URL with no query).
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `brae_oauth_next=${encodeURIComponent(next)}; path=/; max-age=300; samesite=lax${secure}`
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    // On success the browser is redirected to the provider, so we only
    // reach here on failure.
    if (error) {
      setError(error.message)
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => signIn('google')}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50 transition-colors"
        >
          {loading === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => signIn('github')}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50 transition-colors"
        >
          {loading === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitHubIcon />}
          Continue with GitHub
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">or continue with email</span>
        </div>
      </div>
    </div>
  )
}
