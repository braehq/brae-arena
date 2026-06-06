import { createBrowserClient } from '@supabase/ssr'

// Share sessions across *.braehq.co in production by setting
// the cookie domain on the browser client (same as server client)
const cookieOptions = process.env.NEXT_PUBLIC_APP_URL?.includes('braehq.co')
  ? { domain: '.braehq.co', path: '/', sameSite: 'lax' as const, secure: true }
  : undefined

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieOptions ? { cookieOptions } : undefined
  )
}
