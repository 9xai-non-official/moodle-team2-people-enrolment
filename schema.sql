-- ============================================================================
-- >> CURRENT FULL STATE — regenerated through migration M15. <<
--
-- This file is DOCUMENTATION, not the way to change the database. To change
-- it, add a migration in migrations/ and regenerate this file; never edit here
-- and expect it to reach a database. `migrations/apply.py --status` is the
-- authoritative answer to "what is actually applied where".
--
-- Sections changed by migrations are marked inline with the migration that
-- did it, so the reasoning stays next to the DDL instead of only in the
-- migration file.
-- ============================================================================

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

-- Added by migrations.
create type group_visibility       as enum ('all','members','own','none');  -- M05, Moodle GROUPS_VISIBILITY_*
create type availability_display   as enum ('hidden','greyed');             -- M06
create type completion_aggregation as enum ('all','any');                   -- M04
create type completion_crit_type   as enum                                  -- M04
    ('self','date','unenrol','activity','duration','grade','role','course');

-- ---------------------------------------------------------------------------
-- schema_migrations (M01)
-- WHY: before migrations existed the whole of this file was applied at once,
-- so there was no way to make a reviewed, incremental change. This ledger is
-- what makes the workflow possible; apply.py reads and writes it.
-- ---------------------------------------------------------------------------
create table schema_migrations (
    version    text primary key,
    applied_at timestamptz not null default now()
);

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

-- M07 (D-CTX): the trigger above recomputes only the row being moved, leaving
-- every DESCENDANT with a stale path/depth — so capability inheritance would
-- silently resolve against the old tree. Moodle repairs that with a cron job;
-- our claim is "derived, cannot drift", so it has to be right at write time.
-- Updating path/depth does not re-fire the BEFORE trigger (it is `update of
-- parent_id`), so there is no recursion. idx_context_path serves the LIKE.
create or replace function trg_context_path_descendants() returns trigger
language plpgsql as $$
begin
    if old.path is distinct from new.path then
        update context d
           set path  = new.path || substr(d.path, length(old.path) + 1),
               depth = new.depth + (d.depth - old.depth)
         where d.path like old.path || '/%';
    end if;
    return null;
end $$;
create trigger context_path_descendants after update of parent_id on context
    for each row execute function trg_context_path_descendants();

