import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemoryManager } from '@/components/chat/memory-manager'

export default async function MemoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: personalities }, { data: memories }] = await Promise.all([
    supabase.from('personalities').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('character_memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return <MemoryManager userId={user.id} personalities={personalities ?? []} memories={memories ?? []} />
}
