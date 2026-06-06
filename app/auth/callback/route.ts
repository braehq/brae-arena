import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
type PendingCookie = { name: string; value: string; options?: Record<string, unknown> }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // Behind Railway's proxy request.url has host 0.0.0.0:8080 — build all
  // redirects from the forwarded public host instead.
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim()
  const proto = (request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim()
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const cookieStore = await cookies()
  const domain = process.env.NODE_ENV === 'production' ? '.braehq.co' : undefined

  // Collect cookies written during exchangeCodeForSession so we can attach
  // them to the redirect response. In Next.js App Router, cookieStore.set()
  // mutations don't automatically merge into a NextResponse.redirect().
  const pendingCookies: PendingCookie[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  function redirect(url: string) {
    const res = NextResponse.redirect(url)
    for (const { name, value, options } of pendingCookies) {
      res.cookies.set(name, value, { ...options, ...(domain ? { domain } : {}) })
    }
    return res
  }

  const rawNext = searchParams.get('next') ?? cookieStore.get('brae_oauth_next')?.value ?? '/lobby'
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/lobby'

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.username) {
        return redirect(`${origin}/welcome?next=${encodeURIComponent(next)}`)
      }
    }
    return redirect(`${origin}${next}`)
  }

  return redirect(`${origin}/login?error=auth`)
}
