import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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
