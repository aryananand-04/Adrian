import type Groq from 'groq-sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/groq/client'
import { buildChatSystemPrompt } from '@/lib/prompts'
import { fetchMemories, extractAndStoreMemories } from '@/lib/memory'
import { getValidAccessToken } from '@/lib/google/oauth'
import { GOOGLE_TOOLS, executeToolCall } from '@/lib/google/tools'

type Msg = Groq.Chat.Completions.ChatCompletionMessageParam

// Llama-3.3 is flaky at tool-call formatting on Groq; use a tool-reliable model
// only when Google tools are active, and keep the personality model otherwise.
const TOOL_MODEL = 'openai/gpt-oss-120b'

// Record-separator marks the boundary between streamed reply text and trailing JSON meta.
const META_SEPARATOR = ''

const TOOLS_NOTE = `\n\nYou can manage the user's Google Calendar and Gmail through tools. When they ask to check their day or read email, call the right tool, then reply naturally and in character. Never invent results — rely on what the tools return.\n\nTo send an email call compose_email; to add a calendar event or reminder call create_calendar_event. BOTH only PREPARE something the user reviews and confirms with a button — they do NOT send or create anything themselves. After calling them, tell the user it's ready to review and confirm; never claim you already sent the email or added the event. Use ISO 8601 datetimes for events.`

type PendingEmail = { to: string; subject: string; body: string }
type PendingEvent = { summary: string; start: string; end: string; description?: string }

// Current local datetime as "YYYY-MM-DDTHH:mm:ss" in the given IANA timezone.
function localIsoNow(tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

function buildTimeNote(): string {
  const tz = process.env.GOOGLE_CALENDAR_TZ || 'Asia/Kolkata'
  const human = new Date().toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const iso = localIsoNow(tz)
  return `\n\nRight now it is ${human} (${tz}); in ISO that's ${iso}. Use this to resolve relative times like "in an hour", "tonight", or "tomorrow at 6pm" yourself — never ask the user for an absolute date/time when you can compute it from now. For create_calendar_event, give start/end as local ISO 8601 with NO timezone offset (e.g. ${iso}).`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatId, personalityId, messages } = await req.json()

  const { data: personality } = await supabase
    .from('personalities')
    .select('*')
    .eq('id', personalityId)
    .eq('user_id', user.id)
    .single()

  if (!personality) {
    return NextResponse.json({ error: 'Personality not found' }, { status: 404 })
  }

  const [accessToken, memories] = await Promise.all([
    getValidAccessToken(supabase, user.id),
    fetchMemories(supabase, user.id, personalityId),
  ])
  const toolsEnabled = !!accessToken

  const systemPrompt =
    buildChatSystemPrompt(personality, memories) + buildTimeNote() + (toolsEnabled ? TOOLS_NOTE : '')
  const convo: Msg[] = [{ role: 'system', content: systemPrompt }, ...messages]

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = ''
      let pendingEmail: PendingEmail | null = null
      let pendingEvent: PendingEvent | null = null

      try {
        // Agent loop: tool rounds resolve silently; the final round streams the answer.
        for (let step = 0; step < 5; step++) {
          const completion = await groq.chat.completions.create(
            {
              model: toolsEnabled ? TOOL_MODEL : MODEL,
              messages: convo,
              tools: toolsEnabled ? GOOGLE_TOOLS : undefined,
              temperature: 0.8,
              max_tokens: 600,
              stream: true,
            },
            { timeout: 30000, maxRetries: 0 }
          )

          let roundContent = ''
          const toolAcc: { id: string; name: string; args: string }[] = []

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta
            if (delta?.content) {
              roundContent += delta.content
              controller.enqueue(encoder.encode(delta.content))
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const i = tc.index ?? 0
                toolAcc[i] ??= { id: '', name: '', args: '' }
                if (tc.id) toolAcc[i].id = tc.id
                if (tc.function?.name) toolAcc[i].name += tc.function.name
                if (tc.function?.arguments) toolAcc[i].args += tc.function.arguments
              }
            }
          }

          const toolCalls = toolAcc.filter(Boolean)
          if (toolsEnabled && accessToken && toolCalls.length > 0) {
            convo.push({
              role: 'assistant',
              content: roundContent || null,
              tool_calls: toolCalls.map(t => ({
                id: t.id,
                type: 'function' as const,
                function: { name: t.name, arguments: t.args },
              })),
            } as Msg)

            for (const t of toolCalls) {
              let args: Record<string, unknown> = {}
              try {
                args = JSON.parse(t.args || '{}')
              } catch {
                args = {}
              }
              if (t.name === 'compose_email') {
                const a = args as Partial<PendingEmail>
                if (a.to && a.subject && a.body) pendingEmail = { to: a.to, subject: a.subject, body: a.body }
              }
              if (t.name === 'create_calendar_event') {
                const a = args as Partial<PendingEvent>
                if (a.summary && a.start && a.end) {
                  pendingEvent = { summary: a.summary, start: a.start, end: a.end, description: a.description }
                }
              }
              const result = await executeToolCall(t.name, args, accessToken)
              convo.push({ role: 'tool', tool_call_id: t.id, content: JSON.stringify(result) })
            }
            continue
          }

          reply = roundContent.trim()
          break
        }
      } catch (err) {
        console.error('[chat] stream failed:', err)
        if (!reply) {
          reply = "Hmm, I couldn't pull that off just now — mind trying again?"
          controller.enqueue(encoder.encode(reply))
        }
      }

      // Persist + learn (best-effort; never blocks the response).
      try {
        const lastUserMessage = messages[messages.length - 1]
        if (chatId && reply) {
          await supabase.from('messages').insert([
            { chat_id: chatId, role: 'user', content: lastUserMessage.content },
            { chat_id: chatId, role: 'assistant', content: reply },
          ])
        }
        if (reply && lastUserMessage?.content) {
          await extractAndStoreMemories(supabase, user.id, personalityId, lastUserMessage.content, reply)
        }
      } catch (err) {
        console.error('[chat] persist failed:', err)
      }

      controller.enqueue(encoder.encode(META_SEPARATOR + JSON.stringify({ pendingEmail, pendingEvent })))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
