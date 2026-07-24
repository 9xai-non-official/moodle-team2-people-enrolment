"""SIS storage — plain SQLite, isolated from WhoCan's Postgres.

A POC store with production-shaped semantics. One file (sis.db by default),
created on boot. Everything the SIS owns (people, courses, terms,
registrations) lives here — this is the *source of truth*; WhoCan is
downstream (see docs/SIS-WHOCAN-SYNC-CONTRACT.md).

The `outbox` table is the delivery backbone: every mutation that must reach an
external system (WhoCan today, Issa's /provision later) is recorded here in
the SAME transaction as the mutation itself, then delivered asynchronously by
the drain worker (app/outbox.py). That is the transactional-outbox pattern:
the registration and its outbound event can never disagree, and WhoCan being
down never loses an event — it just retries.
"""
import os
import sqlite3


def _path() -> str:
    # Read per-call, not at import: tests point SIS_DB_PATH at a temp file
    # after importing the module.
    return os.getenv("SIS_DB_PATH", "sis.db")


SCHEMA = """
create table if not exists term (
  code       text primary key,
  name       text not null,
  starts_at  text,
  ends_at    text,
  is_current integer not null default 0
);

create table if not exists person (
  sis_id      text primary key,
  first       text not null,
  last        text not null,
  email       text not null,
  kind        text not null default 'student',  -- student | teacher | staff
  national_id text,
  gender      text,
  nationality text,
  birth_date  text,
  city        text,
  phone       text,
  hs_avg      real,                             -- high-school average (معدل الثانوية)
  created_at  text default (datetime('now'))
);

create table if not exists course (
  sis_id     text primary key,
  code       text not null,
  title      text not null,
  credits    integer not null default 3,
  days       text,                              -- e.g. 'ح ث خ' or 'ن ر'
  time_slot  text,                              -- e.g. '10:00 - 11:30'
  room       text,
  capacity   integer not null default 30,
  created_at text default (datetime('now'))
);

create table if not exists registration (
  id            integer primary key autoincrement,
  person_sis_id text not null references person(sis_id),
  course_sis_id text not null references course(sis_id),
  term_code     text not null references term(code),
  role          text not null default 'student',  -- student | teacher
  status        text not null default 'active',   -- active | dropped
  created_at    text default (datetime('now')),
  updated_at    text default (datetime('now')),
  unique(person_sis_id, course_sis_id, term_code)
);

-- Transactional outbox: one row per outbound event, written atomically with
-- the mutation that caused it. status: pending -> sent | failed | skipped.
create table if not exists outbox (
  id              integer primary key autoincrement,
  target          text not null default 'whocan',   -- whocan | provision
  event           text not null,                    -- the JSON payload
  status          text not null default 'pending',
  attempts        integer not null default 0,
  last_error      text,
  next_attempt_at text not null default (datetime('now')),
  created_at      text not null default (datetime('now')),
  sent_at         text
);
create index if not exists outbox_due
  on outbox (status, next_attempt_at) where status = 'pending';

-- Append-only audit of every delivery attempt (the outbox row keeps only the
-- latest state; this keeps the history).
create table if not exists sync_log (
  id     integer primary key autoincrement,
  ts     text default (datetime('now')),
  action text,    -- enrol | drop | account
  target text,    -- whocan | provision
  mode   text,    -- dry | live | off
  status text,    -- would-send | ok | error | skipped
  detail text
);
"""


def connect():
    conn = sqlite3.connect(_path())
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys=on")
    conn.execute("pragma busy_timeout=2000")   # worker + request writers coexist
    return conn


def _ensure_column(conn, table: str, col: str, ddl: str):
    """Idempotent column add — lets an existing sis.db pick up new fields
    without a migration framework (POC-grade schema evolution)."""
    have = {r[1] for r in conn.execute(f"pragma table_info({table})")}
    if col not in have:
        conn.execute(f"alter table {table} add column {ddl}")


def init_db():
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        # evolve pre-existing databases created before these fields existed
        for col, ddl in [("national_id", "national_id text"), ("gender", "gender text"),
                         ("nationality", "nationality text"), ("birth_date", "birth_date text"),
                         ("city", "city text"), ("phone", "phone text"),
                         ("hs_avg", "hs_avg real")]:
            _ensure_column(conn, "person", col, ddl)
        for col, ddl in [("credits", "credits integer not null default 3"),
                         ("days", "days text"), ("time_slot", "time_slot text"),
                         ("room", "room text"),
                         ("capacity", "capacity integer not null default 30")]:
            _ensure_column(conn, "course", col, ddl)
        conn.commit()
    finally:
        conn.close()


def query(sql, params=()):
    conn = connect()
    try:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()


def execute(sql, params=()):
    conn = connect()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()
