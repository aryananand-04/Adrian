'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ChatListItem } from '@/types'
import { Heart, LogOut, MessageCircle, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleConnect } from '@/components/chat/google-connect'
import { ThemeToggle } from '@/components/chat/theme-toggle'
import { isToday, isYesterday, format, parseISO } from 'date-fns'

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

export function ChatSidebar({
  chats,
  googleConnected,
  googleConfigured,
}: {
  chats: ChatListItem[]
  googleConnected: boolean
  googleConfigured: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 flex-shrink-0 h-full bg-sidebar border-r border-border flex flex-col">
      <Link
        href="/"
        className="p-4 flex items-center gap-2 border-b border-border transition-colors hover:bg-muted/50"
      >
        <div className="p-1.5 rounded-lg bg-brand/10">
          <Heart className="h-4 w-4 text-brand" fill="currentColor" />
        </div>
        <span className="font-bold tracking-tight">Adrian</span>
      </Link>

      <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Daily chats
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {chats.length > 0 ? (
          chats.map(chat => {
            const active = pathname === `/chat/${chat.id}`
            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  active
                    ? 'bg-brand/10 text-brand font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                {dayLabel(chat.chat_date)}
              </Link>
            )
          })
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">No chats yet.</p>
        )}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <Link
          href="/memories"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            pathname === '/memories'
              ? 'bg-brand/10 text-brand font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Brain className="h-4 w-4" />
          Memories
        </Link>
        <GoogleConnect connected={googleConnected} configured={googleConfigured} />
        <ThemeToggle />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
