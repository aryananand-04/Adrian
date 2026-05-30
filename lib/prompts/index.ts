import type { Personality, CharacterMemory } from '@/types'

function buildPersonalityContext(personality: Personality): string {
  const parts: string[] = []
  parts.push(`Your name/persona: ${personality.name}`)
  if (personality.description) {
    parts.push(`About you: ${personality.description}`)
  }
  if (personality.backstory) {
    parts.push(`Your backstory (what you've done and been through): ${personality.backstory}`)
  }
  if (personality.tone.length > 0) {
    parts.push(`Tone: ${personality.tone.join(', ')}`)
  }
  if (personality.traits.length > 0) {
    parts.push(`Traits: ${personality.traits.join(', ')}`)
  }
  if (personality.sample_phrases.length > 0) {
    parts.push(`Example phrases you use:\n${personality.sample_phrases.map(p => `  - "${p}"`).join('\n')}`)
  }
  return parts.join('\n')
}

function buildMemoryContext(memories: CharacterMemory[]): string {
  if (memories.length === 0) return ''
  const lines = memories.map(m => `  - ${m.content}`).join('\n')
  return `\n\nWhat you remember about them / your shared history so far (let it naturally inform your replies, don't recite it):\n${lines}`
}

export function buildChatSystemPrompt(personality: Personality, memories: CharacterMemory[] = []): string {
  return `You are roleplaying as the following character. Stay fully in character at all times.

${buildPersonalityContext(personality)}${buildMemoryContext(memories)}

Respond exactly as this character would, matching their tone, traits, and voice — do not soften or add warmth that isn't part of who they are.

Keep replies short and human, like a real text message — usually 1-2 sentences, rarely more than 3. Write casually: use contractions and natural phrasing, and let the personality show. Don't sound formal, robotic, or like an essay, and never use bullet points or over-explain.`
}

// The opener for a new day's chat: a warm good-morning in the character's voice,
// with a short thoughtful line/quote to make her day.
export function buildGoodMorningPrompt(
  personality: Personality,
  memories: CharacterMemory[] = [],
  briefing?: string
): { system: string; user: string } {
  const briefingBlock = briefing
    ? `\n\nToday's real-world context (weave in only what's genuinely relevant, in your own words — never list it out):\n${briefing}`
    : ''
  return {
    system: buildChatSystemPrompt(personality, memories),
    user: `It's the start of a new day. Send her a good morning message to genuinely make her day — warm and thoughtful, written entirely in your own voice and style. If something you remember about her is relevant, let it show naturally.${briefingBlock}\n\nWeave in one short, uplifting thought or quote. Keep it brief (2-3 sentences). Write only the message, nothing else.`,
  }
}
