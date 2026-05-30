'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CharacterMemory } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Brain, Trash2, Pencil, Check, X, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type PersonalityLite = { id: string; name: string }

export function MemoryManager({
  userId,
  personalities,
  memories,
}: {
  userId: string
  personalities: PersonalityLite[]
  memories: CharacterMemory[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  // Manual add
  const [newContent, setNewContent] = useState('')
  const [newPersonalityId, setNewPersonalityId] = useState(personalities[0]?.id ?? '')
  const [adding, setAdding] = useState(false)

  const groups = personalities
    .map(p => ({ personality: p, items: memories.filter(m => m.personality_id === p.id) }))
    .filter(g => g.items.length > 0)

  async function addMemory() {
    const content = newContent.trim()
    if (!content || !newPersonalityId) return
    setAdding(true)
    // Manual memories get higher importance so they rank above auto-extracted ones.
    const { error } = await supabase.from('character_memories').insert({
      user_id: userId,
      personality_id: newPersonalityId,
      content,
      importance: 3,
    })
    if (error) {
      const missingTable = error.code === 'PGRST205' || /could not find the table/i.test(error.message)
      toast.error(
        missingTable
          ? 'Memory storage isn’t set up yet — run the character_memories migration in Supabase.'
          : 'Failed to add memory'
      )
    } else {
      toast.success('Memory added')
      setNewContent('')
      router.refresh()
    }
    setAdding(false)
  }

  async function remove(id: string) {
    const { error } = await supabase.from('character_memories').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Memory removed')
      router.refresh()
    }
  }

  async function saveEdit(id: string) {
    const content = draft.trim()
    if (!content) return
    const { error } = await supabase.from('character_memories').update({ content }).eq('id', id)
    if (error) {
      toast.error('Failed to save')
    } else {
      setEditingId(null)
      router.refresh()
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-brand" />
            Memories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            What each personality knows about you. They build up from chats — and you can add your own.
          </p>
        </header>

        {/* Manual add */}
        {personalities.length > 0 && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4 text-brand" />
              Add a memory
            </div>
            <Textarea
              placeholder="e.g. Her birthday is March 4th. She loves oat-milk lattes."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              disabled={adding}
            />
            <div className="flex items-center gap-2">
              <Select value={newPersonalityId} onValueChange={v => v && setNewPersonalityId(v)}>
                <SelectTrigger size="sm" className="min-w-40">
                  <SelectValue placeholder="Personality">
                    {(value: string | null) =>
                      personalities.find(p => p.id === value)?.name ?? 'Personality'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {personalities.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="bg-brand text-brand-foreground hover:opacity-90 gap-1.5 ml-auto"
                onClick={addMemory}
                disabled={adding || !newContent.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                {adding ? 'Adding…' : 'Add memory'}
              </Button>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No memories yet. They build up as you chat, or add one above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ personality, items }) => (
              <section key={personality.id}>
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  {personality.name} · {items.length}
                </h2>
                <div className="space-y-2">
                  {items.map(m => (
                    <div key={m.id} className="group rounded-xl border border-border bg-card p-3">
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            rows={2}
                            className="resize-none text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="bg-brand text-brand-foreground hover:opacity-90 gap-1.5" onClick={() => saveEdit(m.id)}>
                              <Check className="h-3.5 w-3.5" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="gap-1.5">
                              <X className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm">{m.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Edit memory"
                              onClick={() => {
                                setEditingId(m.id)
                                setDraft(m.content)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Delete memory"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => remove(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
