-- Dependency: D-PDEC  Issue: T2-DATA-001 / RBAC-060  Reviewed-by: Khaled
-- M11 — formalize the 21st table.
--
-- permission_decision is created lazily at RUNTIME by permissions.py:390-401
-- (`create table if not exists`) and is absent from schema.sql. The live
-- Supabase database therefore has 21 base tables where the schema documents
-- 20 — confirmed by introspection, not inferred. That is schema drift: the
-- table is unreviewed, unversioned, and invisible to anyone reading the file.
--
-- Column shape below is taken from the LIVE table, not from the doc, and
-- differs from the audit's prose in one place: the third actor column is
-- `target_id`, not `affected_id`. Introspection is the source of truth.
--
-- Two live defects this migration also closes:
--   * RLS is OFF. Every other table in the schema is locked shut
--     (schema.sql:538-557) precisely so PostgREST/anon cannot read it. This
--     one records who was denied what and why — arguably the most sensitive
--     table in the system — and it is currently readable outside the
--     service-role path. Enabling RLS is the point of this migration.
--   * Only the primary key is indexed, so the Decision Log query
--     (permissions.py:921-953) is a sequential scan.
--
-- Kept deliberately distinct from audit_log: this logs permission CHECKS
-- (including denials, which mutate nothing), audit_log logs MUTATIONS.
-- Collapsing them would make "who was denied" and "what changed" the same
-- stream, and they have different retention and different readers.

create table if not exists permission_decision (
    id         bigint generated always as identity primary key,
    actor_id   bigint,
    capability varchar(255),
    context_id bigint,
    target_id  bigint,
    allowed    boolean     not null,
    reasons    jsonb       not null default '{}'::jsonb,
    decided_at timestamptz not null default now()
);

-- Decision Log reads (permissions.py:921-953).
create index if not exists idx_pdec_actor
    on permission_decision(actor_id, decided_at desc);
create index if not exists idx_pdec_target
    on permission_decision(target_id, decided_at desc);
create index if not exists idx_pdec_capability
    on permission_decision(capability, decided_at desc);

alter table permission_decision enable row level security;

insert into schema_migrations(version) values ('M11') on conflict do nothing;
