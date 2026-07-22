-- Dependency: D-IMMUT  Issue: T2-PRG-002  Reviewed-by: Mahdi
-- M13 — course_completion.time_completed is write-once.
--
-- This is DEFENCE IN DEPTH, not the primary fix. The primary fix is Mahdi's,
-- in progress.py:112-139, where a second POST currently rewrites
-- time_completed to a fresh now() and a plain DELETE silently un-completes.
-- Both rewrite history with no authorization and no audit trail.
--
-- The trigger makes the illegal state unreachable from any client, including
-- a future one nobody has written yet. Setting the value for the first time
-- (NULL -> timestamp) is allowed; changing it afterwards raises. Clearing it
-- is also a change, so un-completion must become an explicit, authorized,
-- audited reset in Mahdi's code rather than an UPDATE or DELETE.
--
-- Deliberately a BEFORE UPDATE trigger on the row, not a CHECK: a CHECK cannot
-- see the old value.

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

drop trigger if exists completion_time_immutable on course_completion;
create trigger completion_time_immutable
    before update on course_completion
    for each row execute function trg_completion_immutable();

insert into schema_migrations(version) values ('M13') on conflict do nothing;
