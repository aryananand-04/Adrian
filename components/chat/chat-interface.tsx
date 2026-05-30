'use client'

import { useState, useRef, useEffect } from 'react'
import type { Personality, ChatMessage, Message } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Send, Sparkles } from 'lucide-react'
import { isToday, isYesterday, format, parseISO } from 'date-fns'
import { EmailDraftCard, type DraftEmail } from '@/components/chat/email-draft-card'
import { EventConfirmCard, type DraftEvent } from '@/components/chat/event-confirm-card'
import { Markdown } from '@/components/chat/markdown'

const META_SEPARATOR = ''

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMM d')
}

export function ChatInterface({
  chatId,
  chatDate,
  initialMessages,
  personalities,
  defaultPersonalityId,
}: {
  chatId: string
  chatDate: string
  initialMessages: Message[]
  personalities: Personality[]
  defaultPersonalityId: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map(m => ({ role: m.role, content: m.content }))
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<DraftEmail | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<DraftEvent | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [personalityId, setPersonalityId] = useState(
    defaultPersonalityId || personalities[0]?.id || ''
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, pendingEmail, pendingEvent])

  async function sendMessage() {
    const content = input.trim()
    if (!content || loading) return
    if (!personalityId) {
      toast.error('No personality available')
      return
    }

    const prevMessages = messages
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setPendingEmail(null)
    setPendingEvent(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, personalityId, messages: newMessages }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let started = false

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const sep = buffer.indexOf(META_SEPARATOR)
        const visible = sep === -1 ? buffer : buffer.slice(0, sep)
        if (!started) {
          setMessages(prev => [...prev, { role: 'assistant', content: visible }])
          started = true
        } else {
          setMessages(prev => {
            const copy = prev.slice()
            copy[copy.length - 1] = { role: 'assistant', content: visible }
            return copy
          })
        }
      }

      const sep = buffer.indexOf(META_SEPARATOR)
      if (sep !== -1) {
        try {
          const meta = JSON.parse(buffer.slice(sep + 1))
          setPendingEmail(meta.pendingEmail ?? null)
          setPendingEvent(meta.pendingEvent ?? null)
        } catch {
          // ignore malformed meta
        }
      }
      if (!started) {
        setMessages(prev => [...prev, { role: 'assistant', content: '…' }])
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prevMessages)
      setInput(content)
    } finally {
      setLoading(false)
    }
  }

  async function confirmSendEmail(email: DraftEmail) {
    setSendingEmail(true)
    try {
      const res = await fetch('/api/google/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Email sent to ${email.to}`)
      setMessages(prev => [...prev, { role: 'assistant', content: `📨 Sent to ${email.to}.` }])
      setPendingEmail(null)
    } catch {
      toast.error('Failed to send email')
    }
    setSendingEmail(false)
  }

  async function confirmAddEvent(event: DraftEvent) {
    setAddingEvent(true)
    try {
      const res = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Added to your calendar')
      setMessages(prev => [...prev, { role: 'assistant', content: `📅 Added "${event.summary}" to your calendar.` }])
      setPendingEvent(null)
    } catch {
      toast.error('Failed to add event')
    }
    setAddingEvent(false)
  }

  const hasPersonalities = personalities.length > 0
  const awaitingFirstToken = loading && messages[messages.length - 1]?.role === 'user'

  return (
    <div className="flex flex-col h-full">
      {/* Slim header — which day this chat is */}
      <header className="px-4 sm:px-6 py-3 border-b border-border bg-card/60 backdrop-blur">
        <h1 className="font-semibold">{dayLabel(chatDate)}</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ' +
                  (msg.role === 'user'
                    ? 'bg-brand text-brand-foreground rounded-br-sm whitespace-pre-wrap'
                    : 'bg-card text-card-foreground shadow-sm rounded-bl-sm')
                }
              >
                {msg.role === 'user' ? msg.content : msg.content ? <Markdown>{msg.content}</Markdown> : null}
              </div>
            </div>
          ))}

          {awaitingFirstToken && (
            <div className="flex justify-start">
              <div className="bg-card rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 motion-safe:animate-pulse [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 motion-safe:animate-pulse [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 motion-safe:animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {pendingEmail && (
            <EmailDraftCard
              email={pendingEmail}
              sending={sendingEmail}
              onSend={confirmSendEmail}
              onCancel={() => setPendingEmail(null)}
            />
          )}

          {pendingEvent && (
            <EventConfirmCard
              event={pendingEvent}
              adding={addingEvent}
              onAdd={confirmAddEvent}
              onCancel={() => setPendingEvent(null)}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer — personality picker lives here, like a model selector */}
      <div className="px-4 sm:px-6 pb-5">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-brand/50">
            <Textarea
              placeholder={hasPersonalities ? 'Ask anything…' : 'No personality available…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              rows={1}
              disabled={!hasPersonalities}
              className="resize-none min-h-[52px] max-h-40 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent text-sm"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              {hasPersonalities ? (
                <Select value={personalityId} onValueChange={v => v && setPersonalityId(v)}>
                  <SelectTrigger
                    size="sm"
                    className="border-0 bg-transparent px-2 text-muted-foreground shadow-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-transparent dark:hover:bg-transparent"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <SelectValue placeholder="Aryan">
                      {(value: string | null) =>
                        personalities.find(p => p.id === value)?.name ?? 'Aryan'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {personalities.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="px-2 text-sm text-muted-foreground">No personality</span>
              )}

              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading || !hasPersonalities}
                className="bg-brand text-brand-foreground hover:opacity-90 h-9 w-9 p-0 flex-shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
