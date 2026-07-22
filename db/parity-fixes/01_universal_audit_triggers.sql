-- ============================================================================
-- Universal audit triggers — DB-level event ledger (beats Moodle).
-- Solves EVT-001..005, ENR-014, RBAC-070, HIS-011, HC-05c, DATA-016.
--
-- WHY THIS BEATS MOODLE: Moodle fires events in PHP (\core\event\*). Any code
-- path that writes the table WITHOUT going through the blessed API — a bulk
-- SQL fix, a plugin, a migration — silently skips the event, so the log lies.
-- A DB trigger fires on the ROW, so NOTHING can mutate enrolment or role state
-- without the ledger recording it. The audit is now a property of the data,
-- not a promise of the code.
--
-- Enrolment (per-user rows) → EVT-001/002/003; role_assignment → EVT-004/005.
-- group_member and course_completion are already app-audited (no double-write).
-- ============================================================================

create or replace function trg_audit_enrolment() returns trigger
language plpgsql as $$
declare v_course bigint; v_user bigint; v_evt text;
begin
  v_user  := coalesce(new.user_id, old.user_id);
  select course_id into v_course from enrolment_method
   where id = coalesce(new.method_id, old.method_id);
  v_evt := case tg_op
             when 'INSERT' then 'enrolment.created'
             when 'UPDATE' then 'enrolment.updated'
             else 'enrolment.deleted' end;
  insert into audit_log (event, actor_id, affected_id, course_id, detail)
  values (v_evt, coalesce(new.modified_by, old.modified_by), v_user, v_course,
          jsonb_build_object(
            'method_id', coalesce(new.method_id, old.method_id),
            'old_status', case when tg_op<>'INSERT' then old.status::text end,
            'new_status', case when tg_op<>'DELETE' then new.status::text end,
            'source', 'db_trigger'));
  return coalesce(new, old);
end $$;

drop trigger if exists audit_enrolment on enrolment;
create trigger audit_enrolment
  after insert or update or delete on enrolment
  for each row execute function trg_audit_enrolment();

create or replace function trg_audit_role_assignment() returns trigger
language plpgsql as $$
declare v_course bigint; v_evt text;
begin
  -- best-effort course id from the context (course/activity contexts only)
  select case when level='course' then instance_id else null end into v_course
    from context where id = coalesce(new.context_id, old.context_id);
  v_evt := case tg_op when 'INSERT' then 'role.assigned' else 'role.unassigned' end;
  insert into audit_log (event, actor_id, affected_id, course_id, context_id, detail)
  values (v_evt, coalesce(new.assigned_by, old.assigned_by),
          coalesce(new.user_id, old.user_id), v_course,
          coalesce(new.context_id, old.context_id),
          jsonb_build_object('role_id', coalesce(new.role_id, old.role_id),
                             'component', coalesce(new.component, old.component),
                             'source', 'db_trigger'));
  return coalesce(new, old);
end $$;

drop trigger if exists audit_role_assignment on role_assignment;
create trigger audit_role_assignment
  after insert or delete on role_assignment
  for each row execute function trg_audit_role_assignment();
