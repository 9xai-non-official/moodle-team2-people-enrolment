-- Dependency: D-GRP-AVAIL  Issue: T2-GRP-005  Reviewed-by: Mahmoud
-- M06 — activity availability restrictions by group / grouping.
--
-- Modelled relationally rather than as Moodle's opaque JSON `availability`
-- blob on course_modules: a real table means real FKs, a real CHECK, and a
-- queryable restriction set. The CHECK enforces that a row targets exactly one
-- of group / grouping — never both, never neither.
--
-- Enforcement (hide vs grey out) is Mahmoud's; this is the substrate only.

do $$ begin
    create type availability_display as enum ('hidden', 'greyed');
exception when duplicate_object then null; end $$;

create table if not exists activity_availability (
    id          bigint generated always as identity primary key,
    activity_id bigint not null references course_activity(id) on delete cascade,
    group_id    bigint references course_group(id) on delete cascade,
    grouping_id bigint references grouping(id) on delete cascade,
    display     availability_display not null default 'greyed',
    created_at  timestamptz not null default now(),
    check ((group_id is not null)::int + (grouping_id is not null)::int = 1)
);
create index if not exists idx_availability_activity
    on activity_availability(activity_id);

alter table activity_availability enable row level security;

insert into schema_migrations(version) values ('M06') on conflict do nothing;
