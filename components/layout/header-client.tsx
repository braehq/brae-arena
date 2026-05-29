'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RankBadge } from '@/components/arena/rank-badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RankTier } from '@/types/arena'

interface Props {
  user: User | null
  profile: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    arena_elo: number
    arena_rank_tier: RankTier
  } | null
}

export function HeaderClient({ user, profile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          Sign in
        </Link>
        <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
          Play free
        </Link>
      </div>
    )
  }

  const displayName = profile?.username ?? profile?.full_name ?? user.email?.split('@')[0] ?? 'Player'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      {profile && (
        <div className="hidden items-center gap-2 md:flex">
          <RankBadge tier={profile.arena_rank_tier} elo={profile.arena_elo} size="sm" />
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
          <Avatar className="h-8 w-8">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
            <AvatarFallback className="bg-primary/20 text-xs text-primary">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/profile/${profile?.username ?? user.id}`)}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/history')}>
            Match History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
