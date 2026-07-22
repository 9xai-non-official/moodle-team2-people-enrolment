-- ============================================================================
-- Activity-completion write path + auto-recompute cascade (DB layer).
-- Solves PRG-006 (update_state), PRG-009 (set_module_viewed), PRG-010 (manual
-- toggle), PRG-011 (override+overrideby), PRG-013 (persist+instant aggregate),
-- PRG-020 (aggregate engine), PRG-032 (activity delete → recompute), PRG-036
-- (completion events), DATA-010 (table populated by code). Upgrades soft-delete
-- retention (improvement #7) to full ACTIVITY-level history, not just course-level.
--
-- BEATS MOODLE: the aggregate cascade is a trigger, so course completion can
-- never drift from activity state — no "reaggregate" flag, no nightly repair
-- job, no stale numerator. Moodle recomputes via a cron task that can lag.
-- ============================================================================

-- The write path any client / Mahdi's endpoint calls (PRG-006/009/010/011).
create or replace function fn_set_activity_completion(
    p_user_id bigint, p_activity_id bigint, p_state completion_state,
    p_actor_id bigint default null, p_viewed boolean default null)
returns jsonb
language plpgsql as $$
declare v_over bigint; v_row activity_completion;
begin
  -- override provenance: if an actor other than the user sets it, record them
  v_over := case when p_actor_id is not null and p_actor_id <> p_user_id
                 then p_actor_id else null end;
  insert into activity_completion (activity_id, user_id, state, overridden_by,
                                   viewed_at, updated_at)
  values (p_activity_id, p_user_id, p_state, v_over,
          case when p_viewed then now() end, now())
  on conflict (user_id, activity_id) do update
     set state = excluded.state,
         overridden_by = coalesce(excluded.overridden_by, activity_completion.overridden_by),
         viewed_at = coalesce(excluded.viewed_at, activity_completion.viewed_at),
         updated_at = now()
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

-- Audit + course-completion recompute, fired on EVERY activity_completion change.
create or replace function trg_activity_completion_cascade() returns trigger
language plpgsql as $$
declare v_course bigint; v_done boolean; v_uid bigint; v_aid bigint;
begin
  v_uid := coalesce(new.user_id, old.user_id);
  v_aid := coalesce(new.activity_id, old.activity_id);
  select course_id into v_course from course_activity where id = v_aid;

  -- audit (PRG-036) — every state write, deletion included
  insert into audit_log (event, actor_id, affected_id, course_id, detail)
  values (case tg_op when 'DELETE' then 'progress.activity_cleared'
                     else 'progress.activity_set' end,
          coalesce(new.overridden_by, null), v_uid, v_course,
          jsonb_build_object('activity_id', v_aid,
            'state', case when tg_op<>'DELETE' then new.state::text end,
            'overridden', (new.overridden_by is not null),
            'source', 'db_trigger'));

  -- instant course-completion recompute (PRG-013/020/032): only SET when newly
  -- complete and not already recorded (never auto-un-complete — Moodle-sticky).
  if v_course is not null and v_uid is not null then
    v_done := (fn_course_completion(v_uid, v_course)->>'complete')::boolean;
    if v_done then
      update course_completion set time_completed = coalesce(time_completed, now())
       where user_id = v_uid and course_id = v_course and time_completed is null;
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists activity_completion_cascade on activity_completion;
create trigger activity_completion_cascade
  after insert or update or delete on activity_completion
  for each row execute function trg_activity_completion_cascade();
