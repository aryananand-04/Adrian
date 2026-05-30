import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chat }, { data: personalities }] = await Promise.all([
    supabase.from('chats').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('personalities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  if (!chat) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true })

  return (
    <ChatInterface
      chatId={chat.id}
      chatDate={chat.chat_date}
      initialMessages={messages ?? []}
      personalities={personalities ?? []}
      defaultPersonalityId={chat.personality_id}
    />
  )
}
