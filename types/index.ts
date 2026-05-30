export type Personality = {
  id: string
  user_id: string
  name: string
  description: string
  backstory: string
  tone: string[]
  traits: string[]
  sample_phrases: string[]
  is_default: boolean
  created_at: string
}

export type CharacterMemory = {
  id: string
  user_id: string
  personality_id: string
  content: string
  importance: number
  created_at: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type Message = {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type Chat = {
  id: string
  user_id: string
  personality_id: string
  chat_date: string
  created_at: string
}

export type ChatListItem = {
  id: string
  chat_date: string
}
