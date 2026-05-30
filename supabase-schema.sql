-- Run this in your Supabase SQL editor for a fresh setup.
-- Adrian is a chat app with one chat per day. Personalities are picked in the
-- chatbox; each day's chat opens with a good-morning message in that voice.

create table if not exists personalities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  backstory text not null default '',
  tone text[] default '{}',
  traits text[] default '{}',
  sample_phrases text[] default '{}',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Memories the character accumulates from conversations, per (user, personality).
create table if not exists character_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  personality_id uuid references personalities(id) on delete cascade not null,
  content text not null,
  importance int not null default 1,
  created_at timestamptz default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  personality_id uuid references personalities(id) on delete cascade not null,
  chat_date date not null default current_date,
  created_at timestamptz default now(),
  unique (user_id, chat_date)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table personalities enable row level security;
alter table character_memories enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;

create policy "Users can manage their personalities" on personalities
  for all using (auth.uid() = user_id);

create policy "Users manage their character memories" on character_memories
  for all using (auth.uid() = user_id);

create policy "Users can manage their chats" on chats
  for all using (auth.uid() = user_id);

create policy "Users can manage messages in their chats" on messages
  for all using (
    exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );
