'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Calendar, Mail, Check, Plug } from 'lucide-react'

export function GoogleConnect({
  connected,
  configured,
}: {
  connected: boolean
  configured: boolean
}) {
  const router = useRouter()

  async function disconnect() {
    await fetch('/api/google/disconnect', { method: 'POST' })
    toast.success('Google disconnected')
    router.refresh()
  }

  if (!configured) {
    return (
      <p className="px-1 text-xs text-muted-foreground leading-relaxed">
        Google connectors not set up — add OAuth keys to <code>.env.local</code>.
      </p>
    )
  }

  if (connected) {
    return (
      <div className="rounded-lg border border-border p-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
          <Check className="h-3.5 w-3.5" /> Google connected
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <Mail className="h-3 w-3" />
          Calendar &amp; Gmail
        </div>
        <button
          onClick={disconnect}
          className="mt-2 rounded text-muted-foreground outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <a href="/api/google/connect" className="block">
      <Button variant="outline" size="sm" className="w-full gap-2">
        <Plug className="h-4 w-4" />
        Connect Google
      </Button>
    </a>
  )
}
