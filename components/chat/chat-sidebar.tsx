'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ChatListItem } from '@/types'
import {
  Heart,
  LogOut,
  MessageCircle,
  Brain,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
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
  mobileOpen,
  collapsed,
  onClose,
  onToggleCollapsed,
}: {
  chats: ChatListItem[]
  googleConnected: boolean
  googleConfigured: boolean
  mobileOpen: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapsed: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // `collapsed` only takes visual effect on lg+. On mobile the drawer is always full width.
  const labelHidden = cn(collapsed && 'lg:hidden')

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:static lg:z-auto lg:translate-x-0',
        collapsed && 'lg:w-16'
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <Link
          href="/"
          onClick={onClose}
          className={cn(
            'flex items-center gap-2 overflow-hidden transition-colors',
            collapsed && 'lg:w-full lg:justify-center'
          )}
        >
          <div className="shrink-0 rounded-lg bg-brand/10 p-1.5">
            <Heart className="h-4 w-4 text-brand" fill="currentColor" />
          </div>
          <span className={cn('font-bold tracking-tight whitespace-nowrap', labelHidden)}>
            Adrian
          </span>
        </Link>
        {/* Close button — drawer only */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className={cn(
          'px-3 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground',
          labelHidden
        )}
      >
        Daily chats
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {chats.length > 0 ? (
          chats.map(chat => {
            const active = pathname === `/chat/${chat.id}`
            const label = dayLabel(chat.chat_date)
            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                onClick={onClose}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  collapsed && 'lg:justify-center',
                  active
                    ? 'bg-brand/10 text-brand font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className={cn('truncate', labelHidden)}>{label}</span>
              </Link>
            )
          })
        ) : (
          <p className={cn('px-3 py-2 text-sm text-muted-foreground', labelHidden)}>
            No chats yet.
          </p>
        )}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <Link
          href="/memories"
          onClick={onClose}
          title={collapsed ? 'Memories' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            collapsed && 'lg:justify-center',
            pathname === '/memories'
              ? 'bg-brand/10 text-brand font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Brain className="h-4 w-4 shrink-0" />
          <span className={labelHidden}>Memories</span>
        </Link>

        {/* Google connect needs its label, so hide it entirely on the collapsed rail. */}
        <div className={labelHidden}>
          <GoogleConnect connected={googleConnected} configured={googleConfigured} />
        </div>
        <ThemeToggle />

        <Button
          variant="ghost"
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'w-full gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            collapsed ? 'justify-start lg:justify-center' : 'justify-start'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={labelHidden}>Sign Out</span>
        </Button>

        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex',
            collapsed && 'lg:justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
