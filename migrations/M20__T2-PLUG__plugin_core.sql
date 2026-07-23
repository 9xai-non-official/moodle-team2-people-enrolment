-- Dependency: M02  Issue: T2-PLUG-001  Reviewed-by: Essa (DDL owner)
-- M20 — plugin framework core: registry, plugin-owned migration ledger, and
-- the transactional event outbox.
--
-- The plugin system is Moodle's model adapted to this stack: plugin CODE ships
-- in the repo (app/plugins/<name>/), while its lifecycle lives in the DB —
-- install/upgrade recorded here, enable/disable and settings editable at
-- runtime. Plugin-owned DDL is applied by the CLI only
-- (`python -m app.plugin_cli install <name>`, single-DDL-writer rule) and
-- ledgered in plugin_migration, NOT schema_migrations: apply.py's M\d+__
-- filename contract stays intact and its orphan check stays quiet.
--
-- plugin_event is a transactional outbox: domain code emits events INSIDE the
-- mutating transaction (so an event exists iff its mutation committed), and
-- dispatchers deliver them to enabled plugins' handlers afterwards with
-- retry/backoff. Deliberately NOT derived from audit_log: course.created audit
-- is written post-commit best-effort (admin.py _audit_safe) and the
-- parity-fixes DB triggers double-write audit rows on live Supabase.
--
-- Idempotent: create table/index if not exists; capability + grant use
-- on conflict do nothing (M19 pattern).

create table if not exists plugin (
    name         text primary key,
    version      text not null,
    enabled      boolean not null default false,
    settings     jsonb not null default '{}'::jsonb,
    installed_at timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table if not exists plugin_migration (
    plugin     text not null references plugin(name) on delete cascade,
    filename   text not null,
    applied_at timestamptz not null default now(),
    primary key (plugin, filename)
);

create table if not exists plugin_event (
    id              bigint generated always as identity primary key,
    event           varchar(100) not null,
    payload         jsonb not null default '{}'::jsonb,
    status          varchar(20) not null default 'pending'
                    check (status in ('pending','done','dead')),
    attempts        int not null default 0,
    last_error      text,
    next_attempt_at timestamptz not null default now(),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- The dispatcher's only query shape: pending rows due now, oldest first.
create index if not exists ix_plugin_event_pending
    on plugin_event (next_attempt_at) where status = 'pending';

-- Team rule: RLS enabled on every table, no policies — the app connects as
-- table owner (same posture as every table in schema.sql).
alter table plugin           enable row level security;
alter table plugin_migration enable row level security;
alter table plugin_event     enable row level security;

-- Gate for the plugin admin surface (install/enable/settings/dispatch).
insert into capability (name, cap_type, min_context_level, component, risks)
values ('plugin:manage', 'write', 'system', 'core', '{config}')
on conflict (name) do nothing;

insert into role_capability (role_id, context_id, capability, permission)
select r.id, c.id, 'plugin:manage', 'allow'
  from role r, context c
 where r.short_name = 'manager' and c.level = 'system'
on conflict (role_id, context_id, capability) do nothing;

insert into schema_migrations(version) values ('M20') on conflict do nothing;
