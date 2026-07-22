-- ============================================================================
-- Team 2 — People & Enrolment · seed.sql
-- The permission system's "operating system": system context, the five core
-- roles (Moodle archetypes), the capabilities our area needs, and the
-- default role_capability rows at system context.
-- This is CONFIGURATION, not test data — the brief forbids invented course
-- data; real data arrives via extraction from the given Moodle course.
-- ============================================================================

-- Root of the context tree (Moodle: contextlevel 10, instanceid 0, path '/1').
insert into context (level, instance_id, parent_id) values ('system', 0, null);

-- ---------------------------------------------------------------------------
-- Roles. Moodle ships these archetypes; sort_order = priority in UI lists.
-- 'teacher' (non-editing teacher) is the TA role of hard case #3.
-- ---------------------------------------------------------------------------
insert into role (short_name, name, description, archetype, sort_order) values
  ('manager',        'Manager',             'Site/category administration',            'manager',        1),
  ('editingteacher', 'Teacher',             'Full control inside a course',            'editingteacher', 2),
  ('teacher',        'Non-editing teacher', 'Can grade, cannot change the course (TA)','teacher',        3),
  ('student',        'Student',             'Participates and submits',                'student',        4),
  ('guest',          'Guest',               'Read-only visitor',                       'guest',          5);

-- ---------------------------------------------------------------------------
-- Capabilities for the People & Enrolment area. Names keep Moodle's
-- component:action convention so extraction maps 1:1.
-- ---------------------------------------------------------------------------
insert into capability (name, cap_type, min_context_level, component, risks) values
  ('course:view',              'read',  'course',   'core',        '{}'),
  ('course:viewparticipants',  'read',  'course',   'core',        '{personal}'),
  ('course:viewhidden',        'read',  'course',   'core',        '{}'),
  ('site:accessallgroups',     'read',  'course',   'core',        '{personal}'),  -- the key to hard cases #3/#4
  ('group:manage',             'write', 'course',   'core',        '{}'),
  ('role:assign',              'write', 'course',   'core',        '{spam,personal}'),
  ('role:override',            'write', 'course',   'core',        '{}'),
  ('role:manage',              'write', 'system',   'core',        '{config,personal}'),  -- create/clone role DEFINITIONS (Moodle: moodle/role:manage)
  ('enrol:manual',             'write', 'course',   'enrol_manual','{}'),
  ('enrol:unenrol',            'write', 'course',   'enrol_manual','{dataloss}'),
  ('enrol:selfunenrol',        'write', 'course',   'enrol_self',  '{}'),
  ('activity:view',            'read',  'activity', 'core',        '{}'),
  ('activity:grade',           'write', 'activity', 'core',        '{}'),          -- TA marking scope, hard case #3
  ('activity:submit',          'write', 'activity', 'core',        '{}'),
  ('completion:override',      'write', 'activity', 'core',        '{}'),          -- Moodle: moodle/completion:overrideactivitycompletion (progress T2-PRG-003)
  ('progress:viewown',         'read',  'course',   'core',        '{}'),
  ('progress:viewall',         'read',  'course',   'core',        '{personal}'),
  ('user:viewdetails',         'read',  'user',     'core',        '{personal}');

-- ---------------------------------------------------------------------------
-- Default definitions at system context (context id 1).
-- Overrides at deeper contexts are runtime data, not seed.
-- Surprise worth keeping: Moodle gives site:accessallgroups to BOTH teacher
-- roles by default — the TA of hard case #3 only gets group-scoped after an
-- explicit override (prevent) at the course or activity context.
-- Guest gets a real PROHIBIT on submitting: the demo of "no override can
-- save you" — an allow deeper in the tree cannot resurrect it.
-- ---------------------------------------------------------------------------
with sys as (select id from context where level = 'system'),
     defs(role_sn, cap, perm) as (values
  -- manager
  ('manager','course:view','allow'), ('manager','course:viewparticipants','allow'),
  ('manager','course:viewhidden','allow'), ('manager','site:accessallgroups','allow'),
  ('manager','group:manage','allow'), ('manager','role:assign','allow'),
  ('manager','role:override','allow'), ('manager','role:manage','allow'),
  ('manager','completion:override','allow'),
  ('manager','enrol:manual','allow'),
  ('manager','enrol:unenrol','allow'), ('manager','progress:viewall','allow'),
  ('manager','user:viewdetails','allow'),
  -- editing teacher
  ('editingteacher','course:view','allow'), ('editingteacher','course:viewparticipants','allow'),
  ('editingteacher','course:viewhidden','allow'), ('editingteacher','site:accessallgroups','allow'),
  ('editingteacher','group:manage','allow'), ('editingteacher','role:assign','allow'),
  ('editingteacher','role:override','allow'), ('editingteacher','enrol:manual','allow'),
  ('editingteacher','enrol:unenrol','allow'), ('editingteacher','activity:view','allow'),
  ('editingteacher','activity:grade','allow'), ('editingteacher','progress:viewall','allow'),
  ('editingteacher','completion:override','allow'),  -- NOT non-editing teacher (Moodle policy)
  ('editingteacher','user:viewdetails','allow'),
  -- non-editing teacher (TA)
  ('teacher','course:view','allow'), ('teacher','course:viewparticipants','allow'),
  ('teacher','site:accessallgroups','allow'),        -- yes, by default! see note above
  ('teacher','activity:view','allow'), ('teacher','activity:grade','allow'),
  ('teacher','progress:viewall','allow'), ('teacher','user:viewdetails','allow'),
  -- student
  ('student','course:view','allow'), ('student','activity:view','allow'),
  ('student','activity:submit','allow'), ('student','progress:viewown','allow'),
  ('student','enrol:selfunenrol','allow'),
  -- guest
  ('guest','course:view','allow'), ('guest','activity:view','allow'),
  ('guest','activity:submit','prohibit')
)
insert into role_capability (role_id, context_id, capability, permission)
select r.id, sys.id, defs.cap, defs.perm::cap_permission
from defs
join role r on r.short_name = defs.role_sn
cross join sys;
