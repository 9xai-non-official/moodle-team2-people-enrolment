-- Dependency: D-CAPSEED-ENR   Issue: T2-ENR-001   Reviewed-by: Yaman (requester)
--                              Resolver impact: Khaled (item 2 — see note)
--
-- COORDINATION DRAFT for Essa — NOT a migration yet. Essa owns all DDL/seed
-- (TEAM-OWNERSHIP-MATRIX §9-11); this file is the additive diff requested by
-- the T2-ENR-001 authz wiring. Essa assigns the real number (M17 is the next
-- free slot after M15; M14/M16 are reserved conditionals) and moves it into
-- migrations/.
--
-- WHY: routers/enrolment.py now enforces these capabilities FAIL-CLOSED
-- (require_capability on an unseeded name denies everyone except the admin
-- config-list — the same posture permissions.py:160 takes for role:manage).
-- This seed turns the intended grants on. Forward-only; every statement
-- idempotent.

-- (1) capability catalogue — names keep M02's component:action convention.
insert into capability (name, cap_type, min_context_level, component, risks) values
  ('course:enrolconfig', 'write', 'course', 'core',         '{config,dataloss}'), -- create/patch/DELETE method instances (delete bulk-unenrols)
  ('enrol:manage',       'write', 'course', 'enrol_manual', '{config}'),          -- suspend/reactivate an enrolment (Moodle enrol/manual:manage)
  ('enrol:selfenrol',    'write', 'course', 'enrol_self',   '{}'),                -- Moodle enrol/self:enrolself
  ('cohort:config',      'write', 'course', 'enrol_cohort', '{config}'),          -- trigger cohort-method sync (Moodle enrol/cohort:config)
  ('cohort:manage',      'write', 'system', 'core',         '{config}'),          -- create cohorts (site-level, moodle/cohort:manage)
  ('cohort:assign',      'write', 'system', 'core',         '{personal}')         -- add/remove cohort members (moodle/cohort:assign)
on conflict (name) do nothing;

-- (2) the 'user' role row (Moodle's "Authenticated user").
--     permissions.py _held_roles() already synthesizes a virtual 'user' role
--     for every non-guest principal and PREFERS a real row when one exists
--     (permissions.py:507-517) — this is the designed hook, not a new
--     mechanism. Without the row, enrol:selfenrol cannot be granted to
--     "anyone logged in": a student-role grant only works in courses where
--     the user ALREADY holds student, which defeats self-enrolment.
--     >>> NEEDS KHALED'S ACK before merging (resolver semantics). <<<
insert into role (short_name, name, description, archetype, sort_order)
select 'user', 'Authenticated user',
       'Every logged-in principal virtually holds this role (permissions.py _held_roles)',
       null, (select max(sort_order) + 1 from role)
where not exists (select 1 from role where short_name = 'user');

-- (3) default grants at the system context.
with sys as (select id from context where level = 'system'),
     defs(role_sn, cap) as (values
  ('manager',        'course:enrolconfig'),
  ('editingteacher', 'course:enrolconfig'),
  ('manager',        'enrol:manage'),
  ('editingteacher', 'enrol:manage'),
  ('manager',        'cohort:config'),
  ('editingteacher', 'cohort:config'),
  ('manager',        'cohort:manage'),
  ('manager',        'cohort:assign'),
  ('user',           'enrol:selfenrol'),   -- any authenticated user MAY self-enrol;
                                           -- the method's own 5-gate chain
                                           -- (key/window/capacity) stays the real door (§6.6)
  ('student',        'enrol:selfenrol')    -- belt-and-braces for role-switch simulations
)
insert into role_capability (role_id, context_id, capability, permission)
select r.id, sys.id, defs.cap, 'allow'::cap_permission
from defs
join role r on r.short_name = defs.role_sn
cross join sys
on conflict (role_id, context_id, capability) do nothing;

-- Open question for the team (NOT part of this draft): course:viewparticipants
-- is currently seeded to manager/editingteacher/teacher only, so student
-- personas 403 on the roster read. If students should see their course's
-- participant list (Moodle default), that is a separate one-line grant —
-- flagged for Khaled + Issa to decide.
