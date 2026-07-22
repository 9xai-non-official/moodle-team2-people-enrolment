-- Dependency: D-AUDIT  Issue: T2-DATA-001  Reviewed-by: all
-- M10 — supplemental audit_log indexes.
--
-- The audit_log DDL itself (schema.sql:391-401) was assessed as ADEQUATE and
-- is deliberately left alone: no FKs to user/course, so rows outlive hard
-- deletes of anything they reference. That matches logstore_standard_log
-- (DATA-016) and is what makes HC-02 / HC-05 reconstructable. Do not add FKs.
--
-- The gap is not the shape, it is that the table is written by ZERO code
-- today. Writes belong to each domain, not to Essa. What Essa can do is make
-- the report queries fast before the rows arrive.
--
-- Baseline already has idx_audit_affected(affected_id, created_at).
--
-- Retention: indefinite, matching Moodle's default loglifetime=0 (HIS-011).
-- Documented in docs/findings/DB_SCHEMA.md.

create index if not exists idx_audit_course on audit_log(course_id, created_at);
create index if not exists idx_audit_actor  on audit_log(actor_id,  created_at);
create index if not exists idx_audit_event  on audit_log(event,     created_at);

insert into schema_migrations(version) values ('M10') on conflict do nothing;
