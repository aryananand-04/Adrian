import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ensureTodaysChat } from '@/lib/chat/daily'
import { Sparkles } from 'lucide-react'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chat = await ensureTodaysChat(supabase, user.id)

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center text-center text-muted-foreground p-8">
        <div>
          <Sparkles className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <h1 className="text-xl font-semibold text-foreground mb-1">No personalities available</h1>
          <p className="text-sm">Personalities are configured in the database.</p>
        </div>
      </div>
    )
  }

  redirect(`/chat/${chat.id}`)
}
