-- msteams plugin migration 001 — course ↔ MS Teams team mapping.
-- Applied ONLY via `python -m app.plugin_cli install msteams` (single-DDL-
-- writer rule) and ledgered in plugin_migration. Idempotent.

create table if not exists msteams_course_team (
    course_id    bigint primary key references course(id),
    aad_group_id text,
    status       text not null default 'pending'
                 check (status in ('pending','ready','failed','archived')),
    error        text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

alter table msteams_course_team enable row level security;
