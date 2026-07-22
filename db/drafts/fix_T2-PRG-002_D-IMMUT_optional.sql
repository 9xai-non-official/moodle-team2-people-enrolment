-- D-IMMUT (T2-PRG-002, optional) — write-once on course_completion.time_completed.
-- Blocks REWRITING a set completion to a different non-null value; allows the
-- first set and an audited reset to NULL. Defense-in-depth (app enforces too).
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

drop trigger if exists completion_write_once on course_completion;
create trigger completion_write_once
  before update on course_completion
  for each row execute function trg_completion_write_once();
