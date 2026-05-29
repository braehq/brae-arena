import { RANK_TIERS } from '@/types/arena'
import type { RankTier } from '@/types/arena'
import { cn } from '@/lib/utils'

interface Props {
  tier: RankTier
  elo?: number
  size?: 'sm' | 'md' | 'lg'
  showElo?: boolean
}

export function RankBadge({ tier, elo, size = 'md', showElo = true }: Props) {
  const info = RANK_TIERS[tier]

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }

  if (tier === 'mythic') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-semibold border',
          'border-transparent',
          sizeClasses[size]
        )}
        style={{
          background: 'linear-gradient(135deg, #ff6b35 0%, #ff0080 100%)',
          color: '#fff',
        }}
      >
        <span>Mythic</span>
        {showElo && elo !== undefined && (
          <span className="opacity-80">· {elo}</span>
        )}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border bg-background',
        sizeClasses[size]
      )}
      style={{ borderColor: info.color + '50', color: info.color }}
    >
      <span>{info.label}</span>
      {showElo && elo !== undefined && (
        <span className="opacity-70">· {elo}</span>
      )}
    </span>
  )
}
