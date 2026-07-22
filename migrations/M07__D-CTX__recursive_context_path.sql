-- Dependency: D-CTX  Issue: T2-RBAC-005  Reviewed-by: Khaled
-- M07 — recompute descendant context paths on reparent.
--
-- The baseline trigger (schema.sql:122-137) recomputes only the row being
-- moved. Every descendant keeps a stale path/depth, so capability inheritance
-- silently resolves against the old tree. Moodle repairs this with a cron job
-- (build_context_path); our claimed superiority is "derived, cannot drift", so
-- it has to be correct at write time.
--
-- Latent today (no reparent endpoint exists), which is precisely why it is
-- cheap to fix now.
--
-- The BEFORE trigger stays as-is for the insert / moved-node case. This AFTER
-- trigger fires only when the path actually changed, and rewrites descendants
-- by prefix substitution. Updating path/depth does NOT re-fire the BEFORE
-- trigger (it is `update of parent_id`), so there is no recursion.
-- idx_context_path (text_pattern_ops, schema.sql:120) serves the LIKE.

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

drop trigger if exists context_path_descendants on context;
create trigger context_path_descendants
    after update of parent_id on context
    for each row execute function trg_context_path_descendants();

insert into schema_migrations(version) values ('M07') on conflict do nothing;
