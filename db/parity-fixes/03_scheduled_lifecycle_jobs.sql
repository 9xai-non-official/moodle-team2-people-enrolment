-- ============================================================================
-- Scheduled lifecycle jobs (pg_cron) — the background processing Moodle has
-- only via a fragile external cron. Solves ENR-017/018/021/032/033, EVT-009,
-- PRG-023. These flip STORED state (not on-read), and every flip is captured
-- by the universal audit trigger automatically.
-- ============================================================================
create extension if not exists pg_cron;

-- Expiry demotion (Moodle expiredaction=SUSPEND, stored): an active enrolment
-- whose window has closed becomes 'suspended'. The audit trigger logs each as
-- enrolment.updated. Runs nightly 02:00 UTC.
create or replace function job_expire_enrolments() returns int
language sql as $$
  with demoted as (
    update enrolment set status = 'suspended', updated_at = now()
     where status = 'active'
       and time_end is not null and time_end <= now()
    returning id)
  select count(*)::int from demoted;
$$;

-- longtimenosee (ENR-021): self-enrolled users idle beyond a threshold are
-- suspended. 90-day default (Moodle's enrol_self longtimenosee is configurable;
-- we pick a sane fixed default — tune per method later).
create or replace function job_longtimenosee(p_days int default 90) returns int
language sql as $$
  with idle as (
    update enrolment e set status = 'suspended', updated_at = now()
      from enrolment_method m, user_last_access la
     where e.method_id = m.id and m.method = 'self'
       and e.status = 'active'
       and la.user_id = e.user_id and la.course_id = m.course_id
       and la.accessed_at < now() - make_interval(days => p_days)
    returning e.id)
  select count(*)::int from idle;
$$;

select cron.schedule('expire-enrolments', '0 2 * * *', $$select job_expire_enrolments()$$);
select cron.schedule('longtimenosee',     '30 2 * * *', $$select job_longtimenosee()$$);
