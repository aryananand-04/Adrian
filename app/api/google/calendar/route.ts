import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/oauth'
import { createCalendarEvent } from '@/lib/google/api'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { summary, start, end, description } = await req.json()
    if (!summary || !start || !end) {
      return NextResponse.json({ error: 'Missing summary, start, or end' }, { status: 400 })
    }

    const accessToken = await getValidAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
    }

    const result = await createCalendarEvent(accessToken, { summary, start, end, description })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[google/calendar]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add event' },
      { status: 500 }
    )
  }
}
