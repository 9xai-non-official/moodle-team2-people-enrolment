-- Dependency: D-GUEST  Issue: T2-DATA-003  Reviewed-by: Yaman
-- M08 — one guest enrolment method per course, enforced by the database.
--
-- enrolment.py:565-573 checks guest uniqueness in application code and its own
-- comment admits there is no DB index behind it, so two concurrent creates
-- both pass the pre-check and both insert. The schema's endorsed pattern is to
-- express invariants as constraints (DATA-005 is exactly this move for
-- role_assignment), so it belongs here.
--
-- Correctly PARTIAL: only 'guest' is single-instance. manual / self / cohort
-- stay multi-instance — Moodle has no unique on (courseid, enrol) and a course
-- may legitimately have several self-enrolment instances (DATA-002).
--
-- Yaman then drops the racy pre-check and catches the unique violation as 409.

create unique index if not exists uq_guest_method_per_course
    on enrolment_method (course_id)
    where method = 'guest';

insert into schema_migrations(version) values ('M08') on conflict do nothing;
