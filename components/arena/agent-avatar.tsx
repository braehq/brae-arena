interface Props {
  emoji: string
  color: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showRing?: boolean
}

const SIZES = {
  sm: { outer: 'h-8 w-8 rounded-lg text-base',  ring: 'ring-1' },
  md: { outer: 'h-11 w-11 rounded-xl text-xl',  ring: 'ring-2' },
  lg: { outer: 'h-14 w-14 rounded-xl text-2xl', ring: 'ring-2' },
  xl: { outer: 'h-20 w-20 rounded-2xl text-4xl', ring: 'ring-2' },
}

export function AgentAvatar({ emoji, color, name, size = 'md', showRing = false }: Props) {
  const s = SIZES[size]
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${s.outer} ${showRing ? s.ring : ''}`}
      style={{
        background: color + '22',
        border: `1.5px solid ${color}55`,
        ...(showRing ? { outline: `2px solid ${color}44`, outlineOffset: '2px' } : {}),
      }}
      title={name}
    >
      <span role="img" aria-label={name} className="leading-none select-none">
        {emoji}
      </span>
    </div>
  )
}
