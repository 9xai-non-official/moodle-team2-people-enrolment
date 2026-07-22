-- Dependency: D-SNAP  Issue: T2-PRG-004  Reviewed-by: Mahdi
-- M14 — CONDITIONAL. NOT APPLIED BY THE RUNNER.
--
-- ============================ DO NOT APPLY YET =============================
-- This migration ships ONLY if the team chooses HC-05 Option A. It lives in
-- migrations/conditional/ so apply.py skips it. To adopt: move the file up
-- into migrations/ and merge as a normal PR.
-- ===========================================================================
--
-- HC-05 asks for a three-year progress timeline. Today that timeline is
-- FABRICATED IN THE FRONTEND — mocks/progress.js:317-344 invents the series;
-- there is no table and no endpoint behind it. Two honest ways out:
--
--   Option A (this file): persist a real longitudinal ledger, so the report
--     stops being a mock. Also partially serves T2-DATA-001. Costs a capture
--     job (Mahdi's) and a new table that must be maintained.
--
--   Option B (RECOMMENDED): delete the fabricated timeline and scope the
--     feature honestly to current-state reporting — which ALREADY exceeds
--     Moodle, because our v_course_progress reports across soft-deleted
--     courses and Moodle's cannot. Costs nothing and ships today.
--
-- Recommendation is Option B unless the team explicitly wants the time-series.
-- §29 open decision 3.
--
-- Shape below is append-only and non-cascading: a historical ledger that
-- disappears when its subject is unenrolled or soft-deleted is not a ledger.

create table if not exists completion_snapshot (
    id               bigint generated always as identity primary key,
    user_id          bigint not null references app_user(id),  -- NO cascade: history survives
    course_id        bigint not null references course(id),    -- NO cascade
    captured_at      timestamptz not null default now(),
    enrolment_status enrolment_status,        -- point-in-time, not current
    activities_done  int,
    activities_total int,
    percent          int,
    time_completed   timestamptz,
    detail           jsonb not null default '{}'::jsonb
);
create index if not exists idx_snapshot_user_course
    on completion_snapshot(user_id, course_id, captured_at);

alter table completion_snapshot enable row level security;

insert into schema_migrations(version) values ('M14') on conflict do nothing;
