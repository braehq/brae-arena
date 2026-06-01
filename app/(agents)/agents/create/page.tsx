'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Bot } from 'lucide-react'
import Link from 'next/link'
import { CodeEditor } from '@/components/arena/code-editor'
import { AgentCustomiseFields } from '@/components/arena/agent-customise-fields'

const STARTER_CODE = `function agent(challenge) {
  // challenge contains:
  //   title, description, language, starter_code, test_cases

  const title = challenge.title.toLowerCase();

  // Pattern matching — add your own cases!
  if (title.includes('flatten')) {
    return 'function flatten(arr) { return arr.flat(Infinity); }';
  }
  if (title.includes('palindrome')) {
    return \`function isPalindrome(s) {
  const c = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return c === c.split('').reverse().join('');
}\`;
  }
  if (title.includes('prime')) {
    return \`function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
  return true;
}\`;
  }

  // Fallback: return starter code unchanged
  return challenge.starter_code;
}`

const schema = z.object({
  name: z.string().min(2).max(40),
  slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'lowercase, numbers, hyphens only'),
  description: z.string().max(200).optional(),
})
type Fields = z.infer<typeof schema>

export default function CreateAgentPage() {
  const router = useRouter()
  const [code, setCode] = useState(STARTER_CODE)
  const [loading, setLoading] = useState(false)
  const [emoji, setEmoji] = useState('🤖')
  const [color, setColor] = useState('#6366f1')
  const [personalityTag, setPersonalityTag] = useState('')
  const [modelTag, setModelTag] = useState('Pattern Matcher')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })
  const name = watch('name') ?? ''

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  async function onSubmit(data: Fields) {
    setLoading(true)
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        agent_code: code,
        avatar_emoji: emoji,
        color_accent: color,
        personality_tag: personalityTag || null,
        model_tag: modelTag,
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to create agent'); setLoading(false); return }
    toast.success('Agent deployed!')
    router.push(`/agents/${json.slug}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-2">
        <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Agents</Link>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Create Agent</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left — identity + customise */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Identity</h2>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Agent Name</label>
                <input {...register('name', { onChange: handleNameChange })} placeholder="My Smart Agent"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">URL Slug</label>
                <input {...register('slug')} placeholder="my-smart-agent"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bio <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea {...register('description')} rows={2} placeholder="What makes your agent special?"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground mb-4">Customise</h2>
              <AgentCustomiseFields
                emoji={emoji} color={color}
                personalityTag={personalityTag} modelTag={modelTag}
                name={name}
                onEmojiChange={setEmoji} onColorChange={setColor}
                onPersonalityChange={setPersonalityTag} onModelChange={setModelTag}
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              🚀 Deploy Agent
            </button>
          </div>

          {/* Right — editor */}
          <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden" style={{ minHeight: 560 }}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
              <span className="text-xs text-zinc-400 font-mono">agent.js</span>
              <span className="text-xs text-zinc-500">Your agent function</span>
            </div>
            <CodeEditor value={code} onChange={setCode} language="javascript" height="520px" />
          </div>
        </div>
      </form>
    </div>
  )
}
