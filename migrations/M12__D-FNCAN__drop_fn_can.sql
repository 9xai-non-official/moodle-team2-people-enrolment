-- Dependency: D-FNCAN  Issue: T2-RBAC-002  Reviewed-by: Khaled
-- M12 — retire the dead in-SQL permission resolver.
--
-- fn_can (schema.sql:475-532) is a complete, careful implementation of
-- Moodle's resolution rules — deepest-wins per role, sticky prohibit,
-- cross-role combination — and NOTHING CALLS IT. permissions.py re-implements
-- the same rules in Python, and the groups path adds a third variant
-- (inventory §1.3, the "three-resolver problem").
--
-- Three implementations of one rule set is not redundancy, it is guaranteed
-- divergence: a fix lands in one and the other two silently disagree. The
-- Python resolver is canonical (it is the one under test, in
-- test_check_integration.py), so the SQL copy goes.
--
-- PRECONDITION: Khaled confirms no environment invokes it. `grep -rn fn_can`
-- across the backend must return only schema.sql and this migration.
-- test_check_integration.py is unaffected — it exercises the Python resolver.
--
-- Reversible: the function body is preserved verbatim in M01 and in git
-- history if it is ever needed again.

drop function if exists fn_can(bigint, varchar, bigint);

insert into schema_migrations(version) values ('M12') on conflict do nothing;
