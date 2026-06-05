import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WelcomeForm } from './_components/welcome-form'

// Onboarding step for users who signed up via OAuth (Google/GitHub) and so
// never chose a username. Email/password signups already have one and skip past.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  // Only allow internal redirects (block open-redirect + protocol-relative).
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/lobby'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, country, full_name')
    .eq('id', user.id)
    .maybeSingle()

  // Already onboarded — nothing to do here.
  if (profile?.username) redirect(dest)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Brae" className="h-9 w-auto mix-blend-multiply dark:mix-blend-screen" />
            <span className="font-semibold text-foreground">Arena</span>
          </Link>
        </div>

        <WelcomeForm
          userId={user.id}
          next={dest}
          defaultName={profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? ''}
          defaultCountry={profile?.country ?? ''}
        />
      </div>
    </div>
  )
}
