-- Auth credentials for self-registered accounts (Moodle email-confirm parity).
-- Demo personas have NO row → any password signs them in (demo affordance).
create table if not exists app_credential (
    user_id       bigint primary key references app_user(id) on delete cascade,
    password_hash text not null,
    confirmed     boolean not null default false,
    created_at    timestamptz not null default now()
);
alter table app_credential enable row level security;
