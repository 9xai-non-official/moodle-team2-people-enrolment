-- Dependency: (T2-DATA-004)  Issue: T2-DATA-004  Reviewed-by: Mahdi
-- M15 — deletion semantics.
--
-- HIGHEST-RISK MIGRATION IN THE SET. Stage it last, after everything else is
-- merged and green. The compensating migration is at the bottom of this file,
-- commented out — copy it into a NEW migration to revert; never edit this one.
--
-- (1) activity_completion.activity_id is currently RESTRICT (schema.sql:363),
--     so a hard delete of a module is blocked outright once anyone has a
--     completion row against it (HIS-007). Moodle hard-deletes the module and
--     its completion rows together.
--
--     The preferred path remains SOFT delete + the deleted_at filter, which is
--     what M03's tracked set already does. This FK change only makes genuine
--     hard deletes possible rather than erroring.
--
--     WHY THIS IS SAFE HERE AND NOT ELSEWHERE: activity_completion is
--     per-activity state. If the activity is genuinely gone, the state is
--     meaningless. course_completion and course_completion_crit_compl stay
--     NON-cascading, because those survive unenrolment and course soft-delete
--     by design (schema.sql:337-341, HIS-002) — that is what makes HC-02 and
--     HC-05 answerable, and it must not regress.
--
-- (2) The `deleted_at` filter policy, documented and enforced:
--       * current-state reads (enrolment, roster, participants) filter
--         `deleted_at IS NULL`;
--       * historical reads (progress, audit) may include soft-deleted rows —
--         courses.py:19 already exposes include_deleted for exactly this;
--       * v_course_progress INTENTIONALLY keeps soft-deleted courses (HC-05).
--     Enforcement lives in the routers; this migration is where the policy is
--     written down so it stops being folklore.
--
-- (3) Category / module lifecycle: NOT ADDRESSED HERE — INSUFFICIENT EVIDENCE.
--     context_level has a 'category' member with no backing table (HIS-008),
--     but categories may be Team-1-owned (schema.sql:21-24) and no product doc
--     settles it. Inventing course_category would be inventing ownership.
--     Add it in a later migration ONLY if the team confirms Team-2 owns it.
--     What holds regardless: never hard-delete Team-1 course or grade data
--     (05-data-final-verdicts.md DATA-013/014).

alter table activity_completion
    drop constraint if exists activity_completion_activity_id_fkey;

alter table activity_completion
    add constraint activity_completion_activity_id_fkey
    foreign key (activity_id) references course_activity(id) on delete cascade;

insert into schema_migrations(version) values ('M15') on conflict do nothing;

-- ---------------------------------------------------------------------------
-- COMPENSATING MIGRATION (restores RESTRICT). Copy into a new file if needed:
--
--   alter table activity_completion
--       drop constraint if exists activity_completion_activity_id_fkey;
--   alter table activity_completion
--       add constraint activity_completion_activity_id_fkey
--       foreign key (activity_id) references course_activity(id);
-- ---------------------------------------------------------------------------
