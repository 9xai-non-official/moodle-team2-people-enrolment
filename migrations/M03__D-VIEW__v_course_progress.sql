-- Dependency: D-VIEW  Issue: T2-PRG-001/005  Reviewed-by: Mahdi
-- M03 — rewrite v_course_progress.
--
-- Defects in the baseline view (schema.sql:442-457):
--   1. Numerator and denominator were computed over DIFFERENT sets. The
--      denominator filtered on `completion_enabled AND deleted_at IS NULL`;
--      the numerator counted any activity_completion row for the course, with
--      no filter at all. A completion on a hidden or non-tracked activity
--      therefore inflated the numerator past the denominator -> >100% and
--      false "complete".
--   2. No clamp.
--   3. complete_fail counted as done (it is a *failed* attempt, not progress).
--   4. No enrolment gate — unenrolled users still appeared (T2-PRG-005).
--   5. The denominator was a per-row correlated subquery, re-executed for
--      every completion row.
--
-- Moodle computes both sides over one tracked set and gates on
-- is_tracked_user() (active enrolment) — completionlib.php.
--
-- Preserved on purpose: soft-deleted COURSES stay in the view (HC-05,
-- schema.sql:441). The gate is on enrolment, not on course.deleted_at.
-- Completion rows survive unenrolment (schema.sql:337-341) and resurface on
-- re-enrol (regression guard PRG-031) because the gate is an exposed boolean,
-- not an inner join.
--
-- Per-user group-allowed refinement is deliberately NOT here; it depends on
-- D-GRP-VIS/D-GRP-AVAIL and ships as a follow-up so Mahdi is not blocked.

create or replace view v_course_progress as
with tracked as (
    -- The tracked set, defined exactly once and used by both sides.
    select a.id as activity_id, a.course_id
    from course_activity a
    where a.completion_enabled
      and a.visible
      and a.deleted_at is null
),
tracked_total as (
    -- Denominator, computed once per course rather than once per row.
    -- bigint, not int: matches the baseline view's column types so
    -- `create or replace view` is legal and no client sees a type change.
    select course_id, count(*) as activities_total
    from tracked
    group by course_id
)
select
    cc.user_id,
    cc.course_id,
    c.short_name,
    (c.deleted_at is not null)                                as course_deleted,
    cc.time_completed,

    -- Column ORDER matches the baseline view (activities_done before
    -- activities_total) so `create or replace view` is legal and Mahdi's
    -- existing positional reads keep working. New columns are appended only.
    count(ac.id) filter (
        where ac.state in ('complete', 'complete_pass')
    )                                                         as activities_done,

    coalesce(tt.activities_total, 0)                          as activities_total,

    -- NULL when nothing is tracked: no denominator, so no honest percentage.
    case
        when coalesce(tt.activities_total, 0) = 0 then null
        else least(
                 100,
                 round(
                     100.0 * count(ac.id) filter (
                         where ac.state in ('complete', 'complete_pass')
                     ) / tt.activities_total
                 )
             )::int
    end                                                       as percent,

    -- Never derived from a >100 artifact.
    (
        cc.time_completed is not null
        or (
            coalesce(tt.activities_total, 0) > 0
            and count(ac.id) filter (
                    where ac.state in ('complete', 'complete_pass')
                ) = tt.activities_total
        )
    )                                                         as is_complete,

    -- T2-PRG-005 enrolment gate. Exposed as a boolean rather than enforced as
    -- an inner join so admin/historical reports can still see retained rows;
    -- progress.py filters on it for the default endpoint.
    coalesce(p.enrolled, false)                               as enrolled

from course_completion cc
join course c                 on c.id = cc.course_id
left join tracked_total tt    on tt.course_id = cc.course_id
left join tracked t           on t.course_id = cc.course_id
left join activity_completion ac
       on ac.activity_id = t.activity_id
      and ac.user_id     = cc.user_id
left join v_course_participant p
       on p.user_id   = cc.user_id
      and p.course_id = cc.course_id
group by
    cc.user_id, cc.course_id, c.short_name, c.deleted_at, cc.time_completed,
    tt.activities_total, p.enrolled;

insert into schema_migrations(version) values ('M03') on conflict do nothing;
