-- Dependency: D-CRIT  Issue: T2-PRG-003  Reviewed-by: Mahdi
-- M04 — completion criteria substrate (mirrors Moodle's criteria tables,
-- DATA-012). Essa delivers tables + constraints only; the ALL/ANY aggregation
-- compute is Mahdi's.
--
-- crit_compl's FKs to app_user/course are deliberately NON-cascading, exactly
-- like course_completion (schema.sql:337-341): criteria results survive
-- unenrolment and course soft-delete (HIS-002).

do $$ begin
    create type completion_aggregation as enum ('all', 'any');
exception when duplicate_object then null; end $$;

do $$ begin
    create type completion_crit_type as enum
        ('self', 'date', 'unenrol', 'activity', 'duration', 'grade', 'role', 'course');
exception when duplicate_object then null; end $$;

create table if not exists course_completion_criteria (
    id            bigint generated always as identity primary key,
    course_id     bigint not null references course(id) on delete cascade,
    criteria_type completion_crit_type not null,
    activity_id   bigint references course_activity(id) on delete cascade,
    grade_pass    numeric(10,5),
    time_end      timestamptz,
    enrol_period  interval,
    role_id       bigint references role(id),
    config        jsonb not null default '{}'::jsonb,
    created_at    timestamptz not null default now()
);
create index if not exists idx_ccc_course
    on course_completion_criteria(course_id);

create table if not exists course_completion_aggr_methd (
    id            bigint generated always as identity primary key,
    course_id     bigint not null references course(id) on delete cascade,
    criteria_type completion_crit_type,   -- NULL = overall course aggregation
    method        completion_aggregation not null default 'all',
    unique (course_id, criteria_type)
);

create table if not exists course_completion_crit_compl (
    id             bigint generated always as identity primary key,
    user_id        bigint not null references app_user(id),   -- NO cascade: survives (HIS-002)
    course_id      bigint not null references course(id),     -- NO cascade
    criteria_id    bigint not null references course_completion_criteria(id) on delete cascade,
    grade_final    numeric(10,5),
    unenrolled_at  timestamptz,
    time_completed timestamptz,
    unique (user_id, course_id, criteria_id)
);
create index if not exists idx_cccc_user_course
    on course_completion_crit_compl(user_id, course_id);

alter table course_completion_criteria    enable row level security;
alter table course_completion_aggr_methd  enable row level security;
alter table course_completion_crit_compl  enable row level security;

insert into schema_migrations(version) values ('M04') on conflict do nothing;
