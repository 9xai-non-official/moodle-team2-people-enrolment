-- Dependency: D-GRP-VIS  Issue: T2-GRP-004  Reviewed-by: Mahmoud
-- M05 — per-group visibility (Moodle GROUPS_VISIBILITY_*, DATA-008).
--
-- `participation` already exists (schema.sql:296) and is a separate axis:
-- visibility says who can SEE the group, participation says whether its
-- members act as a group. Mahmoud's scope logic consults both.
--
-- Default 'all' matches Moodle's `visibility DEFAULT 0`, so existing rows keep
-- today's behaviour — a safe forward migration.

do $$ begin
    create type group_visibility as enum ('all', 'members', 'own', 'none');
exception when duplicate_object then null; end $$;

alter table course_group
    add column if not exists visibility group_visibility not null default 'all';

insert into schema_migrations(version) values ('M05') on conflict do nothing;
