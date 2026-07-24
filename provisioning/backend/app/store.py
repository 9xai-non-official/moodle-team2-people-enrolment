"""Provisioning store — the (course, term) → Teams/M365-group map + audit log.

The map is what makes provisioning idempotent: a replayed enrol finds the
existing team instead of creating "CS101 — FALL2026 (2)". Never match teams by
display name — names aren't unique in Graph.
"""
import os
import sqlite3

SCHEMA = """
create table if not exists team_map (
  course_sis_id text not null,
  term_code     text not null,
  group_id      text not null,     -- the M365 group / team id in Entra
  display_name  text,
  created_at    text default (datetime('now')),
  primary key (course_sis_id, term_code)
);

create table if not exists prov_log (
  id     integer primary key autoincrement,
  ts     text default (datetime('now')),
  action text,     -- enrol | drop
  mode   text,     -- dry | live
  status text,     -- ok | error | would
  detail text
);
"""


def _path() -> str:
    return os.getenv("PROV_DB_PATH", "provision.db")


def connect():
    conn = sqlite3.connect(_path())
    conn.row_factory = sqlite3.Row
    conn.execute("pragma busy_timeout=2000")
    return conn


def init_db():
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


def get_team(course_sis_id: str, term_code: str) -> dict | None:
    conn = connect()
    try:
        row = conn.execute(
            "select * from team_map where course_sis_id=? and term_code=?",
            (course_sis_id, term_code)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def save_team(course_sis_id: str, term_code: str, group_id: str, name: str):
    conn = connect()
    try:
        conn.execute(
            "insert into team_map(course_sis_id, term_code, group_id, display_name) "
            "values(?,?,?,?) on conflict(course_sis_id, term_code) do update set "
            "group_id=excluded.group_id, display_name=excluded.display_name",
            (course_sis_id, term_code, group_id, name))
        conn.commit()
    finally:
        conn.close()


def list_teams() -> list[dict]:
    conn = connect()
    try:
        return [dict(r) for r in conn.execute(
            "select * from team_map order by created_at desc").fetchall()]
    finally:
        conn.close()


def log(action: str, mode: str, status: str, detail: str):
    conn = connect()
    try:
        conn.execute(
            "insert into prov_log(action, mode, status, detail) values(?,?,?,?)",
            (action, mode, status, detail[:500]))
        conn.commit()
    finally:
        conn.close()


def logs(limit: int = 100) -> list[dict]:
    conn = connect()
    try:
        return [dict(r) for r in conn.execute(
            "select * from prov_log order by id desc limit ?", (limit,)).fetchall()]
    finally:
        conn.close()
