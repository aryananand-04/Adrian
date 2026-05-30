import type { Personality } from '@/types'

// Prefer the personality named "Aryan", then any flagged default, then the first.
export function pickDefaultPersonalityObject(personalities: Personality[]): Personality | null {
  if (personalities.length === 0) return null
  return (
    personalities.find(p => p.name.trim().toLowerCase() === 'aryan') ??
    personalities.find(p => p.is_default) ??
    personalities[0]
  )
}

export function pickDefaultPersonality(personalities: Personality[]): string {
  return pickDefaultPersonalityObject(personalities)?.id ?? ''
}
