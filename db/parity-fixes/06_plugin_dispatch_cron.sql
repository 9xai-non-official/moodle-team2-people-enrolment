-- Parity-fix 06 — plugin outbox sweep (T2-PLUG-001).
-- Applied BY HAND to the live Supabase project (like every parity-fix):
-- pg_cron + pg_net call the backend's dispatch endpoint every minute, the
-- correctness guarantee behind the best-effort post-response middleware
-- (Vercel functions can't run their own scheduler; hobby-plan Vercel cron is
-- daily-only).
--
-- Before running, substitute:
--   <BACKEND_URL>            the deployed backend origin (https://....vercel.app)
--   <PLUGIN_DISPATCH_TOKEN>  the value set in Vercel env for the backend
--
-- Idempotent: cron.schedule upserts by job name.

select cron.schedule(
    'plugin-dispatch',
    '* * * * *',
    $$
    select net.http_post(
        url     := '<BACKEND_URL>/api/plugins/dispatch',
        headers := jsonb_build_object(
                       'X-Dispatch-Token', '<PLUGIN_DISPATCH_TOKEN>',
                       'Content-Type', 'application/json'),
        body    := '{}'::jsonb
    );
    $$
);

-- Rollback: select cron.unschedule('plugin-dispatch');
