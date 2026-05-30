-- REQUIRED for Google connectors: run once in the Supabase SQL editor.
-- Stores each user's Google OAuth tokens (Gmail + Calendar).

create table if not exists google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expiry_date timestamptz not null,
  scope text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table google_connections enable row level security;

create policy "Users manage their google connection" on google_connections
  for all using (auth.uid() = user_id);
