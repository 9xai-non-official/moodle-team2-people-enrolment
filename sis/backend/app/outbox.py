"""The transactional outbox — enqueue, drain, retry.

Delivery policy in one place:

  mode 'off'  → rows drain to status 'skipped' (recorded, never sent)
  mode 'dry'  → rows drain to status 'sent' with a would-send audit line;
                nothing leaves the process (the safe default)
  mode 'live' → rows POST to WhoCan; success → 'sent', failure → retry with
                exponential backoff (5s·2^attempts, capped 5 min); after
                MAX_ATTEMPTS the row parks as 'failed' for operator attention.

Because the receiving end (/api/sis/events) is idempotent, delivery is
at-least-once by design: a crash between POST and status update just means one
harmless replay.
"""
import asyncio
import json
import logging
import os
import threading

from app import db, provision, whocan

log = logging.getLogger("sis.outbox")

MAX_ATTEMPTS = 8

# The background worker and the /outbox/drain endpoint both call drain_once in
# the SAME process; without this they can each read a row as 'pending' before
# either marks it done and deliver it twice. Delivery is idempotent downstream,
# but not double-firing in the first place is the solid version. (One process,
# so an in-process lock is sufficient; a multi-process deploy would claim rows
# in SQL instead.)
_drain_lock = threading.Lock()

# Per-target delivery: mode() gates it, deliver() ships one event. Adding a
# target (e.g. a future notification fan-out) is one line here plus its module.
TARGETS = {
    "whocan": {"mode": lambda: whocan.cfg()["mode"],
               "deliver": whocan.deliver,
               "endpoint": lambda: whocan.cfg()["url"] + "/api/sis/events"},
    "provision": {"mode": lambda: provision.cfg()["mode"],
                  "deliver": provision.deliver,
                  "endpoint": lambda: provision.cfg()["url"] + "/provision"},
}


def enqueue(event: dict, target: str = "whocan") -> int:
    """Record an outbound event. Callers do this in the same logical step as
    the mutation that caused it; SQLite's per-connection commit keeps the POC
    close enough to atomic (single writer, same file)."""
    return db.execute(
        "insert into outbox (target, event) values (?, ?)",
        (target, json.dumps(event)))


def _backoff_expr(attempts: int) -> str:
    # 5s, 10s, 20s ... capped at 300s. Rendered as an SQLite datetime modifier.
    return f"+{min(300, 5 * (2 ** attempts))} seconds"


def _log(event: dict, target: str, mode: str, status: str, detail: str):
    who = event.get("person", {}).get("sis_id", "?")
    course = (event.get("course") or {}).get("sis_id", "-")
    db.execute(
        "insert into sync_log(action, target, mode, status, detail) values(?,?,?,?,?)",
        (event.get("type"), target, mode, status, f"{who} → {course}: {detail}"))


def drain_once(limit: int = 100) -> dict:
    """Process every due pending row once, dispatching by target. Returns
    counters. Synchronous — callable from the worker loop, the drain endpoint,
    and tests alike. Serialised so concurrent callers don't double-deliver."""
    with _drain_lock:
        return _drain_once_locked(limit)


def _drain_once_locked(limit: int) -> dict:
    rows = db.query(
        "select * from outbox where status='pending' "
        "and next_attempt_at <= datetime('now') order by id limit ?", (limit,))
    out = {"processed": 0, "sent": 0, "failed": 0, "skipped": 0, "retrying": 0,
           "modes": {name: t["mode"]() for name, t in TARGETS.items()}}

    for row in rows:
        out["processed"] += 1
        event = json.loads(row["event"])
        target = TARGETS.get(row["target"])
        if target is None:                      # unknown target — park loudly
            db.execute("update outbox set status='failed', "
                       "last_error='unknown target' where id=?", (row["id"],))
            _log(event, row["target"], "-", "error", "unknown target")
            out["failed"] += 1
            continue
        mode = target["mode"]()

        if mode == "off":
            db.execute("update outbox set status='skipped', sent_at=datetime('now') "
                       "where id=?", (row["id"],))
            _log(event, row["target"], mode, "skipped", "sync disabled")
            out["skipped"] += 1
            continue

        if mode == "dry":
            db.execute("update outbox set status='sent', sent_at=datetime('now') "
                       "where id=?", (row["id"],))
            _log(event, row["target"], mode, "would-send", target["endpoint"]())
            out["sent"] += 1
            continue

        ok, detail = target["deliver"](event)
        if ok:
            db.execute("update outbox set status='sent', sent_at=datetime('now'), "
                       "last_error=null where id=?", (row["id"],))
            _log(event, row["target"], mode, "ok", detail)
            out["sent"] += 1
        else:
            attempts = row["attempts"] + 1
            parked = attempts >= MAX_ATTEMPTS
            db.execute(
                "update outbox set attempts=?, last_error=?, "
                "status=case when ? then 'failed' else 'pending' end, "
                f"next_attempt_at=datetime('now', '{_backoff_expr(attempts)}') "
                "where id=?",
                (attempts, detail[:500], parked, row["id"]))
            _log(event, row["target"], mode, "error", f"attempt {attempts}: {detail}")
            out["failed" if parked else "retrying"] += 1
            if parked:
                log.error("outbox row %s parked as failed after %s attempts: %s",
                          row["id"], attempts, detail)
    return out


def counts() -> dict:
    rows = db.query("select status, count(*) as n from outbox group by status")
    return {r["status"]: r["n"] for r in rows}


async def worker(interval: float):
    """Background drain loop, started from main.py's lifespan. Runs
    drain_once in a thread so the HTTP delivery never blocks the event loop."""
    log.info("outbox worker started (every %ss, mode=%s)",
             interval, whocan.cfg()["mode"])
    while True:
        try:
            await asyncio.to_thread(drain_once)
        except Exception:  # noqa: BLE001 — the worker must survive anything
            log.exception("outbox drain tick failed")
        await asyncio.sleep(interval)


def worker_interval() -> float:
    """0 (or negative) disables the worker — used by tests."""
    try:
        return float(os.getenv("OUTBOX_INTERVAL_SECONDS", "3"))
    except ValueError:
        return 3.0
