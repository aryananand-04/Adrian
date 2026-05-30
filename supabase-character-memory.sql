-- REQUIRED for character backstory + evolving memory. Run once in the Supabase SQL editor.

-- Authored backstory (what the character has done / been through), written by you per character.
alter table personalities add column if not exists backstory text not null default '';

-- Memories the character accumulates from conversations, scoped per (user, personality).
-- Named character_memories to avoid colliding with the legacy profiles-era `memories` table.
create table if not exists character_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  personality_id uuid references personalities(id) on delete cascade not null,
  content text not null,
  importance int not null default 1,
  created_at timestamptz default now()
);

alter table character_memories enable row level security;

create policy "Users manage their character memories" on character_memories
  for all using (auth.uid() = user_id);

create index if not exists character_memories_idx
  on character_memories (user_id, personality_id, created_at desc);
