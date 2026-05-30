'use client'

import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Check, X } from 'lucide-react'

export type DraftEvent = { summary: string; start: string; end: string; description?: string }

// datetime-local wants "YYYY-MM-DDTHH:mm"; the model gives ISO like "2026-05-30T18:00:00".
const toLocalInput = (iso: string) => (iso || '').slice(0, 16)
const toIso = (local: string) => (local && local.length === 16 ? `${local}:00` : local)

export function EventConfirmCard({
  event,
  adding,
  onAdd,
  onCancel,
}: {
  event: DraftEvent
  adding: boolean
  onAdd: (event: DraftEvent) => void
  onCancel: () => void
}) {
  const [summary, setSummary] = useState(event.summary)
  const [start, setStart] = useState(toLocalInput(event.start))
  const [end, setEnd] = useState(toLocalInput(event.end))
  const [description, setDescription] = useState(event.description ?? '')
  const uid = useId()

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-md rounded-2xl border border-brand/30 bg-card shadow-sm overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-brand/5">
          <CalendarPlus className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium">Add to calendar — review &amp; confirm</span>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="space-y-1">
            <label htmlFor={`${uid}-summary`} className="text-xs text-muted-foreground">Title</label>
            <Input id={`${uid}-summary`} value={summary} onChange={e => setSummary(e.target.value)} className="h-9 text-sm" disabled={adding} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor={`${uid}-start`} className="text-xs text-muted-foreground">Starts</label>
              <Input id={`${uid}-start`} type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="h-9 text-sm" disabled={adding} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${uid}-end`} className="text-xs text-muted-foreground">Ends</label>
              <Input id={`${uid}-end`} type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="h-9 text-sm" disabled={adding} />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${uid}-desc`} className="text-xs text-muted-foreground">Notes (optional)</label>
            <Textarea id={`${uid}-desc`} value={description} onChange={e => setDescription(e.target.value)} rows={2} className="resize-none text-sm" disabled={adding} />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:opacity-90 gap-1.5"
              onClick={() => onAdd({ summary, start: toIso(start), end: toIso(end), description })}
              disabled={adding || !summary.trim() || !start || !end}
            >
              <Check className="h-3.5 w-3.5" />
              {adding ? 'Adding…' : 'Add to calendar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={adding} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
