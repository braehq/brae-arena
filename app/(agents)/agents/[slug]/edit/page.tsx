'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Bot } from 'lucide-react'
import Link from 'next/link'
import { CodeEditor } from '@/components/arena/code-editor'
import { AgentCustomiseFields } from '@/components/arena/agent-customise-fields'
import { createClient } from '@/lib/supabase/client'

export default function EditAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [agentName, setAgentName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🤖')
  const [color, setColor] = useState('#6366f1')
  const [personalityTag, setPersonalityTag] = useState('')
  const [modelTag, setModelTag] = useState('Pattern Matcher')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s)
      const supabase = createClient()
      supabase.from('arena_agents')
        .select('name, description, agent_code, avatar_emoji, color_accent, personality_tag, model_tag')
        .eq('slug', s).single()
        .then(({ data }) => {
          if (data) {
            setAgentName(data.name)
            setCode(data.agent_code)
            setDescription(data.description ?? '')
            setEmoji(data.avatar_emoji ?? '🤖')
            setColor(data.color_accent ?? '#6366f1')
            setPersonalityTag(data.personality_tag ?? '')
            setModelTag(data.model_tag ?? 'Pattern Matcher')
            setReady(true)
          }
        })
    })
  }, [params])

  async function handleSave() {
    setLoading(true)
    const res = await fetch(`/api/agents/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_code: code, description,
        avatar_emoji: emoji, color_accent: color,
        personality_tag: personalityTag, model_tag: modelTag,
      }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Save failed')
    else { toast.success('Agent updated!'); router.push(`/agents/${slug}`) }
    setLoading(false)
  }

  if (!ready) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/agents/${slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← {agentName}</Link>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Edit Agent</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Bio</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Customise</h2>
            <AgentCustomiseFields
              emoji={emoji} color={color}
              personalityTag={personalityTag} modelTag={modelTag}
              name={agentName}
              onEmojiChange={setEmoji} onColorChange={setColor}
              onPersonalityChange={setPersonalityTag} onModelChange={setModelTag}
            />
          </div>

          <button onClick={handleSave} disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
          </button>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden" style={{ minHeight: 520 }}>
          <div className="flex items-center px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
            <span className="text-xs text-zinc-400 font-mono">agent.js</span>
          </div>
          <CodeEditor value={code} onChange={setCode} language="javascript" height="480px" />
        </div>
      </div>
    </div>
  )
}
