-- REQUIRED: run once in the Supabase SQL editor to enable one-chat-per-day.
-- Upgrades the existing `chats` table; `messages` is already compatible.

-- Remove the old profile link (chats are no longer tied to a profile).
alter table chats drop column if exists profile_id;

-- Each chat belongs to a calendar day.
alter table chats add column if not exists chat_date date not null default current_date;

-- Enforce the cap: at most one chat per user per day.
create unique index if not exists chats_user_date_unique on chats (user_id, chat_date);

-- (RLS and the "Users can manage their chats" / messages policies already exist
--  from the original schema, so nothing to add here.)
