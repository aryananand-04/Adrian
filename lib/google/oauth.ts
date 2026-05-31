import type { SupabaseClient } from '@supabase/supabase-js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'openid',
  'email',
]

/**
 * Resolve the OAuth callback URL.
 *
 * Derives it from the actual incoming request (host + proto) so it is correct
 * on localhost, Vercel previews, and production without per-env config. Falls
 * back to GOOGLE_REDIRECT_URI, then localhost, only when no request is given.
 * The value used here MUST be listed under "Authorized redirect URIs" in the
 * Google Cloud Console OAuth client, and must match between the auth request
 * and the token exchange.
 */
export function googleRedirectUri(req?: Request): string {
  if (req) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    if (host) {
      const proto =
        req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
      return `${proto}://${host}/api/google/callback`
    }
  }
  return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'
}

export function buildGoogleAuthUrl(state: string, req?: Request): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh token on every connect
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

export async function exchangeCodeForTokens(code: string, req?: Request): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(req),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json()
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  return res.json()
}

export async function storeGoogleTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: TokenResponse
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const base = {
    user_id: userId,
    access_token: tokens.access_token,
    expiry_date: expiry,
    scope: tokens.scope ?? '',
    updated_at: new Date().toISOString(),
  }
  // Google only returns a refresh_token on first consent (or with prompt=consent).
  // Don't overwrite a stored one with null if it's missing.
  if (tokens.refresh_token) {
    await supabase.from('google_connections').upsert({ ...base, refresh_token: tokens.refresh_token })
  } else {
    await supabase.from('google_connections').update(base).eq('user_id', userId)
  }
}

export async function isGoogleConnected(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('google_connections')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

/** Returns a non-expired access token, refreshing if needed. Null if not connected. */
export async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: conn } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (!conn) return null

  if (new Date(conn.expiry_date).getTime() > Date.now() + 60_000) {
    return conn.access_token
  }

  try {
    const refreshed = await refreshAccessToken(conn.refresh_token)
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    await supabase
      .from('google_connections')
      .update({ access_token: refreshed.access_token, expiry_date: newExpiry, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    return refreshed.access_token
  } catch (err) {
    console.error('[google] token refresh failed:', err)
    return null
  }
}
