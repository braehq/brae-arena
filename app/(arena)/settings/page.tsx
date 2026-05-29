import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, country')
    .eq('id', user!.id)
    .single()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Account</h2>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Username</p>
          <p className="text-sm text-foreground">{profile?.username ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Display name</p>
          <p className="text-sm text-foreground">{profile?.full_name ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-sm text-foreground">{user?.email}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Country</p>
          <p className="text-sm text-foreground">{profile?.country ?? '—'}</p>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          To update profile details, visit your{' '}
          <a href="https://braehq.co/account/profile" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            Brae account page
          </a>.
        </p>
      </div>
    </div>
  )
}
