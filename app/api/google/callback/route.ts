import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, storeGoogleTokens } from '@/lib/google/oauth'

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code) {
    return NextResponse.redirect(`${origin}/?google=error`)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('google_oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${origin}/?google=state_mismatch`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const tokens = await exchangeCodeForTokens(code)
    await storeGoogleTokens(supabase, user.id, tokens)
  } catch (err) {
    console.error('[google] callback failed:', err)
    return NextResponse.redirect(`${origin}/?google=error`)
  }

  const res = NextResponse.redirect(`${origin}/?google=connected`)
  res.cookies.delete('google_oauth_state')
  return res
}
