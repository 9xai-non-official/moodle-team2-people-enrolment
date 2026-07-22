-- Dependency: D-LMS  Issue: T2-LMS-001  Reviewed-by: Essa (DDL owner) + Team 1 (course/content)
-- M17 — content + request tables backing the /api/lms surface.
--
-- The staging frontend calls ~35 /api/lms/* endpoints (courses, user admin,
-- activities, quizzes, submissions, grading, catalog, course/enrol requests);
-- the router package app/routers/lms/ implements them. These tables back the
-- content + request parts. Course/content is nominally Team 1's domain and all
-- DDL is Essa's single-writer remit (migrations/README.md) — so this file is a
-- CHANGE REQUEST authored alongside the LMS router; review + ownership sit with
-- Essa. Every table references ONLY existing tables (app_user, course,
-- course_activity) and is idempotent (create table if not exists), so applying
-- it more than once, or after the router already ran, is a no-op.

-- Teacher-requested courses + user enrolment requests (requests.py).
create table if not exists course_request (
    id           bigint generated always as identity primary key,
    requester_id bigint not null references app_user(id),
    full_name    text not null,
    short_name   varchar(255) not null,
    reason       text not null default '',
    status       varchar(20) not null default 'pending'
                 check (status in ('pending','approved','rejected')),
    course_id    bigint references course(id),        -- set on approval
    requested_at timestamptz not null default now(),
    decided_by   bigint references app_user(id),
    decided_at   timestamptz
);

create table if not exists enrol_request (
    id           bigint generated always as identity primary key,
    course_id    bigint not null references course(id),
    user_id      bigint not null references app_user(id),
    message      text not null default '',
    status       varchar(20) not null default 'pending'
                 check (status in ('pending','approved','rejected','denied')),
    requested_at timestamptz not null default now(),
    decided_by   bigint references app_user(id),
    decided_at   timestamptz
);

-- Quiz content + attempts (quiz.py). Correct answers stay server-side.
create table if not exists quiz (
    activity_id      bigint primary key references course_activity(id),
    attempts_allowed integer not null default 1,
    grade_to_pass    integer not null default 0,
    created_at       timestamptz not null default now()
);

create table if not exists quiz_question (
    id          bigint generated always as identity primary key,
    activity_id bigint not null references course_activity(id),
    kind        varchar(20) not null,                 -- multichoice | truefalse | essay
    prompt      text not null,
    choices     jsonb not null default '[]'::jsonb,
    correct     jsonb,                                -- SERVER-ONLY key; null for essay
    points      integer not null default 1,
    created_at  timestamptz not null default now()
);
create index if not exists ix_quiz_question_activity on quiz_question(activity_id);

create table if not exists quiz_attempt (
    id          bigint generated always as identity primary key,
    activity_id bigint not null references course_activity(id),
    user_id     bigint not null references app_user(id),
    state       varchar(20) not null default 'in_progress',  -- in_progress | finished | graded
    score       integer,
    max_score   integer,
    started_at  timestamptz not null default now(),
    finished_at timestamptz
);
create index if not exists ix_quiz_attempt_activity_user on quiz_attempt(activity_id, user_id);

-- Decoupled by design: attempt_id/question_id are bare bigints (no FK to the
-- other new lms tables). The unique key powers answer upserts.
create table if not exists quiz_answer (
    id          bigint generated always as identity primary key,
    attempt_id  bigint not null,
    question_id bigint not null,
    response    jsonb,
    points      integer,
    feedback    text,
    updated_at  timestamptz not null default now(),
    unique (attempt_id, question_id)
);
create index if not exists ix_quiz_answer_attempt on quiz_answer(attempt_id);

-- Assignment submissions + grades (grade.py).
create table if not exists assignment_submission (
    id                bigint generated always as identity primary key,
    activity_id       bigint not null references course_activity(id),
    user_id           bigint not null references app_user(id),
    body              jsonb  not null default '{}'::jsonb,
    submission_status varchar(20) not null default 'draft',
    submitted_at      timestamptz,
    updated_at        timestamptz not null default now(),
    unique (activity_id, user_id)
);

create table if not exists grade (
    id          bigint generated always as identity primary key,
    activity_id bigint not null references course_activity(id),
    user_id     bigint not null references app_user(id),
    points      numeric,
    max_points  numeric not null default 100,
    feedback    text,
    state       varchar(20) not null default 'graded',
    graded_by   bigint references app_user(id),
    graded_at   timestamptz not null default now(),
    unique (activity_id, user_id)
);

insert into schema_migrations(version) values ('M17') on conflict do nothing;
