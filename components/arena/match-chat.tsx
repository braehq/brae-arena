'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Send, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { countryFlag } from '@/lib/country-flag'

interface ChatMessage {
  id: string
  user_id: string
  message: string
  created_at: string
  profile?: { username: string | null; full_name: string | null; country: string | null; arena_rank_tier: string }
}

interface Props {
  matchId: string
  userId: string | null
  initialMessages?: ChatMessage[]
  readOnly?: boolean
  compact?: boolean
}

export function MatchChat({ matchId, userId, initialMessages = [], readOnly = false, compact = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('chat:' + matchId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'arena_match_chat',
        filter: `match_id=eq.${matchId}`,
      }, async (payload) => {
        const msg = payload.new as ChatMessage
        // Fetch the profile for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name, country, arena_rank_tier')
          .eq('id', msg.user_id)
          .single()
        setMessages(prev => [...prev, { ...msg, profile: profile ?? undefined }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  async function handleSend() {
    if (!input.trim() || !userId || sending) return
    setSending(true)
    const res = await fetch('/api/arena/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, message: input.trim() }),
    })
    if (!res.ok) { toast.error('Failed to send'); setSending(false); return }
    setInput('')
    setSending(false)
  }

  const height = compact ? 200 : 320

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ height: compact ? 'auto' : height + 56 }}>
      {!compact && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 shrink-0">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Spectator Chat</span>
          <span className="ml-auto text-xs text-muted-foreground">{messages.length}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ maxHeight: height }}>
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            {readOnly ? 'No messages yet' : 'Say something…'}
          </p>
        ) : (
          messages.map(msg => {
            const name = msg.profile?.username ?? msg.profile?.full_name ?? 'Spectator'
            const isMe = msg.user_id === userId
            const flag = msg.profile?.country ? countryFlag(msg.profile.country) : ''
            return (
              <div key={msg.id} className={`flex gap-1.5 text-xs ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  isMe ? 'bg-primary/20 text-primary' : 'bg-secondary/60 text-foreground'
                }`}>
                  {!isMe && (
                    <span className="font-semibold text-muted-foreground text-[10px] mr-1">
                      {flag} {name}
                    </span>
                  )}
                  <span className="break-words">{msg.message}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!readOnly && userId && (
        <div className="flex gap-1.5 border-t border-border p-2 shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            maxLength={200}
            className="flex-1 rounded-lg bg-secondary border border-border px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      )}
      {!readOnly && !userId && (
        <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">Sign in</a> to chat
        </div>
      )}
    </div>
  )
}
