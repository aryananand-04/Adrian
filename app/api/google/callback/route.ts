import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, storeGoogleTokens } from '@/lib/google/oauth'

/** External origin of this request, honoring Vercel's proxy headers. */
function requestOrigin(req: Request): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) {
    const proto =
      req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return new URL(req.url).origin
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const origin = requestOrigin(req)
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
    const tokens = await exchangeCodeForTokens(code, req)
    await storeGoogleTokens(supabase, user.id, tokens)
  } catch (err) {
    console.error('[google] callback failed:', err)
    return NextResponse.redirect(`${origin}/?google=error`)
  }

  const res = NextResponse.redirect(`${origin}/?google=connected`)
  res.cookies.delete('google_oauth_state')
  return res
}
