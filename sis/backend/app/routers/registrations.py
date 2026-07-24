"""The heart of the SIS: register / assign / drop → outbox → WhoCan.

`register` and `assign` are the same operation with a different actor story —
students register themselves (bottom-up), teachers are assigned by the
registrar/dean (top-down) — so `assign` simply forces role=teacher. Both
upsert the registration keyed by (person, course, term) and enqueue the
contract event in the outbox; the drain worker delivers it. `drop` enqueues
the removal. Everything is replay-safe end to end.

/reconcile replays the FULL desired state for the current term — the safety
net that heals drift and drives the account gate (contract §4, §6).
"""
from fastapi import APIRouter, HTTPException

from app import db, outbox, provision, whocan
from app.models import RegisterIn

router = APIRouter(prefix="/api", tags=["registrations"])


def _current_term() -> dict | None:
    rows = db.query("select * from term where is_current=1 limit 1")
    return rows[0] if rows else None


def _term(code: str | None) -> dict:
    if code:
        rows = db.query("select * from term where code=?", (code,))
        if not rows:
            raise HTTPException(404, f"unknown term {code}")
        return rows[0]
    row = _current_term()
    if not row:
        raise HTTPException(400, "no term_code given and no current term set")
    return row


def _apply(reg: RegisterIn, kind: str):
    term = _term(reg.term_code)

    person = db.query("select * from person where sis_id=?", (reg.person_sis_id,))
    course = db.query("select * from course where sis_id=?", (reg.course_sis_id,))
    if not person:
        raise HTTPException(404, f"unknown person {reg.person_sis_id}")
    if not course:
        raise HTTPException(404, f"unknown course {reg.course_sis_id}")
    person, course = person[0], course[0]

    status = "active" if kind == "enrol" else "dropped"
    db.execute(
        """insert into registration(person_sis_id, course_sis_id, term_code, role, status)
           values(?,?,?,?,?)
           on conflict(person_sis_id, course_sis_id, term_code) do update set
             role=excluded.role, status=excluded.status, updated_at=datetime('now')""",
        (reg.person_sis_id, reg.course_sis_id, term["code"], reg.role, status),
    )

    event = whocan.build_event(kind, person, course, term, reg.role)
    outbox_id = outbox.enqueue(event)
    queued = {"id": outbox_id, "status": "pending", "mode": whocan.cfg()["mode"]}
    # Fan out to Microsoft provisioning (Teams/Outlook — contract §9c) with the
    # SAME event. Enqueued only when the target is enabled, so a fresh install
    # stays quiet; enabling later + /api/reconcile backfills the full state.
    if provision.cfg()["mode"] != "off":
        queued["provision_id"] = outbox.enqueue(event, target="provision")
    return {
        "registration": {
            "person_sis_id": reg.person_sis_id,
            "course_sis_id": reg.course_sis_id,
            "term_code": term["code"],
            "role": reg.role,
            "status": status,
        },
        "event": event,
        "outbox": queued,
    }


@router.post("/register")
def register(reg: RegisterIn):
    """A student registers into a course for a term → enrol event queued."""
    return _apply(reg, "enrol")


@router.post("/assign")
def assign(reg: RegisterIn):
    """The registrar assigns a teacher to a course (top-down; role forced)."""
    reg.role = "teacher"
    return _apply(reg, "enrol")


@router.post("/drop")
def drop(reg: RegisterIn):
    """Drop a registration → removal event queued."""
    return _apply(reg, "drop")


@router.get("/registrations")
def list_registrations():
    return db.query(
        """select r.id, r.role, r.status, r.term_code, r.updated_at,
                  p.sis_id as person_sis_id, p.first, p.last, p.kind,
                  c.sis_id as course_sis_id, c.code as course_code, c.title
           from registration r
           join person p on p.sis_id = r.person_sis_id
           join course c on c.sis_id = r.course_sis_id
           order by r.updated_at desc"""
    )


@router.post("/reconcile")
def reconcile():
    """Replay the full desired state for the CURRENT term (contract §4):
      * every active registration  → enrol event
      * every dropped registration → drop event
      * every person              → account event (the login gate, §6):
        active iff they hold ≥1 active registration this term.
    The receiver is idempotent, so replaying converges instead of duplicating."""
    term = _current_term()
    if not term:
        raise HTTPException(400, "no current term set")

    enrols = drops = 0
    regs = db.query(
        """select r.*, p.first, p.last, p.email, p.sis_id as p_sis,
                  c.code, c.title, c.sis_id as c_sis
             from registration r
             join person p on p.sis_id = r.person_sis_id
             join course c on c.sis_id = r.course_sis_id
            where r.term_code = ?""", (term["code"],))
    provisioning = provision.cfg()["mode"] != "off"
    for r in regs:
        person = {"sis_id": r["p_sis"], "first": r["first"],
                  "last": r["last"], "email": r["email"]}
        course = {"sis_id": r["c_sis"], "code": r["code"], "title": r["title"]}
        kind = "enrol" if r["status"] == "active" else "drop"
        event = whocan.build_event(kind, person, course, term, r["role"])
        outbox.enqueue(event)
        if provisioning:            # Teams/Outlook mirror the same desired state
            outbox.enqueue(event, target="provision")
        enrols += kind == "enrol"
        drops += kind == "drop"

    accounts = 0
    for p in db.query("select * from person"):
        active = bool(db.query(
            """select 1 from registration
                where person_sis_id=? and term_code=? and status='active' limit 1""",
            (p["sis_id"], term["code"])))
        outbox.enqueue(whocan.build_account_event(p, term, active))
        accounts += 1

    return {"term": term["code"], "queued":
            {"enrol": enrols, "drop": drops, "account": accounts}}


# ---- outbox operations ------------------------------------------------------

@router.get("/outbox")
def outbox_list(status: str | None = None, limit: int = 50):
    where, params = "", []
    if status:
        where, params = "where status=?", [status]
    rows = db.query(
        f"select * from outbox {where} order by id desc limit ?",
        (*params, limit))
    return {"counts": outbox.counts(), "rows": rows}


@router.post("/outbox/drain")
def outbox_drain():
    """Deliver everything due right now — the demo/ops override of the worker's
    cadence."""
    return outbox.drain_once()


@router.get("/sync-log")
def sync_log():
    return db.query("select * from sync_log order by id desc limit 100")
