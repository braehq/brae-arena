import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get('code')

  // Behind Railway's proxy, request.url's host is the internal container
  // (0.0.0.0:8080), so build redirects from the forwarded public host —
  // otherwise the browser is sent to an unreachable address after auth.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = host ? `${proto}://${host}` : url.origin

  if (code) {
    const cookieStore = await cookies()
    // OAuth carries its destination in a cookie (not redirect_to) so the
    // callback URL matches Supabase's redirect allow-list exactly.
    const rawNext = searchParams.get('next') ?? cookieStore.get('brae_oauth_next')?.value ?? '/lobby'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/lobby'
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            const domain = process.env.NODE_ENV === 'production' ? '.braehq.co' : undefined
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain })
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // OAuth signups (Google/GitHub) never chose a username — send them
      // through onboarding before continuing. Email signups already have one.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        if (!profile?.username) {
          return NextResponse.redirect(`${origin}/welcome?next=${encodeURIComponent(next)}`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
