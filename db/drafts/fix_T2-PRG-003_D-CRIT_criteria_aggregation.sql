-- D-CRIT (T2-PRG-003) — per-course completion criteria + ALL/ANY aggregation.
-- Owner: Essa (DDL). Consumed by Mahdi's progress engine, which falls back to
-- "ALL completion-enabled activities" until rows exist. Idempotent.

create table if not exists course_completion_setting (
    course_id   bigint primary key references course(id) on delete cascade,
    aggregation text not null default 'all' check (aggregation in ('all','any')),
    updated_at  timestamptz not null default now()
);

create table if not exists completion_criteria (
    id          bigint generated always as identity primary key,
    course_id   bigint not null references course(id) on delete cascade,
    activity_id bigint not null references course_activity(id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (course_id, activity_id)
);
create index if not exists idx_completion_criteria_course on completion_criteria(course_id);

alter table course_completion_setting enable row level security;
alter table completion_criteria       enable row level security;

-- completion:override capability grants (idempotent) — manager + editingteacher
-- at system context, matching Moodle completion:overrideactivitycompletion.
insert into role_capability (role_id, context_id, capability, permission)
select r.id, (select id from context where level='system'), 'completion:override', 'allow'
  from role r
 where r.short_name in ('manager','editingteacher')
on conflict (role_id, context_id, capability) do nothing;

-- Seed CS101 (course 3): ALL of the three completion-enabled activities, so
-- per-course criteria + aggregation is demoable immediately.
insert into course_completion_setting (course_id, aggregation)
values (3, 'all') on conflict (course_id) do nothing;

insert into completion_criteria (course_id, activity_id)
select 3, ca.id from course_activity ca
 where ca.course_id = 3 and ca.completion_enabled and ca.deleted_at is null
on conflict (course_id, activity_id) do nothing;
