-- Dependency: D-ROLES, M18 (coursecreator archetype)  Issue: T2-ROLES-001
-- Reviewed-by: Khaled (roles/permissions) + Essa (DDL/seed owner)
-- M19 — full Moodle role sets: Course creator + fleshed-out Editing teacher,
--        Non-editing teacher, Student, Manager and Guest capability sets.
--
-- WHY: the baseline (M02) seeded only the ~16 capabilities the People &
-- Enrolment area needed. To make the three roles the team asked for behave like
-- their real Moodle counterparts, this migration:
--
--   1. adds the Course-management, Forum (Q&A), Quiz, Assignment, Gradebook and
--      user capabilities those roles are defined by (short component:action
--      names, Moodle component recorded in the `component` column — same
--      convention as M02);
--   2. seeds the Course creator ROLE (archetype from M18); and
--   3. writes the default role_capability rows at SYSTEM context, matching
--      Moodle's archetype defaults, with three deliberate points:
--        * course:create -> manager, coursecreator AND editingteacher. The last
--          is this team's extension (T2-ROLES-001): our editing teacher may
--          create courses. Standard Moodle withholds it from editingteacher; we
--          grant it on purpose.
--        * forum:replypost + grade:edit + the module :grade caps -> the
--          NON-EDITING teacher, so it can answer the Q&A and grade, while
--          course:manageactivities & friends stay with the editing teacher —
--          the exact "can grade / answer, cannot change the course" line.
--        * course:create is a category/site-level power, so the create-course
--          gate checks it at the SYSTEM context; a role only wields it where it
--          is assigned (an editing teacher assigned at a single course context
--          still cannot create site-wide courses — Moodle-correct).
--
-- Does NOT grant course:view or site:accessallgroups to any new/other role:
-- M09 (D-SEED) reserves course:view for manager and accessallgroups for the two
-- teacher roles, and apply.py's fixtures guard fails the build if that is
-- violated. Course creator therefore relies on course:viewhidden.
--
-- Idempotent: capabilities on conflict(name), the role on conflict(short_name),
-- and every role_capability row on conflict(role_id,context_id,capability).

-- ---------------------------------------------------------------------------
-- (1) New capabilities. name = Moodle's component:action short form; component
--     column carries the owning Moodle component (core / mod_* ).
-- ---------------------------------------------------------------------------
insert into capability (name, cap_type, min_context_level, component, risks) values
  -- core course management
  ('course:create',               'write', 'category', 'core',       '{}'),
  ('course:update',               'write', 'course',   'core',       '{}'),
  ('course:delete',               'write', 'course',   'core',       '{dataloss}'),
  ('course:manageactivities',     'write', 'course',   'core',       '{}'),
  ('course:activityvisibility',   'write', 'course',   'core',       '{}'),
  ('course:sectionvisibility',    'write', 'course',   'core',       '{}'),
  ('course:viewhiddenactivities', 'read',  'course',   'core',       '{}'),
  ('course:reset',                'write', 'course',   'core',       '{dataloss}'),
  ('course:managescales',         'write', 'course',   'core',       '{}'),
  ('course:tag',                  'write', 'course',   'core',       '{}'),
  -- roles / cohorts
  ('role:review',                 'read',  'course',   'core',       '{personal}'),
  ('cohort:view',                 'read',  'system',   'core',       '{personal}'),
  ('cohort:manage',               'write', 'system',   'core',       '{}'),
  -- forum (Q&A) — mod_forum
  ('forum:viewdiscussion',        'read',  'activity', 'mod_forum',  '{}'),
  ('forum:startdiscussion',       'write', 'activity', 'mod_forum',  '{}'),
  ('forum:replypost',             'write', 'activity', 'mod_forum',  '{}'),
  ('forum:addquestion',           'write', 'activity', 'mod_forum',  '{}'),
  ('forum:viewqandawithoutposting','read', 'activity', 'mod_forum',  '{}'),
  ('forum:rate',                  'write', 'activity', 'mod_forum',  '{}'),
  ('forum:createattachment',      'write', 'activity', 'mod_forum',  '{}'),
  ('forum:deleteownpost',         'write', 'activity', 'mod_forum',  '{}'),
  ('forum:editanypost',           'write', 'activity', 'mod_forum',  '{}'),
  ('forum:deleteanypost',         'write', 'activity', 'mod_forum',  '{dataloss}'),
  ('forum:splitdiscussions',      'write', 'activity', 'mod_forum',  '{}'),
  ('forum:movediscussions',       'write', 'activity', 'mod_forum',  '{}'),
  ('forum:managesubscriptions',   'write', 'activity', 'mod_forum',  '{}'),
  -- quiz — mod_quiz
  ('quiz:view',                   'read',  'activity', 'mod_quiz',   '{}'),
  ('quiz:attempt',                'write', 'activity', 'mod_quiz',   '{}'),
  ('quiz:manage',                 'write', 'activity', 'mod_quiz',   '{}'),
  ('quiz:preview',                'write', 'activity', 'mod_quiz',   '{}'),
  ('quiz:grade',                  'write', 'activity', 'mod_quiz',   '{}'),
  ('quiz:regrade',                'write', 'activity', 'mod_quiz',   '{}'),
  ('quiz:viewreports',            'read',  'activity', 'mod_quiz',   '{personal}'),
  ('quiz:deleteattempts',         'write', 'activity', 'mod_quiz',   '{dataloss}'),
  -- assignment — mod_assign
  ('assign:view',                 'read',  'activity', 'mod_assign', '{}'),
  ('assign:submit',               'write', 'activity', 'mod_assign', '{}'),
  ('assign:grade',                'write', 'activity', 'mod_assign', '{}'),
  ('assign:grantextension',       'write', 'activity', 'mod_assign', '{}'),
  ('assign:viewgrades',           'read',  'activity', 'mod_assign', '{personal}'),
  ('assign:releasegrades',        'write', 'activity', 'mod_assign', '{}'),
  ('assign:managegrades',         'write', 'activity', 'mod_assign', '{}'),
  -- gradebook — core
  ('grade:view',                  'read',  'course',   'core',       '{}'),
  ('grade:viewall',               'read',  'course',   'core',       '{personal}'),
  ('grade:edit',                  'write', 'course',   'core',       '{}'),
  ('grade:manage',                'write', 'course',   'core',       '{}'),
  ('grade:viewhidden',            'read',  'course',   'core',       '{personal}'),
  ('grade:export',                'read',  'course',   'core',       '{personal}'),
  ('grade:import',                'write', 'course',   'core',       '{dataloss}'),
  -- user
  ('user:viewhiddendetails',      'read',  'user',     'core',       '{personal}')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- (2) Course creator role. sort_order 7 avoids the base roles (1-5) and the
