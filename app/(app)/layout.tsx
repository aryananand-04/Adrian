import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { isGoogleConnected } from '@/lib/google/oauth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chats }, googleConnected] = await Promise.all([
    supabase
      .from('chats')
      .select('id, chat_date')
      .eq('user_id', user.id)
      .order('chat_date', { ascending: false }),
    isGoogleConnected(supabase, user.id),
  ])

  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        chats={chats ?? []}
        googleConnected={googleConnected}
        googleConfigured={googleConfigured}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
