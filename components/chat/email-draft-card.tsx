'use client'

import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Mail, Send, X } from 'lucide-react'

export type DraftEmail = { to: string; subject: string; body: string }

export function EmailDraftCard({
  email,
  sending,
  onSend,
  onCancel,
}: {
  email: DraftEmail
  sending: boolean
  onSend: (email: DraftEmail) => void
  onCancel: () => void
}) {
  const [to, setTo] = useState(email.to)
  const [subject, setSubject] = useState(email.subject)
  const [body, setBody] = useState(email.body)
  const uid = useId()
  const toId = `${uid}-to`
  const subjectId = `${uid}-subject`
  const bodyId = `${uid}-body`

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-md rounded-2xl border border-brand/30 bg-card shadow-sm overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-brand/5">
          <Mail className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium">Draft email — review &amp; send</span>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="space-y-1">
            <label htmlFor={toId} className="text-xs text-muted-foreground">To</label>
            <Input id={toId} value={to} onChange={e => setTo(e.target.value)} className="h-9 text-sm" disabled={sending} />
          </div>
          <div className="space-y-1">
            <label htmlFor={subjectId} className="text-xs text-muted-foreground">Subject</label>
            <Input id={subjectId} value={subject} onChange={e => setSubject(e.target.value)} className="h-9 text-sm" disabled={sending} />
          </div>
          <div className="space-y-1">
            <label htmlFor={bodyId} className="text-xs text-muted-foreground">Message</label>
            <Textarea
              id={bodyId}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="resize-none text-sm"
              disabled={sending}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:opacity-90 gap-1.5"
              onClick={() => onSend({ to, subject, body })}
              disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? 'Sending…' : 'Send'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={sending} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
