-- ============================================================================
-- Real completion aggregation — turns mock-only richness into DB truth.
-- Solves PRG-016 (criteria), PRG-017 (ALL/ANY), PRG-019 (per-criterion),
-- PRG-020 (aggregation engine). Consumes the D-CRIT tables.
--
-- fn_course_completion(user, course) → jsonb:
--   { aggregation, total, met, complete, per_criterion:[{activity_id,name,met}] }
-- A criterion is met when the user's activity_completion state is complete or
-- complete_pass. ALL → every criterion; ANY → at least one. Falls back to
-- "ALL completion-enabled, non-deleted activities" when no criteria are set
-- (Moodle's default) — so it is correct even before a teacher configures any.
-- ============================================================================
create or replace function fn_course_completion(p_user_id bigint, p_course_id bigint)
returns jsonb
language sql stable as $$
with agg as (
    select coalesce((select aggregation from course_completion_setting
                       where course_id = p_course_id), 'all') as mode
),
crit as (
    -- explicit criteria, else the Moodle default (all tracked activities)
    select ca.id as activity_id, ca.name
      from completion_criteria cc
      join course_activity ca on ca.id = cc.activity_id
     where cc.course_id = p_course_id
    union
    select ca.id, ca.name
      from course_activity ca
     where ca.course_id = p_course_id
       and ca.completion_enabled and ca.deleted_at is null
       and not exists (select 1 from completion_criteria where course_id = p_course_id)
),
scored as (
    select c.activity_id, c.name,
           coalesce(ac.state in ('complete','complete_pass'), false) as met
      from crit c
      left join activity_completion ac
             on ac.activity_id = c.activity_id and ac.user_id = p_user_id
)
select jsonb_build_object(
    'user_id', p_user_id,
    'course_id', p_course_id,
    'aggregation', (select mode from agg),
    'total', (select count(*) from scored),
    'met',   (select count(*) filter (where met) from scored),
    'complete', case
        when (select count(*) from scored) = 0 then false
        when (select mode from agg) = 'any'
            then (select bool_or(met) from scored)
        else (select bool_and(met) from scored)
      end,
    'per_criterion', coalesce((select jsonb_agg(jsonb_build_object(
        'activity_id', activity_id, 'name', name, 'met', met) order by activity_id)
        from scored), '[]'::jsonb)
);
$$;
