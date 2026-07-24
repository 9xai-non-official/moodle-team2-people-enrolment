-- T2-SIS-001 — SIS (student portal) integration substrate.
-- Status: DRAFT for Essa's review (single writer of DDL). Applied by hand to
-- the LOCAL Docker database only (moodle-t2-pg); NOT applied to Supabase.
-- Would become M20 once reviewed.
--
-- Dependency: M01 (baseline schema)
-- Issue: docs/SIS-WHOCAN-SYNC-CONTRACT.md §6-7
-- Reviewed-by: (pending — Essa; Yaman should ack the enum value)
--
-- Design note: the schema already carries the external-key columns this needs —
-- course.external_ref (UNIQUE since M01) and app_user.id_number (Moodle's
-- classic external-identity column). So no new columns: the SIS matches people
-- on app_user.id_number and courses on course.external_ref. All this file adds
-- is the method kind and the uniqueness guarantee id_number was missing.

-- 1. The portal is an enrolment door of its own, sibling of cohort.
--    (PG: ADD VALUE commits per-statement under psql autocommit; the value is
--    usable by the next statement.)
alter type enrol_method_kind add value if not exists 'sis';

-- 2. id_number becomes a real match key: unique where present. Partial index
--    so the many NULLs on local/demo accounts stay legal.
create unique index if not exists app_user_id_number_key
    on app_user (id_number) where id_number is not null;
