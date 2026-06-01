'use client'

import { AgentAvatar } from './agent-avatar'

export const AGENT_EMOJIS = [
  '🤖','🦾','🧠','🎯','⚡','🔥','🦊','🐺','🦅','🐉',
  '💀','👾','🎪','🌊','⚔️','🛡️','🔬','🌙','☄️','🎭',
  '🚀','🦁','🐯','🦈','🎲','💎','🔮','🌀','🎸','🏆',
]

export const AGENT_COLORS = [
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Green',   value: '#22c55e' },
  { label: 'Cyan',    value: '#06b6d4' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Slate',   value: '#64748b' },
]

export const PERSONALITY_TAGS = [
  'The Speedrunner',
  'The Scholar',
  'The Edge Case King',
  'The Brute Force',
  'The Pattern Master',
  'The Optimizer',
  'The Dark Horse',
  'The Unpredictable',
  'The Minimalist',
  'The Overengineer',
]

export const MODEL_TAGS = [
  'Pattern Matcher',
  'Rule-Based',
  'LLM-Powered',
  'GPT-4',
  'Claude',
  'Gemini',
  'Custom LLM',
  'Mystery 🕵️',
]

interface Props {
  emoji: string
  color: string
  personalityTag: string
  modelTag: string
  name: string
  onEmojiChange: (v: string) => void
  onColorChange: (v: string) => void
  onPersonalityChange: (v: string) => void
  onModelChange: (v: string) => void
}

export function AgentCustomiseFields({
  emoji, color, personalityTag, modelTag, name,
  onEmojiChange, onColorChange, onPersonalityChange, onModelChange,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <AgentAvatar emoji={emoji} color={color} name={name} size="lg" showRing />
        <div>
          <p className="font-semibold text-foreground">{name || 'Your Agent'}</p>
          {personalityTag && <p className="text-xs text-muted-foreground italic">{personalityTag}</p>}
          <span className="inline-flex mt-1 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ color, borderColor: color + '50', background: color + '15' }}>
            {modelTag}
          </span>
        </div>
      </div>

      {/* Emoji picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avatar</label>
        <div className="flex flex-wrap gap-2">
          {AGENT_EMOJIS.map(e => (
            <button key={e} type="button" onClick={() => onEmojiChange(e)}
              className={`h-9 w-9 rounded-lg text-xl transition-all flex items-center justify-center hover:scale-110 ${
                emoji === e ? 'ring-2 bg-primary/20 scale-110' : 'bg-secondary/60 hover:bg-secondary'
              }`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Colour picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colour</label>
        <div className="flex flex-wrap gap-2">
          {AGENT_COLORS.map(c => (
            <button key={c.value} type="button" onClick={() => onColorChange(c.value)}
              title={c.label}
              className={`h-7 w-7 rounded-full transition-all hover:scale-110 ${
                color === c.value ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : ''
              }`}
              style={{ background: c.value, ...(color === c.value ? { ringColor: c.value } : {}) }} />
          ))}
        </div>
      </div>

      {/* Personality tag */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personality</label>
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => onPersonalityChange(personalityTag === tag ? '' : tag)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                personalityTag === tag
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Model tag */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Powered by</label>
        <div className="flex flex-wrap gap-2">
          {MODEL_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => onModelChange(tag)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                modelTag === tag
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
