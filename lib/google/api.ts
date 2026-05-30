// Thin REST wrappers for Google Calendar + Gmail using a user access token.

const DEFAULT_TZ = process.env.GOOGLE_CALENDAR_TZ || 'Asia/Kolkata'

async function gFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error(json?.error?.message || `Google API error (${res.status})`)
  }
  return json
}

export type ListEventsArgs = { timeMin?: string; timeMax?: string; maxResults?: number }

export async function listCalendarEvents(accessToken: string, args: ListEventsArgs) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(args.maxResults ?? 10),
    timeMin: args.timeMin ?? new Date().toISOString(),
  })
  if (args.timeMax) params.set('timeMax', args.timeMax)
  const data = await gFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    accessToken
  )
  type CalEvent = {
    id: string
    summary?: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
  }
  const items: CalEvent[] = data.items ?? []
  return items.map(e => ({
    id: e.id,
    summary: e.summary ?? '(no title)',
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
  }))
}

export type CreateEventArgs = { summary: string; start: string; end: string; description?: string }

export async function createCalendarEvent(accessToken: string, args: CreateEventArgs) {
  const data = await gFetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        summary: args.summary,
        description: args.description,
        start: { dateTime: args.start, timeZone: DEFAULT_TZ },
        end: { dateTime: args.end, timeZone: DEFAULT_TZ },
      }),
    }
  )
  return { id: data.id, summary: data.summary, link: data.htmlLink, start: args.start, end: args.end }
}

export type ListEmailsArgs = { query?: string; maxResults?: number }

export async function listEmails(accessToken: string, args: ListEmailsArgs) {
  const params = new URLSearchParams({ maxResults: String(args.maxResults ?? 5) })
  if (args.query) params.set('q', args.query)
  const list = await gFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    accessToken
  )
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id)
  const header = (msg: { payload?: { headers?: { name: string; value: string }[] } }, name: string) =>
    msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
  const messages = await Promise.all(
    ids.map(id =>
      gFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        accessToken
      )
    )
  )
  return messages.map(m => ({
    from: header(m, 'From'),
    subject: header(m, 'Subject'),
    snippet: m.snippet ?? '',
  }))
}

function buildRawEmail(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body,
  ]
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

export type EmailArgs = { to: string; subject: string; body: string }

export async function sendEmail(accessToken: string, args: EmailArgs) {
  const raw = buildRawEmail(args.to, args.subject, args.body)
  const data = await gFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    accessToken,
    { method: 'POST', body: JSON.stringify({ raw }) }
  )
  return { id: data.id, status: 'sent', to: args.to, subject: args.subject }
}

export async function createDraft(accessToken: string, args: EmailArgs) {
  const raw = buildRawEmail(args.to, args.subject, args.body)
  const data = await gFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    accessToken,
    { method: 'POST', body: JSON.stringify({ message: { raw } }) }
  )
  return { id: data.id, status: 'draft_created', to: args.to, subject: args.subject }
}
