import type { SupabaseClient } from '@supabase/supabase-js'
import type { Chat, Personality } from '@/types'
import { groq, MODEL } from '@/lib/groq/client'
import { buildGoodMorningPrompt } from '@/lib/prompts'
import { pickDefaultPersonalityObject, PERSONALITY_PRESETS } from '@/lib/personality'
import { fetchMemories } from '@/lib/memory'
import { getValidAccessToken } from '@/lib/google/oauth'
import { listCalendarEvents } from '@/lib/google/api'
import { getWeatherSummary } from '@/lib/weather'

// A short real-world briefing (date + weather + today's calendar) for the opener.
async function buildBriefing(supabase: SupabaseClient, userId: string): Promise<string> {
  const now = new Date()
  const parts: string[] = [
    `It is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
  ]

  const weather = await getWeatherSummary()
  if (weather) parts.push(`Weather: ${weather}.`)

  try {
    const token = await getValidAccessToken(supabase, userId)
    if (token) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
      const events = await listCalendarEvents(token, { timeMin: start, timeMax: end, maxResults: 5 })
      if (events.length > 0) {
        const list = events
          .map(e => {
            const t =
              e.start && e.start.includes('T')
                ? new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : null
            return t ? `${e.summary} at ${t}` : e.summary
          })
          .join('; ')
        parts.push(`On the calendar today: ${list}.`)
      } else {
        parts.push('The calendar is clear today.')
      }
    }
  } catch (err) {
    console.error('[daily] briefing calendar failed:', err)
  }

  return parts.join('\n')
}

// Local calendar date as YYYY-MM-DD (en-CA formats that way).
export function todayString(): string {
  return new Date().toLocaleDateString('en-CA')
}

// Ensure the user has the starting roster of characters, seeding the presets on
// their first visit. Returns the personality list to pick from.
async function ensurePersonalities(
  supabase: SupabaseClient,
  userId: string
): Promise<Personality[]> {
  const { data: existing } = await supabase
    .from('personalities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (existing && existing.length > 0) return existing

  // Upsert on (user_id, name) so two concurrent first-visit requests (e.g. a
  // prefetch racing the real navigation) can't create duplicate characters.
  const { error } = await supabase
    .from('personalities')
    .upsert(
      PERSONALITY_PRESETS.map(p => ({ user_id: userId, ...p })),
      { onConflict: 'user_id,name', ignoreDuplicates: true }
    )
  if (error) {
    console.error('[daily] personality seeding failed:', error)
  }

  // Re-read so we return exactly one row per character regardless of races.
  const { data: seeded } = await supabase
    .from('personalities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return seeded ?? []
}

// Generate and store the one good-morning opener for a freshly created chat.
async function writeOpener(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  personalityId: string
): Promise<void> {
  const { data: personality } = await supabase
    .from('personalities')
    .select('*')
    .eq('id', personalityId)
    .single()
  if (!personality) return

  const [memories, briefing] = await Promise.all([
    fetchMemories(supabase, userId, personalityId),
    buildBriefing(supabase, userId),
  ])
  const { system, user } = buildGoodMorningPrompt(personality, memories, briefing)

  let opener = 'Good morning. Hope today treats you kindly. ☀️'
  try {
    const completion = await groq.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.9,
        max_tokens: 200,
      },
      { timeout: 30000, maxRetries: 0 }
    )
    opener = completion.choices[0]?.message?.content?.trim() || opener
  } catch (err) {
    console.error('[daily] good-morning generation failed:', err)
  }

  await supabase.from('messages').insert({ chat_id: chatId, role: 'assistant', content: opener })
}

/**
 * Returns today's chat for the user, creating it (one per day) if needed.
 * The good-morning opener is written exactly once — only by the request that wins
 * the chat insert — so concurrent visits/prefetches can't produce duplicate openers.
 * Returns null only when the user has no personalities to chat with.
 */
export async function ensureTodaysChat(
  supabase: SupabaseClient,
  userId: string
): Promise<Chat | null> {
  const today = todayString()

  const { data: existing } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .eq('chat_date', today)
    .maybeSingle()

  if (existing) return existing

  const personalities = await ensurePersonalities(supabase, userId)

  const personality = pickDefaultPersonalityObject(personalities)
  if (!personality) return null

  const { data: created, error } = await supabase
    .from('chats')
    .insert({ user_id: userId, personality_id: personality.id, chat_date: today })
    .select()
    .single()

  if (error || !created) {
    // Lost the race to a concurrent request (unique index on user_id+chat_date).
    // That request owns the opener; we just return the existing chat.
    const { data: raced } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('chat_date', today)
      .single()
    return raced
  }

  // We created the chat — we (and only we) write the single opener.
  await writeOpener(supabase, userId, created.id, personality.id)
  return created
}
