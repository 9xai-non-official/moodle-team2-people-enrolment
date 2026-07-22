-- Dependency: D-SEED, D-CAPNAME(seed)  Issue: T2-RBAC-003/004  Reviewed-by: Khaled + Mahmoud
-- M09 — correct the seeded default capabilities.
--
-- Forward-only: M02 keeps the original seed verbatim, this migration corrects
-- it. Both statements are idempotent deletes, so re-applying is a no-op.
--
-- (1) T2-RBAC-003 — `course:view` is over-granted. seed.sql:58,65,73,78,82
--     grant it to all five roles. Moodle reserves it for manager
--     (access.php:857-864); it is the "inspect a course you are not enrolled
--     in" capability, NOT the enrolment door. Combined with the door gate in
--     permissions.py:314 ("active enrolment OR course:view"), granting it to
--     student means a SUSPENDED student still passes the gate — suspension
--     stops removing access, which breaks HIS-003.
--
-- (2) T2-RBAC-004 — plain `teacher` (the non-editing TA) is granted
--     site:accessallgroups at system context on seed.sql:74, justified by a
--     false-premise comment on :49. Moodle grants it to editingteacher and
--     manager only (access.php:393-401). With it, the TA of HC-03 sees every
--     group by default and the whole group-scoping story collapses.
--
-- (3) D-CAPNAME (seed side) — the seed already uses the unprefixed
--     'site:accessallgroups', which is the recommended canonical form
--     (fewest code changes: permissions.py:156 already agrees; only
--     groups.py:192,201 use the 'moodle/' prefix). No seed change is needed.
--     The final string remains Khaled + Mahmoud's call; if they choose the
--     prefixed form instead, that is a NEW migration, not an edit of this one.

-- (1) course:view -> manager only, at system context.
delete from role_capability rc
using role r, context c
where rc.role_id    = r.id
  and rc.context_id = c.id
  and c.level       = 'system'
  and rc.capability = 'course:view'
  and r.short_name <> 'manager';

-- (2) drop the plain-teacher accessallgroups grant at system context.
delete from role_capability rc
using role r, context c
where rc.role_id    = r.id
  and rc.context_id = c.id
  and c.level       = 'system'
  and rc.capability = 'site:accessallgroups'
  and r.short_name  = 'teacher';

insert into schema_migrations(version) values ('M09') on conflict do nothing;
