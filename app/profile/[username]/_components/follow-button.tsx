'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'

interface Props {
  targetUserId: string
  initialFollowing: boolean
}

export function FollowButton({ targetUserId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const method = following ? 'DELETE' : 'POST'
    const res = await fetch('/api/arena/follow', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Something went wrong')
    } else {
      setFollowing(!following)
      toast.success(following ? 'Unfollowed' : 'Following!')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        following
          ? 'border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive'
          : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserMinus className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
