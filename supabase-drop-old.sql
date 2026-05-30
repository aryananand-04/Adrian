-- OPTIONAL cleanup: removes the old profiles feature and its now-unused tables.
-- Run AFTER supabase-migrate-daily-chats.sql (which detaches chats from profiles).
-- `chats`, `messages`, and `personalities` are kept — they are still used.

drop table if exists favorites cascade;
drop table if exists schedules cascade;
drop table if exists memories cascade;
drop table if exists love_languages cascade;
drop table if exists dreams_goals cascade;
drop table if exists favorite_foods cascade;
drop table if exists hobbies cascade;
drop table if exists important_dates cascade;
drop table if exists nicknames cascade;
drop table if exists profiles cascade;