--     fixtures 'teacher-allgroups' role (6). archetype from M18.
-- ---------------------------------------------------------------------------
insert into role (short_name, name, description, archetype, sort_order) values
  ('coursecreator', 'Course creator',
   'Can create new courses and becomes their teacher; cannot administer the site',
   'coursecreator', 7)
on conflict (short_name) do nothing;

-- ---------------------------------------------------------------------------
-- (3) Default definitions at system context. Absence of a row = 'not set'
--     (inherit), never deny. Only explicit grants are listed.
-- ---------------------------------------------------------------------------
with sys as (select id from context where level = 'system'),
     defs(role_sn, cap, perm) as (values
  -- ---- Course creator: create courses; see them (hidden ones + participants).
  --      NOT course:view (manager-only, M09) — uses course:viewhidden instead.
  ('coursecreator','course:create','allow'),
  ('coursecreator','course:viewhidden','allow'),
  ('coursecreator','course:viewparticipants','allow'),
  ('coursecreator','user:viewdetails','allow'),

  -- ---- Editing teacher: full control INSIDE a course + (team extension)
  --      course:create. NOT course:delete (manager-only, Moodle-faithful).
  ('editingteacher','course:create','allow'),
  ('editingteacher','course:update','allow'),
  ('editingteacher','course:manageactivities','allow'),
  ('editingteacher','course:activityvisibility','allow'),
  ('editingteacher','course:sectionvisibility','allow'),
  ('editingteacher','course:viewhiddenactivities','allow'),
  ('editingteacher','course:reset','allow'),
  ('editingteacher','course:managescales','allow'),
  ('editingteacher','course:tag','allow'),
  ('editingteacher','role:review','allow'),
  ('editingteacher','forum:viewdiscussion','allow'),
  ('editingteacher','forum:startdiscussion','allow'),
  ('editingteacher','forum:replypost','allow'),
  ('editingteacher','forum:addquestion','allow'),
  ('editingteacher','forum:viewqandawithoutposting','allow'),
  ('editingteacher','forum:rate','allow'),
  ('editingteacher','forum:createattachment','allow'),
  ('editingteacher','forum:deleteownpost','allow'),
  ('editingteacher','forum:editanypost','allow'),
  ('editingteacher','forum:deleteanypost','allow'),
  ('editingteacher','forum:splitdiscussions','allow'),
  ('editingteacher','forum:movediscussions','allow'),
  ('editingteacher','forum:managesubscriptions','allow'),
  ('editingteacher','quiz:view','allow'),
  ('editingteacher','quiz:manage','allow'),
  ('editingteacher','quiz:preview','allow'),
  ('editingteacher','quiz:grade','allow'),
  ('editingteacher','quiz:regrade','allow'),
  ('editingteacher','quiz:viewreports','allow'),
  ('editingteacher','quiz:deleteattempts','allow'),
  ('editingteacher','assign:view','allow'),
  ('editingteacher','assign:grade','allow'),
  ('editingteacher','assign:grantextension','allow'),
  ('editingteacher','assign:viewgrades','allow'),
  ('editingteacher','assign:releasegrades','allow'),
  ('editingteacher','assign:managegrades','allow'),
  ('editingteacher','grade:viewall','allow'),
  ('editingteacher','grade:edit','allow'),
  ('editingteacher','grade:manage','allow'),
  ('editingteacher','grade:viewhidden','allow'),
  ('editingteacher','grade:export','allow'),
  ('editingteacher','grade:import','allow'),
  ('editingteacher','user:viewhiddendetails','allow'),

  -- ---- Non-editing teacher (TA): grade + answer the Q&A, but cannot change
  --      the course. NO course:manageactivities/update, NO forum moderation,
  --      NO quiz:manage/regrade.
  ('teacher','course:viewhiddenactivities','allow'),
  ('teacher','role:review','allow'),
  ('teacher','forum:viewdiscussion','allow'),
  ('teacher','forum:startdiscussion','allow'),
  ('teacher','forum:replypost','allow'),           -- answer the Q&A
  ('teacher','forum:addquestion','allow'),
  ('teacher','forum:viewqandawithoutposting','allow'),
  ('teacher','forum:rate','allow'),
  ('teacher','forum:createattachment','allow'),
  ('teacher','forum:deleteownpost','allow'),
  ('teacher','quiz:view','allow'),
  ('teacher','quiz:preview','allow'),
  ('teacher','quiz:grade','allow'),               -- mark quiz essays
  ('teacher','quiz:viewreports','allow'),
  ('teacher','assign:view','allow'),
  ('teacher','assign:grade','allow'),             -- mark assignments
  ('teacher','assign:grantextension','allow'),
  ('teacher','assign:viewgrades','allow'),
  ('teacher','grade:viewall','allow'),
  ('teacher','grade:edit','allow'),               -- record grades in the gradebook
  ('teacher','grade:viewhidden','allow'),
  ('teacher','grade:export','allow'),
  ('teacher','user:viewhiddendetails','allow'),

  -- ---- Student: participate — answer the Q&A, attempt quizzes, submit.
  ('student','forum:viewdiscussion','allow'),
  ('student','forum:startdiscussion','allow'),
  ('student','forum:replypost','allow'),
  ('student','forum:createattachment','allow'),
  ('student','forum:deleteownpost','allow'),
  ('student','quiz:view','allow'),
  ('student','quiz:attempt','allow'),
  ('student','assign:view','allow'),
  ('student','assign:submit','allow'),
  ('student','grade:view','allow'),

  -- ---- Guest: read-only (write caps are blocked for guests in the resolver
  --      regardless; these two reads make the intent explicit).
  ('guest','forum:viewdiscussion','allow'),
  ('guest','quiz:view','allow'),

  -- ---- Manager: the staff capabilities (site admin also bypasses, but keep
  --      the definition honest for managers assigned below the system context).
  --      Skips the purely-student caps (quiz:attempt, assign:submit, grade:view).
  ('manager','course:create','allow'),
  ('manager','course:update','allow'),
  ('manager','course:delete','allow'),
  ('manager','course:manageactivities','allow'),
  ('manager','course:activityvisibility','allow'),
  ('manager','course:sectionvisibility','allow'),
  ('manager','course:viewhiddenactivities','allow'),
  ('manager','course:reset','allow'),
  ('manager','course:managescales','allow'),
  ('manager','course:tag','allow'),
  ('manager','role:review','allow'),
  ('manager','cohort:view','allow'),
  ('manager','cohort:manage','allow'),
  ('manager','forum:viewdiscussion','allow'),
  ('manager','forum:startdiscussion','allow'),
  ('manager','forum:replypost','allow'),
  ('manager','forum:addquestion','allow'),
  ('manager','forum:viewqandawithoutposting','allow'),
  ('manager','forum:rate','allow'),
  ('manager','forum:createattachment','allow'),
  ('manager','forum:deleteownpost','allow'),
  ('manager','forum:editanypost','allow'),
  ('manager','forum:deleteanypost','allow'),
  ('manager','forum:splitdiscussions','allow'),
  ('manager','forum:movediscussions','allow'),
  ('manager','forum:managesubscriptions','allow'),
  ('manager','quiz:view','allow'),
  ('manager','quiz:manage','allow'),
  ('manager','quiz:preview','allow'),
  ('manager','quiz:grade','allow'),
  ('manager','quiz:regrade','allow'),
  ('manager','quiz:viewreports','allow'),
  ('manager','quiz:deleteattempts','allow'),
  ('manager','assign:view','allow'),
  ('manager','assign:grade','allow'),
  ('manager','assign:grantextension','allow'),
  ('manager','assign:viewgrades','allow'),
  ('manager','assign:releasegrades','allow'),
  ('manager','assign:managegrades','allow'),
  ('manager','grade:viewall','allow'),
  ('manager','grade:edit','allow'),
  ('manager','grade:manage','allow'),
  ('manager','grade:viewhidden','allow'),
  ('manager','grade:export','allow'),
  ('manager','grade:import','allow'),
  ('manager','user:viewhiddendetails','allow')
)
insert into role_capability (role_id, context_id, capability, permission)
select r.id, sys.id, defs.cap, defs.perm::cap_permission
from defs
join role r on r.short_name = defs.role_sn
cross join sys
on conflict (role_id, context_id, capability) do nothing;

insert into schema_migrations(version) values ('M19') on conflict do nothing;