-- >> DRIFT — a second, functionally equivalent reparent trigger, also created
-- >> directly against the live database. Same prefix-rewrite, same depth
-- >> arithmetic, different name. Harmless in practice (the first one runs, and
-- >> the second's LIKE no longer matches once paths have moved) but redundant;
-- >> one should be dropped by migration.
create or replace function trg_context_reparent() returns trigger
language plpgsql as $$
begin
    if new.path is distinct from old.path then
        update context
           set path  = new.path || substring(path from length(old.path) + 1),
               depth = depth + (new.depth - old.depth)
         where path like old.path || '/%';
    end if;
    return null;
end $$;
create trigger context_reparent after update of parent_id on context
    for each row execute function trg_context_reparent();

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
-- M08 (D-GUEST): one guest method per course, enforced by the database rather
-- than an application pre-check that two concurrent creates both passed.
-- Correctly PARTIAL — manual/self/cohort stay multi-instance, since Moodle has
-- no unique on (courseid, enrol) and a course may have several self-enrolment
-- instances (DATA-002).
create unique index uq_guest_method_per_course
    on enrolment_method (course_id)
    where method = 'guest';

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
    -- M05 (D-GRP-VIS): who can SEE the group. Separate axis from
    -- `participation`, which is whether its members act as a group. Default
    -- 'all' matches Moodle's `visibility DEFAULT 0`.
    visibility    group_visibility not null default 'all',
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

-- M13 (D-IMMUT): time_completed is write-once. Setting it the first time is
-- allowed; changing OR clearing it afterwards raises. Re-POSTing a completion
-- used to rewrite the timestamp to a fresh now() and a plain DELETE
-- un-completed the course — both rewriting history with no authorisation and
-- no audit trail (T2-PRG-002). Un-completion must be an explicit, authorised,
-- audited reset, not an UPDATE. A CHECK cannot express this: it cannot see the
-- old value.
create or replace function trg_completion_immutable() returns trigger
language plpgsql as $$
begin
    if old.time_completed is not null
       and new.time_completed is distinct from old.time_completed then
        raise exception
            'course_completion.time_completed is write-once (was %, cannot set to %)',
            old.time_completed, new.time_completed
            using errcode = 'restrict_violation';
    end if;
    return new;
end $$;
create trigger completion_time_immutable before update on course_completion
    for each row execute function trg_completion_immutable();

-- >> DRIFT — a SECOND write-once trigger exists on this table, created
-- >> directly against the live database, and the two do NOT agree.
--
-- trg_completion_write_once() guards:
--     old.time_completed is not null
--     AND new.time_completed is not null      <-- the difference
--     AND new.time_completed <> old.time_completed
--
-- That extra `new is not null` means it permits setting time_completed back to
-- NULL — i.e. silent un-completion, which is the exact half of T2-PRG-002 that
-- M13 exists to close. M13's version uses `is distinct from`, so it blocks
-- clearing as well as changing.
--
-- Both triggers currently fire, so the stricter one wins and behaviour is
-- correct today. The hazard is that they look redundant: dropping
-- completion_time_immutable as "the duplicate" would silently re-open
-- un-completion with no test failing. One of them should go, by migration, and
-- it should be this weaker one.
create or replace function trg_completion_write_once() returns trigger
language plpgsql as $$
begin
  if old.time_completed is not null
     and new.time_completed is not null
     and new.time_completed <> old.time_completed then
    raise exception 'course_completion.time_completed is write-once (was %, tried %)',
      old.time_completed, new.time_completed;
  end if;
  return new;
end $$;
create trigger completion_write_once before update on course_completion
    for each row execute function trg_completion_write_once();

-- ---------------------------------------------------------------------------
-- activity_completion  (Moodle: course_modules_completion + course_modules_viewed)
-- WHY: per user per activity state. Improvement: Moodle keeps "viewed" in a
-- separate one-row-per-view table; a nullable viewed_at column does the same
-- job. overridden_by ≠ NULL means a teacher manually set the state (and
-- Moodle then stops auto-updating it — surprise worth testing).
-- No row = 'incomplete' in Moodle; we allow explicit rows too.
-- ---------------------------------------------------------------------------
-- M15 note: activity_id is ON DELETE CASCADE (was RESTRICT). A hard delete of
-- an activity used to be blocked outright once anyone had a completion row
-- against it (HIS-007). Per-activity state is meaningless once the activity is
-- gone, so it cascades — but course_completion and course_completion_crit_compl
-- stay NON-cascading, because those surviving unenrolment and course
-- soft-delete is what makes HC-02 and HC-05 answerable.
create table activity_completion (
    id            bigint generated always as identity primary key,
    activity_id   bigint not null references course_activity(id) on delete cascade,
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
-- M10 (D-AUDIT): report-query indexes. The DDL above was assessed as adequate
-- and deliberately left alone — no FKs, so rows outlive hard deletes of what
-- they reference (matches logstore_standard_log, DATA-016). Do not add FKs.
-- Retention: indefinite, matching Moodle's default loglifetime=0 (HIS-011).
create index idx_audit_course on audit_log(course_id, created_at);
create index idx_audit_actor  on audit_log(actor_id,  created_at);
create index idx_audit_event  on audit_log(event,     created_at);

-- ---------------------------------------------------------------------------
-- permission_decision (M11, D-PDEC)
-- WHY: the Decision Log — every permission CHECK, including denials, which
-- mutate nothing and so do not belong in audit_log. Kept distinct on purpose:
-- "who was denied" and "what changed" have different readers and different
-- retention.
-- This table used to be created lazily at RUNTIME by permissions.py and was
-- absent from this file entirely — the live database had 21 tables where this
-- documented 20. M11 brought it under version control, added the query indexes
-- it never had, and turned RLS ON: it records who was denied what, and was
-- readable outside the service-role path until then.
-- ---------------------------------------------------------------------------
create table permission_decision (
    id         bigint generated always as identity primary key,
    actor_id   bigint,
    capability varchar(255),
    context_id bigint,
    target_id  bigint,
    allowed    boolean     not null,
    reasons    jsonb       not null default '{}'::jsonb,
    decided_at timestamptz not null default now()
);
create index idx_pdec_actor      on permission_decision(actor_id,   decided_at desc);
create index idx_pdec_target     on permission_decision(target_id,  decided_at desc);
create index idx_pdec_capability on permission_decision(capability, decided_at desc);

-- ---------------------------------------------------------------------------
-- Completion criteria (M04, D-CRIT) — mirrors Moodle's criteria tables
-- (DATA-012). Substrate only: the ALL/ANY aggregation compute is the progress
-- domain's, not the schema's.
-- ---------------------------------------------------------------------------
create table course_completion_criteria (
    id            bigint generated always as identity primary key,
    course_id     bigint not null references course(id) on delete cascade,
    criteria_type completion_crit_type not null,
    activity_id   bigint references course_activity(id) on delete cascade,
    grade_pass    numeric(10,5),
    time_end      timestamptz,
    enrol_period  interval,
    role_id       bigint references role(id),
    config        jsonb not null default '{}'::jsonb,
    created_at    timestamptz not null default now()
);
create index idx_ccc_course on course_completion_criteria(course_id);

create table course_completion_aggr_methd (
    id            bigint generated always as identity primary key,
    course_id     bigint not null references course(id) on delete cascade,
    criteria_type completion_crit_type,   -- NULL = overall course aggregation
    method        completion_aggregation not null default 'all',
    unique (course_id, criteria_type)
);

create table course_completion_crit_compl (
    id             bigint generated always as identity primary key,
    user_id        bigint not null references app_user(id),   -- NO cascade: survives (HIS-002)
    course_id      bigint not null references course(id),     -- NO cascade
    criteria_id    bigint not null references course_completion_criteria(id) on delete cascade,
    grade_final    numeric(10,5),
    unenrolled_at  timestamptz,
    time_completed timestamptz,
    unique (user_id, course_id, criteria_id)
);
create index idx_cccc_user_course on course_completion_crit_compl(user_id, course_id);

-- ---------------------------------------------------------------------------
-- activity_availability (M06, D-GRP-AVAIL)
-- WHY: restrict an activity to a group or grouping. Modelled relationally
-- rather than as Moodle's opaque JSON `availability` blob on course_modules —
-- real FKs, a real CHECK, and a restriction set you can query. The CHECK
-- enforces exactly one target: never both, never neither.
-- ---------------------------------------------------------------------------
create table activity_availability (
    id          bigint generated always as identity primary key,
    activity_id bigint not null references course_activity(id) on delete cascade,
    group_id    bigint references course_group(id) on delete cascade,
    grouping_id bigint references grouping(id) on delete cascade,
    display     availability_display not null default 'greyed',
    created_at  timestamptz not null default now(),
    check ((group_id is not null)::int + (grouping_id is not null)::int = 1)
);
create index idx_availability_activity on activity_availability(activity_id);

-- ---------------------------------------------------------------------------
-- completion_criteria / course_completion_setting
--
-- >> UNVERSIONED DRIFT — transcribed from the live database, NOT created by
-- >> any migration. Needs reconciling with M04 before it hardens.
--
-- Created directly against the deployed database at 2026-07-22 08:26, roughly
-- twenty minutes after M04 landed, and already carrying rows while M04's
-- tables sit empty. They are well-formed — PK, FKs, a UNIQUE, a CHECK, RLS on
-- — but they exist in no migration, so they are invisible to review and would
-- vanish for anyone rebuilding from this repo.
--
-- They are a simpler parallel model of exactly what M04 provides:
--     completion_criteria        ~ course_completion_criteria
--                                  (activity criteria only; no criteria_type,
--                                   no grade/date/duration/role variants)
--     course_completion_setting  ~ course_completion_aggr_methd
--                                  (aggregation as text+CHECK, not the enum;
--                                   one row per course, so no per-criteria-type
--                                   aggregation)
--
-- Two competing models of one feature on one database is the same failure the
-- three-resolver problem was (see fn_can above) — whichever is adopted, the
-- other should go, and the survivor belongs in a migration. That is the
-- progress domain's call, not the schema's.
-- ---------------------------------------------------------------------------
create table completion_criteria (
    id          bigint generated always as identity primary key,
    course_id   bigint not null references course(id) on delete cascade,
    activity_id bigint not null references course_activity(id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (course_id, activity_id)
);
create index idx_completion_criteria_course on completion_criteria(course_id);

create table course_completion_setting (
    course_id   bigint primary key references course(id) on delete cascade,
    aggregation text not null check (aggregation = any (array['all','any'])),
    updated_at  timestamptz not null default now()
);

-- Also drift: a second index on permission_decision, duplicating M11's
-- idx_pdec_actor on the same columns (this one ASC, M11's DESC).
create index idx_decision_actor on permission_decision(actor_id, decided_at);

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
--
-- M03 (D-VIEW) rewrote this. The original computed its numerator and
-- denominator over DIFFERENT sets — the denominator filtered on
-- completion_enabled AND deleted_at IS NULL, the numerator counted any
-- completion row for the course with no filter at all. A completion on a
-- hidden or untracked activity therefore pushed the numerator past the
-- denominator: a real fixture scored 300% and reported "complete". There was
-- also no clamp, complete_fail counted as progress, and no enrolment gate.
--
-- Moodle computes both sides over one tracked set and gates on
-- is_tracked_user (completionlib.php).
create or replace view v_course_progress as
with tracked as (
    -- The tracked set, defined exactly once and used by both sides.
    select a.id as activity_id, a.course_id
    from course_activity a
    where a.completion_enabled
      and a.visible
      and a.deleted_at is null
),
tracked_total as (
    -- Denominator computed once per course, not as a per-row correlated
    -- subquery re-executed for every completion row.
    select course_id, count(*) as activities_total
    from tracked
    group by course_id
)
select
    cc.user_id,
    cc.course_id,
    c.short_name,
    (c.deleted_at is not null)                                as course_deleted,
    cc.time_completed,

    count(ac.id) filter (
        where ac.state in ('complete', 'complete_pass')       -- complete_fail excluded
    )                                                         as activities_done,

    coalesce(tt.activities_total, 0)                          as activities_total,

    -- NULL when nothing is tracked: no denominator, so no honest percentage.
    case
        when coalesce(tt.activities_total, 0) = 0 then null
        else least(
                 100,
                 round(100.0 * count(ac.id) filter (
                     where ac.state in ('complete', 'complete_pass')
                 ) / tt.activities_total)
             )::int
    end                                                       as percent,

    -- Never derived from a >100 artifact.
    (
        cc.time_completed is not null
        or (
            coalesce(tt.activities_total, 0) > 0
            and count(ac.id) filter (
                    where ac.state in ('complete', 'complete_pass')
                ) = tt.activities_total
        )
    )                                                         as is_complete,

    -- T2-PRG-005 gate. A boolean rather than an inner join, so admin and
    -- historical reports still see retained rows: completion survives
    -- unenrolment (see course_completion above) and resurfaces on re-enrol.
    coalesce(p.enrolled, false)                               as enrolled

from course_completion cc
join course c                 on c.id = cc.course_id
left join tracked_total tt    on tt.course_id = cc.course_id
left join tracked t           on t.course_id = cc.course_id
left join activity_completion ac
       on ac.activity_id = t.activity_id
      and ac.user_id     = cc.user_id
left join v_course_participant p
       on p.user_id   = cc.user_id
      and p.course_id = cc.course_id
group by
    cc.user_id, cc.course_id, c.short_name, c.deleted_at, cc.time_completed,
    tt.activities_total, p.enrolled;

-- ===========================================================================
-- fn_can — REMOVED by M12 (D-FNCAN).
--
-- This was a complete in-SQL implementation of Moodle's resolution rules
-- (deepest-wins per role, sticky prohibit, cross-role combination) and NOTHING
-- CALLED IT. permissions.py re-implements the same rules in Python and the
-- groups path added a third variant — the "three-resolver problem". Three
-- implementations of one rule set is not redundancy, it is guaranteed
-- divergence: a fix lands in one and the other two silently disagree.
--
-- The Python resolver is canonical (it is the one under test). The function
-- body is preserved in migrations/M01__baseline__schema.sql and in git history
-- if it is ever wanted back.
-- ===========================================================================

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
-- Tables added by migrations. permission_decision was created at runtime with
-- RLS OFF until M11 — it records who was denied what, and was the one table
-- readable outside the service-role path.
alter table permission_decision          enable row level security;  -- M11
alter table course_completion_criteria   enable row level security;  -- M04
alter table course_completion_aggr_methd enable row level security;  -- M04
alter table course_completion_crit_compl enable row level security;  -- M04
alter table activity_availability        enable row level security;  -- M06
alter table completion_criteria          enable row level security;  -- drift, see above
alter table course_completion_setting    enable row level security;  -- drift, see above
