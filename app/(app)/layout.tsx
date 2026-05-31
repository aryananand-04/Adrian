import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/chat/app-shell'
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
    <AppShell
      chats={chats ?? []}
      googleConnected={googleConnected}
      googleConfigured={googleConfigured}
    >
      {children}
    </AppShell>
  )
}
