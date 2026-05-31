'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Bot } from 'lucide-react'
import Link from 'next/link'
import { CodeEditor } from '@/components/arena/code-editor'
import { createClient } from '@/lib/supabase/client'

export default function EditAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [agent, setAgent] = useState<{ id: string; name: string; description: string | null; agent_code: string } | null>(null)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s)
      const supabase = createClient()
      supabase.from('arena_agents').select('id, name, description, agent_code').eq('slug', s).single()
        .then(({ data }) => {
          if (data) { setAgent(data); setCode(data.agent_code); setDescription(data.description ?? '') }
        })
    })
  }, [params])

  async function handleSave() {
    if (!agent) return
    setLoading(true)
    const res = await fetch(`/api/agents/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_code: code, description }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Save failed')
    else { toast.success('Agent updated!'); router.push(`/agents/${slug}`) }
    setLoading(false)
  }

  if (!agent) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/agents/${slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← {agent.name}</Link>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Edit Agent</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none" />
          </div>
          <button onClick={handleSave} disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save Agent
          </button>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden" style={{ minHeight: 520 }}>
          <div className="flex items-center px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
            <span className="text-xs text-zinc-400 font-mono">agent.js</span>
          </div>
          <CodeEditor value={code} onChange={setCode} language="javascript" height="480px" />
        </div>
      </div>
    </div>
  )
}
