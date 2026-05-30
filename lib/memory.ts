import type { SupabaseClient } from '@supabase/supabase-js'
import type { CharacterMemory } from '@/types'
import { groq } from '@/lib/groq/client'

// Cheap, fast model just for pulling durable facts out of an exchange.
const EXTRACTION_MODEL = 'llama-3.1-8b-instant'
const MEMORY_LIMIT = 20

/** Most relevant memories for a (user, personality), newest/most-important first. */
export async function fetchMemories(
  supabase: SupabaseClient,
  userId: string,
  personalityId: string
): Promise<CharacterMemory[]> {
  const { data, error } = await supabase
    .from('character_memories')
    .select('*')
    .eq('user_id', userId)
    .eq('personality_id', personalityId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MEMORY_LIMIT)
  if (error) return []
  return data ?? []
}

/**
 * Extract 0-3 durable facts worth remembering from the latest exchange and store them.
 * Best-effort: never throws, so it can't break the chat response.
 */
export async function extractAndStoreMemories(
  supabase: SupabaseClient,
  userId: string,
  personalityId: string,
  userText: string,
  assistantText: string
): Promise<void> {
  try {
    const completion = await groq.chat.completions.create(
      {
        model: EXTRACTION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You extract durable, long-term facts worth remembering about the user from a chat exchange — life events, relationships, preferences, ongoing situations, plans, feelings that persist. Ignore small talk and anything ephemeral. Respond ONLY with a JSON array of short factual strings (max 3). If nothing is worth remembering, respond with [].',
          },
          {
            role: 'user',
            content: `User said: "${userText}"\nCharacter replied: "${assistantText}"\n\nReturn the JSON array of durable facts about the user.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      },
      { timeout: 15000, maxRetries: 0 }
    )

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]'
    const facts = parseFacts(raw)
    if (facts.length === 0) return

    await supabase.from('character_memories').insert(
      facts.map(content => ({
        user_id: userId,
        personality_id: personalityId,
        content,
        importance: 1,
      }))
    )
  } catch (err) {
    console.error('[memory] extraction failed:', err)
  }
}

function parseFacts(raw: string): string[] {
  // Tolerate models that wrap JSON in prose or code fences.
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((f): f is string => typeof f === 'string')
      .map(f => f.trim())
      .filter(Boolean)
      .slice(0, 3)
  } catch {
    return []
  }
}
