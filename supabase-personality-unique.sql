-- Fix duplicate personalities and prevent recurrence.
-- Run once in the Supabase SQL editor.

-- 1) De-duplicate existing rows: for each (user_id, name), keep the row that is
--    referenced by a chat if there is one, otherwise the oldest. Re-point any
--    chats/memories on a losing row to the kept row, then delete the losers.
with ranked as (
  select
    p.id,
    p.user_id,
    p.name,
    -- prefer rows referenced by a chat, then the oldest
    row_number() over (
      partition by p.user_id, p.name
      order by (exists (select 1 from chats c where c.personality_id = p.id)) desc,
               p.created_at asc
    ) as rn,
    first_value(p.id) over (
      partition by p.user_id, p.name
      order by (exists (select 1 from chats c where c.personality_id = p.id)) desc,
               p.created_at asc
    ) as keep_id
  from personalities p
),
losers as (
  select id, keep_id from ranked where rn > 1
)
-- repoint references off the losing rows before deleting them
, _chats as (
  update chats c set personality_id = l.keep_id
  from losers l where c.personality_id = l.id returning 1
)
, _mems as (
  update character_memories m set personality_id = l.keep_id
  from losers l where m.personality_id = l.id returning 1
)
delete from personalities where id in (select id from losers);

-- 2) Enforce one character name per user going forward.
create unique index if not exists personalities_user_name_unique
  on personalities (user_id, name);
