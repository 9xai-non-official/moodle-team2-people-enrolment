-- ============================================================================
-- Team 2 — People & Enrolment · schema.sql
-- Our own model, inspired by Moodle 5.x core tables (user, enrol,
-- user_enrolments, context, role, role_assignments, role_capabilities,
-- groups, groupings, cohort, course_completions, course_modules_completion,
-- user_lastaccess) but NOT a copy. Target: PostgreSQL 17 (Supabase).
--
-- Global improvements over Moodle, applied everywhere:
--   1. Real FOREIGN KEY constraints. Moodle's DB has *no* FK constraints at
--      all — referential integrity lives in PHP. Surprise #1 of the schema.
--   2. Enums instead of magic ints (Moodle: status=0 means active,
--      permission=-1000 means prohibit, groupmode 0/1/2...).
--   3. timestamptz instead of unix-epoch bigints. Moodle's
--      user_enrolments.timeend defaults to 2147483647 — a literal Y2038 bug
--      used as "no end date". We use NULL.
--   4. Soft delete (deleted_at) on user/course so history survives deletion
--      (hard case #5: progress across deleted courses).
--   5. jsonb `config` instead of Moodle's customint1..8 / customchar1..3 /
--      customtext1..4 spare columns on the enrol table.
--
-- Isolation: courses & activities are OWNED BY TEAM 1. Our `course` and
-- `course_activity` tables are thin projections synced over their API
-- (external_ref = their id). We never write course content, only the
-- people/enrolment facts about it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type context_level     as enum ('system','category','course','activity','user');
create type role_archetype    as enum ('manager','editingteacher','teacher','student','guest');
create type enrol_method_kind as enum ('manual','self','cohort','guest');
create type method_status     as enum ('enabled','disabled');
create type enrolment_status  as enum ('active','suspended');
create type cap_permission    as enum ('allow','prevent','prohibit');  -- Moodle: 1 / -1 / -1000. "not set" = row absent.
create type group_mode        as enum ('none','separate','visible');   -- Moodle: 0 / 1 / 2
create type completion_state  as enum ('incomplete','complete','complete_pass','complete_fail'); -- Moodle: 0/1/2/3

-- ---------------------------------------------------------------------------
-- app_user  (Moodle: user)
-- WHY: the person. Moodle's user table has 50+ columns (mnethostid, icq,
-- yahoo leftovers...). We keep the identity core.
-- Moodle soft-deletes users: deleted=1, email/username scrambled, row kept —
-- that is why 3-year-old progress is reconstructable. We keep the same idea
-- with deleted_at.
-- ---------------------------------------------------------------------------
create table app_user (
    id          bigint generated always as identity primary key,
    username    varchar(100) not null unique,
    email       varchar(255) not null,
    first_name  varchar(100) not null,
    last_name   varchar(100) not null,
    id_number   varchar(100),                -- external institutional id, for extraction mapping
    suspended   boolean not null default false,  -- can't log in; enrolments untouched
    deleted_at  timestamptz,                     -- soft delete; history survives
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- course  (projection of Team 1's course — they own it)
-- WHY: enrolment/groups/completion all hang off a course. group_mode lives
-- here because Moodle makes it a *course* setting that activities may
-- override unless force_group_mode is set (surprise: the force flag silently
-- ignores every per-activity setting).
-- ---------------------------------------------------------------------------
create table course (
    id                bigint generated always as identity primary key,
    external_ref      varchar(100) unique,       -- Team 1 / Moodle course id
    short_name        varchar(255) not null,
    full_name         text not null,
    visible           boolean not null default true,
    group_mode        group_mode not null default 'none',
    force_group_mode  boolean not null default false,
    start_date        timestamptz,
    end_date          timestamptz,
    deleted_at        timestamptz,               -- soft delete: hard case #5
    created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- course_activity  (projection of Team 1's course_modules)
-- WHY: per-activity group mode (hard case #4), TA scope (hard case #3) and
-- activity completion need something to point at.
-- ---------------------------------------------------------------------------
create table course_activity (
    id                 bigint generated always as identity primary key,
    course_id          bigint not null references course(id),
    external_ref       varchar(100),
    name               text not null,
    activity_type      varchar(50) not null,     -- 'assign','quiz','forum',...
    group_mode         group_mode,               -- NULL = inherit course; ignored if course.force_group_mode
    grouping_id        bigint,                   -- FK added after grouping table below
    visible            boolean not null default true,
    completion_enabled boolean not null default false,
    deleted_at         timestamptz,
    unique (course_id, external_ref)
);

-- ---------------------------------------------------------------------------
-- context  (Moodle: context)
-- WHY: the spine of the permission system. Every place a permission can be
-- checked is a node in one tree: system > category > course > activity/user.
-- Moodle stores only a string path ('/1/3/17') with NO parent FK, and runs a
-- cron job (build_context_path) to repair drift. Improvement: real parent_id
-- FK is the source of truth; path/depth are derived by trigger, cannot drift.
-- instance_id is polymorphic (course.id, activity.id, user.id depending on
-- level) — kept from Moodle deliberately: one tree beats five FK columns.
-- ---------------------------------------------------------------------------
create table context (
    id          bigint generated always as identity primary key,
    level       context_level not null,
    instance_id bigint not null default 0,
    parent_id   bigint references context(id),
    path        text not null default '',    -- derived: '/1/3/17'
    depth       int  not null default 0,     -- derived
    unique (level, instance_id)
);
create index idx_context_parent on context(parent_id);
create index idx_context_path   on context(path text_pattern_ops);

create or replace function trg_context_path() returns trigger
language plpgsql as $$
declare parent_path text; parent_depth int;
begin
    if new.parent_id is null then
        new.path  := '/' || new.id;
        new.depth := 1;
    else
        select path, depth into parent_path, parent_depth from context where id = new.parent_id;
        new.path  := parent_path || '/' || new.id;
        new.depth := parent_depth + 1;
    end if;
    return new;
end $$;
create trigger context_path before insert or update of parent_id on context
    for each row execute function trg_context_path();

-- ---------------------------------------------------------------------------
-- role  (Moodle: role)
-- WHY: a named bundle of capability settings. The archetype is what "reset
-- to default" resets to. Surprise: Moodle's role.name is often EMPTY —
-- display names are localised at runtime from the archetype.
-- ---------------------------------------------------------------------------
create table role (
    id          bigint generated always as identity primary key,
    short_name  varchar(100) not null unique,
    name        varchar(255) not null,
    description text not null default '',
    archetype   role_archetype,
    sort_order  int not null unique
);

-- ---------------------------------------------------------------------------
-- capability  (Moodle: capabilities)
-- WHY: the catalogue of checkable actions ('mod/assign:grade').
-- min_context_level = the highest point in the tree where the capability is
-- meaningful. risks: Moodle packs these into a bitmask; we use a text[].
-- ---------------------------------------------------------------------------
create table capability (
    name              varchar(255) primary key,
    cap_type          varchar(10) not null default 'write' check (cap_type in ('read','write')),
    min_context_level context_level not null default 'course',
    component         varchar(100) not null default 'core',
    risks             text[] not null default '{}'   -- e.g. {xss,personal,dataloss}
);

-- ---------------------------------------------------------------------------
-- role_capability  (Moodle: role_capabilities)
-- WHY: "role R says P about capability C, at and below context X."
-- A row at system context = the role's definition. A row at a deeper context
-- = an override (this is how hard case #3's TA loses marking rights on one
-- group's activity). Absence of a row = 'not set', NOT 'deny' — that
-- distinction is load-bearing in the resolver.
-- ---------------------------------------------------------------------------
create table role_capability (
    id          bigint generated always as identity primary key,
    role_id     bigint not null references role(id) on delete cascade,
    context_id  bigint not null references context(id) on delete cascade,
    capability  varchar(255) not null references capability(name) on delete cascade,
    permission  cap_permission not null,
    modified_by bigint references app_user(id),
    updated_at  timestamptz not null default now(),
    unique (role_id, context_id, capability)
);
create index idx_rolecap_lookup on role_capability(capability, context_id);

-- ---------------------------------------------------------------------------
-- role_assignment  (Moodle: role_assignments)
-- WHY: "user U holds role R at context X (and everything below it)."
-- THE key Moodle insight, kept: being enrolled and having a role are two
-- separate facts. Enrolment puts you in the course; role assignment gives
-- you power. component/item_id record WHO created the assignment
-- ('enrol_cohort' + method id) so removing a sync can remove exactly its own
-- assignments and nothing else — hard case #1.
-- ---------------------------------------------------------------------------
create table role_assignment (
    id          bigint generated always as identity primary key,
    user_id     bigint not null references app_user(id) on delete cascade,
    role_id     bigint not null references role(id) on delete cascade,
    context_id  bigint not null references context(id) on delete cascade,
    component   varchar(100) not null default '',  -- '' = manual, else 'enrol_cohort' etc.
    item_id     bigint not null default 0,         -- the enrolment_method that created it
    assigned_by bigint references app_user(id),
    assigned_at timestamptz not null default now(),
    unique (user_id, role_id, context_id, component, item_id)
);
create index idx_ra_user_ctx on role_assignment(user_id, context_id);

-- ---------------------------------------------------------------------------
-- cohort / cohort_member  (Moodle: cohort, cohort_members)
-- WHY: site-wide people lists that drive automatic enrolment (the "group
-- sync" of hard case #1 is enrol_cohort in Moodle).
-- ---------------------------------------------------------------------------
create table cohort (
    id          bigint generated always as identity primary key,
    name        varchar(254) not null,
    id_number   varchar(100) unique,
    description text not null default '',
    component   varchar(100) not null default '',  -- non-empty = externally managed, hands off
    created_at  timestamptz not null default now()
);

create table cohort_member (
    cohort_id  bigint not null references cohort(id) on delete cascade,
    user_id    bigint not null references app_user(id) on delete cascade,
    added_at   timestamptz not null default now(),
    primary key (cohort_id, user_id)
);

-- ---------------------------------------------------------------------------
-- enrolment_method  (Moodle: enrol)
-- WHY: an *instance* of a way into one course ("this course's self-enrolment
-- with password X", "sync from cohort Y"). Disabling the instance suspends
-- participation via it WITHOUT deleting anybody's enrolment row — that
-- distinction is the whole answer to hard case #1.
-- config jsonb replaces Moodle's 15 custom* spare columns.
-- ---------------------------------------------------------------------------
create table enrolment_method (
    id              bigint generated always as identity primary key,
    course_id       bigint not null references course(id),
    method          enrol_method_kind not null,
    status          method_status not null default 'enabled',
    default_role_id bigint references role(id),           -- role granted on enrol via this method
    cohort_id       bigint references cohort(id),         -- method='cohort' only
    enrol_start     timestamptz,
    enrol_end       timestamptz,
    enrol_duration  interval,                             -- per-user length of enrolment
    config          jsonb not null default '{}'::jsonb,   -- password, welcome message, ...
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    check (method <> 'cohort' or cohort_id is not null)
);
create index idx_method_course on enrolment_method(course_id);

-- ---------------------------------------------------------------------------
-- enrolment  (Moodle: user_enrolments)
-- WHY: one row = one user's participation VIA ONE METHOD. Enrolled twice by
-- two methods = two rows (Moodle's actual answer to "one membership with two
-- reasons, or two memberships": two). Remove the cohort sync → only its rows
-- go; the manual row keeps the student enrolled. Hard case #1.
-- A user is effectively IN the course if at least one row is active, its
-- method enabled, and now() is inside the time window — see
-- v_course_participant.
-- time_end NULL = open-ended (Moodle: 2147483647).
-- ---------------------------------------------------------------------------
create table enrolment (
    id          bigint generated always as identity primary key,
    method_id   bigint not null references enrolment_method(id) on delete cascade,
    user_id     bigint not null references app_user(id) on delete cascade,
    status      enrolment_status not null default 'active',
    time_start  timestamptz,
    time_end    timestamptz,
    modified_by bigint references app_user(id),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (method_id, user_id)
);
create index idx_enrolment_user on enrolment(user_id);

-- ---------------------------------------------------------------------------
-- course_group / group_member  (Moodle: groups, groups_members)
-- WHY: partitions of people INSIDE one course. Surprise kept from Moodle: a
-- user CAN be in two groups of the same course at once — hard case #4 is a
-- feature, not a bug; 'separate' mode then shows the union of both groups.
-- group membership does not imply enrolment in Moodle's DB (no constraint);
-- we keep that quirk and document it instead of "fixing" extraction away.
-- ---------------------------------------------------------------------------
create table course_group (
    id            bigint generated always as identity primary key,
    course_id     bigint not null references course(id),
    name          varchar(254) not null,
    id_number     varchar(100),
    description   text not null default '',
    enrolment_key varchar(50),          -- self-enrol with this key → auto-join this group
    participation boolean not null default true,
    created_at    timestamptz not null default now()
);
create index idx_group_course on course_group(course_id);

create table group_member (
    group_id  bigint not null references course_group(id) on delete cascade,
    user_id   bigint not null references app_user(id) on delete cascade,
    component varchar(100) not null default '',   -- what auto-added this membership
    item_id   bigint not null default 0,
    added_at  timestamptz not null default now(),
    primary key (group_id, user_id)
);
create index idx_gm_user on group_member(user_id);

-- ---------------------------------------------------------------------------
-- grouping / grouping_group  (Moodle: groupings, groupings_groups)
-- WHY: named sets OF GROUPS, used to restrict an activity to some groups.
-- Kept as a separate concept exactly like Moodle — collapsing groupings into
-- groups is the classic redesign mistake; activities point at groupings, not
-- groups.
-- ---------------------------------------------------------------------------
create table grouping (
    id          bigint generated always as identity primary key,
    course_id   bigint not null references course(id),
    name        varchar(255) not null,
    description text not null default '',
    created_at  timestamptz not null default now()
);

create table grouping_group (
    grouping_id bigint not null references grouping(id) on delete cascade,
    group_id    bigint not null references course_group(id) on delete cascade,
    added_at    timestamptz not null default now(),
    primary key (grouping_id, group_id)
);

alter table course_activity
    add constraint fk_activity_grouping foreign key (grouping_id) references grouping(id);

-- ---------------------------------------------------------------------------
-- course_completion  (Moodle: course_completions)
-- WHY: per user per course: when they enrolled, started, finished. Surprise
-- kept from Moodle: this row SURVIVES unenrolment and course soft-delete —
-- that is the only reason hard cases #2 and #5 are answerable. Never cascade
-- from enrolment.
-- ---------------------------------------------------------------------------
create table course_completion (
    id             bigint generated always as identity primary key,
    user_id        bigint not null references app_user(id),
    course_id      bigint not null references course(id),
    time_enrolled  timestamptz,
    time_started   timestamptz,
    time_completed timestamptz,
    unique (user_id, course_id)
);

-- ---------------------------------------------------------------------------
-- activity_completion  (Moodle: course_modules_completion + course_modules_viewed)
-- WHY: per user per activity state. Improvement: Moodle keeps "viewed" in a
-- separate one-row-per-view table; a nullable viewed_at column does the same
-- job. overridden_by ≠ NULL means a teacher manually set the state (and
-- Moodle then stops auto-updating it — surprise worth testing).
-- No row = 'incomplete' in Moodle; we allow explicit rows too.
-- ---------------------------------------------------------------------------
create table activity_completion (
    id            bigint generated always as identity primary key,
    activity_id   bigint not null references course_activity(id),
    user_id       bigint not null references app_user(id),
    state         completion_state not null default 'incomplete',
    viewed_at     timestamptz,
    overridden_by bigint references app_user(id),
    updated_at    timestamptz not null default now(),
    unique (user_id, activity_id)
);

-- ---------------------------------------------------------------------------
-- user_last_access  (Moodle: user_lastaccess)
-- WHY: powers "last access to course" on the participants page; also the
-- evidence trail for "did they ever come back after re-enrolling" (hard
-- case #2).
-- ---------------------------------------------------------------------------
create table user_last_access (
    user_id     bigint not null references app_user(id) on delete cascade,
    course_id   bigint not null references course(id),
    accessed_at timestamptz not null default now(),
    primary key (user_id, course_id)
);

-- ---------------------------------------------------------------------------
-- audit_log  (Moodle: logstore_standard_log, heavily slimmed)
-- WHY: enrolment/role/group changes must be reconstructable after the fact
-- (hard cases #2, #5). Append-only; no FKs to user/course ON PURPOSE so log
-- rows outlive hard deletes of anything.
-- ---------------------------------------------------------------------------
create table audit_log (
    id           bigint generated always as identity primary key,
    event        varchar(100) not null,     -- 'enrolment.created', 'role.assigned', ...
    actor_id     bigint,
    affected_id  bigint,
    course_id    bigint,
    context_id   bigint,
    detail       jsonb not null default '{}'::jsonb,
    created_at   timestamptz not null default now()
);
create index idx_audit_affected on audit_log(affected_id, created_at);

-- ===========================================================================
-- Views — the questions the app asks constantly
-- ===========================================================================

-- Effective participation, method by method, then rolled up per course.
-- Encodes THE enrolment rule: in the course iff ANY method-row is fully live.
create view v_enrolment_detail as
select
    e.id            as enrolment_id,
    e.user_id,
    m.course_id,
    m.id            as method_id,
    m.method,
    e.status        as enrolment_status,
    m.status        as method_status,
    e.time_start,
    e.time_end,
    (    u.deleted_at is null
     and e.status = 'active'
     and m.status = 'enabled'
     and (e.time_start is null or e.time_start <= now())
     and (e.time_end   is null or e.time_end   >  now())
    ) as live
from enrolment e
join enrolment_method m on m.id = e.method_id
join app_user u         on u.id = e.user_id;

create view v_course_participant as
select
    user_id,
    course_id,
    bool_or(live)                as enrolled,       -- in the course right now
    count(*)                     as method_count,   -- how many routes in
    array_agg(distinct method)   as methods
from v_enrolment_detail
group by user_id, course_id;

-- Progress: completed / completable activities per user per course.
-- Includes soft-deleted courses on purpose (hard case #5).
create view v_course_progress as
select
    cc.user_id,
    cc.course_id,
    c.short_name,
    c.deleted_at is not null as course_deleted,
    cc.time_completed,
    count(ac.id) filter (where ac.state in ('complete','complete_pass')) as activities_done,
    (select count(*) from course_activity a
      where a.course_id = cc.course_id and a.completion_enabled and a.deleted_at is null) as activities_total
from course_completion cc
join course c on c.id = cc.course_id
left join activity_completion ac
       on ac.user_id = cc.user_id
      and ac.activity_id in (select id from course_activity where course_id = cc.course_id)
group by cc.user_id, cc.course_id, c.short_name, c.deleted_at, cc.time_completed;

-- ===========================================================================
-- fn_can — the permission engine. "Can this user do this action in this
-- context, and WHY." Implements Moodle's real resolution rules:
--   1. Collect the user's role assignments at the context and every ancestor.
--   2. Per role, the DEEPEST role_capability row along the path wins
--      (an override at course level beats the system default) — EXCEPT
--      prohibit: once a role has prohibit anywhere on the path, a deeper
--      allow cannot switch it back (Moodle rule, tested).
--   3. Combine across roles: any 'prohibit' → denied, unconditionally
--      (prohibit is the "no override can save you" value; that's why it
--      exists at all). Otherwise any 'allow' → granted. Otherwise denied
--      ('prevent' and 'not set' both fall through to deny — but 'prevent'
--      only silences ITS role; another role's allow still wins).
-- Returns the verdict AND the full per-role trace as jsonb, because the
-- brief scores the "why".
-- ===========================================================================
create or replace function fn_can(p_user_id bigint, p_capability varchar, p_context_id bigint)
returns jsonb
language sql stable as $$
with recursive ancestors as (
    select c.*, 0 as dist from context c where c.id = p_context_id
    union all
    select c.*, a.dist + 1 from context c join ancestors a on c.id = a.parent_id
),
my_roles as (
    select distinct ra.role_id
    from role_assignment ra
    where ra.user_id = p_user_id
      and ra.context_id in (select id from ancestors)
),
gathered as (
    select rc.role_id, r.short_name, rc.permission, a.depth
    from role_capability rc
    join ancestors a on a.id = rc.context_id
    join role r      on r.id = rc.role_id
    where rc.capability = p_capability
      and rc.role_id in (select role_id from my_roles)
),
resolved as (
    -- deepest definition wins per role, but prohibit is sticky: it cannot be
    -- overridden back to allow at a lower context
    select role_id, short_name,
           case when bool_or(permission = 'prohibit') then 'prohibit'::cap_permission
                else (array_agg(permission order by depth desc))[1]
           end as permission,
           max(depth) as decided_at_depth
    from gathered
    group by role_id, short_name
)
select jsonb_build_object(
    'user_id',    p_user_id,
    'capability', p_capability,
    'context_id', p_context_id,
    'granted',    coalesce(
                    not exists (select 1 from resolved where permission = 'prohibit')
                    and exists (select 1 from resolved where permission = 'allow'),
                    false),
    'reason',     case
                    when exists (select 1 from resolved where permission = 'prohibit')
                        then 'a role resolves to PROHIBIT — nothing can override it'
                    when exists (select 1 from resolved where permission = 'allow')
                        then 'at least one role resolves to ALLOW and none prohibits'
                    when exists (select 1 from my_roles)
                        then 'user has roles here, but none resolves to ALLOW for this capability'
                    else 'user has no role assignment at this context or any ancestor'
                  end,
    'trace',      coalesce((select jsonb_agg(jsonb_build_object(
                        'role', short_name,
                        'permission', permission,
                        'decided_at_depth', decided_at_depth)
                        order by short_name)
                   from resolved), '[]'::jsonb)
);
$$;

-- ===========================================================================
-- Row Level Security: locked shut. The FastAPI backend connects with the
-- service role (bypasses RLS); anon/PostgREST access is denied by default.
-- ===========================================================================
alter table app_user            enable row level security;
alter table course              enable row level security;
alter table course_activity     enable row level security;
alter table context             enable row level security;
alter table role                enable row level security;
alter table capability          enable row level security;
alter table role_capability     enable row level security;
alter table role_assignment     enable row level security;
alter table cohort              enable row level security;
alter table cohort_member       enable row level security;
alter table enrolment_method    enable row level security;
alter table enrolment           enable row level security;
alter table course_group        enable row level security;
alter table group_member        enable row level security;
alter table grouping            enable row level security;
alter table grouping_group      enable row level security;
alter table course_completion   enable row level security;
alter table activity_completion enable row level security;
alter table user_last_access    enable row level security;
alter table audit_log           enable row level security;
