import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/oauth'
import { sendEmail } from '@/lib/google/api'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { to, subject, body } = await req.json()
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 })
    }

    const accessToken = await getValidAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
    }

    const result = await sendEmail(accessToken, { to, subject, body })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[google/send]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Send failed' },
      { status: 500 }
    )
  }
}
