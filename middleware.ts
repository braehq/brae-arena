import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          const domain = process.env.NODE_ENV === 'production' ? '.braehq.co' : undefined
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, domain })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Build the public origin from forwarded headers (Railway's internal host
  // must not be used for redirects — it's unreachable from the browser).
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim()
  const proto = (request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim()
  const publicOrigin = host ? `${proto}://${host}` : request.nextUrl.origin

  // Protected arena routes
  const protectedPaths = ['/lobby', '/queue', '/match', '/history', '/settings', '/admin', '/agents/create', '/agents/[slug]/edit', '/agents/[slug]/queue']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  if (isProtected && !user) {
    return NextResponse.redirect(`${publicOrigin}/login?next=${encodeURIComponent(pathname)}`)
  }

  // Admin guard — role check happens in layout
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(`${publicOrigin}/login?next=${encodeURIComponent(pathname)}`)
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(`${publicOrigin}/lobby`)
  }

  // OAuth users land without a username — make them finish onboarding before
  // entering protected areas (defense-in-depth; the callback also sends them there).
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.username) {
      return NextResponse.redirect(`${publicOrigin}/welcome?next=${encodeURIComponent(pathname)}`)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
