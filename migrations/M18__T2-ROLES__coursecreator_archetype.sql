-- Dependency: D-ROLES  Issue: T2-ROLES-001  Reviewed-by: Essa (DDL owner)
-- M18 — add the 'coursecreator' role archetype (DDL change request).
--
-- Moodle ships a coursecreator archetype: a role whose defining power is
-- moodle/course:create. Our role_archetype enum shipped with only the five
-- archetypes the baseline needed (manager, editingteacher, teacher, student,
-- guest). This adds the sixth so the Course creator role seeded in M19 carries
-- a real archetype instead of NULL — which keeps clone/reset-to-default and
-- any archetype-keyed logic honest.
--
-- Why this is its own migration (not folded into M19): Postgres commits an
-- `ALTER TYPE ... ADD VALUE` and forbids USING the new label in the SAME
-- transaction. M19 inserts a role with archetype='coursecreator', so it must
-- run in a LATER transaction. apply.py runs each migration file in its own
-- transaction, in filename order, so M18 commits before M19 executes.
--
-- Irreversible + idempotent: enum values cannot be dropped (forward-only, which
-- the repo already is), and IF NOT EXISTS + the schema_migrations ledger make
-- re-application a no-op.

alter type role_archetype add value if not exists 'coursecreator';

insert into schema_migrations(version) values ('M18') on conflict do nothing;
