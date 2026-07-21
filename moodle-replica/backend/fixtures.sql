-- Demo personas + fixtures for real-DB testing (mirrors frontend/src/mocks/seed.js).
-- Idempotent: safe to re-run. Non-destructive: never touches rows it didn't create
-- (teammates' demo_alice/demo_bob/DEMO-CS101 stay untouched).
-- Run: management API or psql, as the service role.

do $$
declare
  u_admin bigint; u_tala bigint; u_tariq bigint; u_aya bigint; u_salma bigint;
  u_majd bigint; u_basel bigint; u_sami bigint;
  c_cs bigint; c_math bigint; c_hist bigint; c_lab bigint;
  ctx_sys bigint; ctx_cs bigint; ctx_math bigint; ctx_lab bigint;
  a_assign bigint; a_quiz bigint; a_forum bigint; a_ws bigint;
  r_manager bigint; r_edit bigint; r_teacher bigint; r_student bigint; r_allg bigint;
  coh bigint; m_manual bigint; m_self bigint; m_cohort bigint; m_math_manual bigint;
  m_math_self bigint; m_lab bigint;
  g_a bigint; g_b bigint; g_obs bigint; grp bigint;
begin
  select id into ctx_sys from context where level = 'system';
  select id into r_manager from role where short_name = 'manager';
  select id into r_edit    from role where short_name = 'editingteacher';
  select id into r_teacher from role where short_name = 'teacher';
  select id into r_student from role where short_name = 'student';

  -- extra role + capability the permission demos need (idempotent adds)
  insert into role (short_name, name, description, archetype, sort_order)
    values ('teacher-allgroups', 'TA (all groups)', 'Duplicate TA role that keeps accessallgroups', 'teacher', 6)
    on conflict (short_name) do nothing;
  select id into r_allg from role where short_name = 'teacher-allgroups';

  insert into capability (name, cap_type, min_context_level, component, risks)
    values ('completion:override', 'write', 'course', 'core', '{}')
    on conflict (name) do nothing;

  insert into role_capability (role_id, context_id, capability, permission) values
    (r_allg,    ctx_sys, 'site:accessallgroups', 'allow'),
    (r_allg,    ctx_sys, 'activity:grade',       'allow'),
    (r_allg,    ctx_sys, 'course:viewparticipants', 'allow'),
    (r_manager, ctx_sys, 'completion:override',  'allow'),
    (r_edit,    ctx_sys, 'completion:override',  'allow')
  on conflict (role_id, context_id, capability) do nothing;

  -- people ------------------------------------------------------------------
  insert into app_user (username, email, first_name, last_name, suspended) values
    ('admin1',        'admin1@demo.io',   'Amal',  'Admin',  false),
    ('teacher.a',     'tala@demo.io',     'Tala',  'Teacher',false),
    ('ta.a',          'tariq@demo.io',    'Tariq', 'Assist', false),
    ('ta.allgroups',  'aya@demo.io',      'Aya',   'Assist', false),
    ('student.a',     'salma@demo.io',    'Salma', 'Saleh',  false),
    ('student.multi', 'majd@demo.io',     'Majd',  'Masri',  false),
    ('student.b',     'basel@demo.io',    'Basel', 'Badr',   false),
    ('student.susp',  'sami@demo.io',     'Sami',  'Suheil', true)
  on conflict (username) do nothing;
  select id into u_admin from app_user where username = 'admin1';
  select id into u_tala  from app_user where username = 'teacher.a';
  select id into u_tariq from app_user where username = 'ta.a';
  select id into u_aya   from app_user where username = 'ta.allgroups';
  select id into u_salma from app_user where username = 'student.a';
  select id into u_majd  from app_user where username = 'student.multi';
  select id into u_basel from app_user where username = 'student.b';
  select id into u_sami  from app_user where username = 'student.susp';

  -- courses (external_ref is the idempotency key) ---------------------------
  insert into course (external_ref, short_name, full_name, visible, group_mode, force_group_mode) values
    ('T2-CS101',   'CS101',   'Intro to Computer Science', true, 'separate', false),
    ('T2-MATH200', 'MATH200', 'Discrete Mathematics',      true, 'none',     true),
    ('T2-LAB1',    'LAB1',    'Open Lab',                  true, 'visible',  false)
  on conflict (external_ref) do nothing;
  insert into course (external_ref, short_name, full_name, visible, group_mode, force_group_mode, deleted_at) values
    ('T2-HIST9', 'HIST9', 'History of Computing', false, 'none', false, now() - interval '1 year')
  on conflict (external_ref) do nothing;
  select id into c_cs   from course where external_ref = 'T2-CS101';
  select id into c_math from course where external_ref = 'T2-MATH200';
  select id into c_hist from course where external_ref = 'T2-HIST9';
  select id into c_lab  from course where external_ref = 'T2-LAB1';

  -- contexts ----------------------------------------------------------------
  insert into context (level, instance_id, parent_id) values
    ('course', c_cs, ctx_sys), ('course', c_math, ctx_sys), ('course', c_lab, ctx_sys)
  on conflict (level, instance_id) do nothing;
  select id into ctx_cs   from context where level = 'course' and instance_id = c_cs;
  select id into ctx_math from context where level = 'course' and instance_id = c_math;
  select id into ctx_lab  from context where level = 'course' and instance_id = c_lab;

  -- the override that scopes the plain TA role inside CS101
  insert into role_capability (role_id, context_id, capability, permission)
    values (r_teacher, ctx_cs, 'site:accessallgroups', 'prevent')
  on conflict (role_id, context_id, capability) do nothing;

  -- groups & grouping -------------------------------------------------------
  if not exists (select 1 from course_group where course_id = c_cs and name = 'Group A') then
    insert into course_group (course_id, name, participation) values (c_cs, 'Group A', true);
  end if;
  if not exists (select 1 from course_group where course_id = c_cs and name = 'Group B') then
    insert into course_group (course_id, name, id_number, enrolment_key, participation)
      values (c_cs, 'Group B', 'GB', 'keyB', true);
  end if;
  if not exists (select 1 from course_group where course_id = c_cs and name = 'Observers') then
    insert into course_group (course_id, name, participation) values (c_cs, 'Observers', false);
  end if;
  select id into g_a  from course_group where course_id = c_cs and name = 'Group A';
  select id into g_b  from course_group where course_id = c_cs and name = 'Group B';
  select id into g_obs from course_group where course_id = c_cs and name = 'Observers';

  if not exists (select 1 from grouping where course_id = c_cs and name = 'Tutorial sections') then
    insert into grouping (course_id, name) values (c_cs, 'Tutorial sections');
  end if;
  select id into grp from grouping where course_id = c_cs and name = 'Tutorial sections';
  insert into grouping_group (grouping_id, group_id) values (grp, g_a), (grp, g_b)
    on conflict do nothing;

  -- activities --------------------------------------------------------------
  insert into course_activity (course_id, external_ref, name, activity_type, group_mode, grouping_id, visible, completion_enabled) values
    (c_cs,   'T2-A1', 'Assignment 1', 'assign', null,       grp,  true,  true),
    (c_cs,   'T2-Q1', 'Quiz 1',       'quiz',   'visible',  null, true,  true),
    (c_cs,   'T2-F1', 'Secret Forum', 'forum',  null,       null, false, true),
    (c_math, 'T2-W1', 'Worksheet',    'assign', 'separate', null, true,  false),
    (c_lab,  'T2-S1', 'Sandbox',      'page',   null,       null, true,  false)
  on conflict (course_id, external_ref) do nothing;
  select id into a_assign from course_activity where external_ref = 'T2-A1';
  select id into a_quiz   from course_activity where external_ref = 'T2-Q1';
  select id into a_forum  from course_activity where external_ref = 'T2-F1';
  select id into a_ws     from course_activity where external_ref = 'T2-W1';

  insert into context (level, instance_id, parent_id) values
    ('activity', a_assign, ctx_cs), ('activity', a_quiz, ctx_cs),
    ('activity', a_forum, ctx_cs), ('activity', a_ws, ctx_math)
  on conflict (level, instance_id) do nothing;

  -- cohort ------------------------------------------------------------------
  insert into cohort (name, id_number) values ('2026 intake', 'INTAKE26')
    on conflict (id_number) do nothing;
  select id into coh from cohort where id_number = 'INTAKE26';
  insert into cohort_member (cohort_id, user_id) values (coh, u_salma), (coh, u_majd)
    on conflict do nothing;

  -- enrolment methods (no natural unique key → NOT EXISTS guards) -----------
  if not exists (select 1 from enrolment_method where course_id = c_cs and method = 'manual') then
    insert into enrolment_method (course_id, method, status, default_role_id) values (c_cs, 'manual', 'enabled', r_student);
  end if;
  if not exists (select 1 from enrolment_method where course_id = c_cs and method = 'self') then
    insert into enrolment_method (course_id, method, status, default_role_id, config)
      values (c_cs, 'self', 'enabled', r_student, '{"key": "sesame"}');
  end if;
  if not exists (select 1 from enrolment_method where course_id = c_cs and method = 'cohort') then
    insert into enrolment_method (course_id, method, status, default_role_id, cohort_id)
      values (c_cs, 'cohort', 'enabled', r_student, coh);
  end if;
  if not exists (select 1 from enrolment_method where course_id = c_math and method = 'manual') then
    insert into enrolment_method (course_id, method, status, default_role_id) values (c_math, 'manual', 'enabled', r_student);
  end if;
  if not exists (select 1 from enrolment_method where course_id = c_math and method = 'self') then
    insert into enrolment_method (course_id, method, status, default_role_id, config)
      values (c_math, 'self', 'disabled', r_student, '{"key": "open"}');
  end if;
  if not exists (select 1 from enrolment_method where course_id = c_lab and method = 'manual') then
    insert into enrolment_method (course_id, method, status, default_role_id) values (c_lab, 'manual', 'enabled', r_student);
  end if;
  select id into m_manual      from enrolment_method where course_id = c_cs   and method = 'manual';
  select id into m_self        from enrolment_method where course_id = c_cs   and method = 'self';
  select id into m_cohort      from enrolment_method where course_id = c_cs   and method = 'cohort';
  select id into m_math_manual from enrolment_method where course_id = c_math and method = 'manual';
  select id into m_math_self   from enrolment_method where course_id = c_math and method = 'self';
  select id into m_lab         from enrolment_method where course_id = c_lab  and method = 'manual';

  -- enrolments (HC-1: salma via manual AND cohort) --------------------------
  insert into enrolment (method_id, user_id, status, time_start, time_end) values
    (m_manual, u_salma, 'active', null, null),
    (m_cohort, u_salma, 'active', null, null),
    (m_manual, u_majd,  'active', null, null),
    (m_manual, u_basel, 'active', null, null),
    (m_manual, u_sami,  'active', null, null),
    (m_math_manual, u_majd, 'active', now() - interval '6 months', now() - interval '1 month'), -- expired
    (m_math_self,   u_basel,'active', null, null),   -- via disabled method
    (m_math_manual, u_salma,'suspended', null, null),
    (m_lab, u_salma, 'active', null, null)
  on conflict (method_id, user_id) do nothing;

  -- role assignments --------------------------------------------------------
  insert into role_assignment (user_id, role_id, context_id, component, item_id) values
    (u_admin, r_manager, ctx_sys,  '', 0),
    (u_tala,  r_edit,    ctx_cs,   '', 0),
    (u_tala,  r_edit,    ctx_math, '', 0),
    (u_tariq, r_teacher, ctx_cs,   '', 0),
    (u_aya,   r_allg,    ctx_cs,   '', 0),
    (u_salma, r_student, ctx_cs,   '', m_manual),
    (u_salma, r_student, ctx_cs,   'enrol_cohort', m_cohort),
    (u_majd,  r_student, ctx_cs,   '', m_manual),
    (u_basel, r_student, ctx_cs,   '', m_manual),
    (u_sami,  r_student, ctx_cs,   '', m_manual),
    (u_majd,  r_student, ctx_math, '', m_math_manual),
    (u_basel, r_student, ctx_math, '', m_math_self),
    (u_salma, r_student, ctx_lab,  '', m_lab)
  on conflict (user_id, role_id, context_id, component, item_id) do nothing;

  -- group membership (HC-4: majd in A and B; provenance on salma) -----------
  insert into group_member (group_id, user_id, component, item_id) values
    (g_a, u_salma, 'enrol_cohort', m_cohort),
    (g_a, u_majd,  '', 0),
    (g_b, u_majd,  '', 0),
    (g_b, u_basel, 'enrol_self', m_self),
    (g_a, u_tariq, '', 0)
  on conflict do nothing;

  -- completion + progress ---------------------------------------------------
  insert into course_completion (user_id, course_id, time_enrolled, time_started) values
    (u_salma, c_cs,  now() - interval '5 months', now() - interval '5 months'),
    (u_majd,  c_cs,  now() - interval '5 months', now() - interval '4 months'),
    (u_basel, c_cs,  now() - interval '5 months', now() - interval '4 months'),
    (u_sami,  c_cs,  now() - interval '5 months', null),
    (u_salma, c_lab, now() - interval '1 month',  null)
  on conflict (user_id, course_id) do nothing;
  insert into course_completion (user_id, course_id, time_enrolled, time_started, time_completed) values
    (u_majd, c_math, now() - interval '6 months', now() - interval '6 months', now() - interval '2 months')
  on conflict (user_id, course_id) do nothing;

  insert into activity_completion (activity_id, user_id, state, viewed_at) values
    (a_assign, u_salma, 'complete',      now() - interval '2 months'),
    (a_quiz,   u_salma, 'complete_pass', now() - interval '6 weeks'),
    (a_quiz,   u_majd,  'incomplete',    now() - interval '2 months'),
    (a_quiz,   u_basel, 'complete_fail', now() - interval '6 weeks'),
    (a_forum,  u_basel, 'complete',      now() - interval '1 month')
  on conflict (user_id, activity_id) do nothing;
  insert into activity_completion (activity_id, user_id, state, overridden_by) values
    (a_assign, u_majd, 'complete', u_tala)
  on conflict (user_id, activity_id) do nothing;

  insert into user_last_access (user_id, course_id, accessed_at) values
    (u_salma, c_cs, now() - interval '1 day'),
    (u_majd,  c_cs, now() - interval '3 hours'),
    (u_basel, c_cs, now() - interval '3 weeks')
  on conflict (user_id, course_id) do update set accessed_at = excluded.accessed_at;
end $$;
