"""Courses + المواد المطروحة (the offerings catalog).

An offering row is a course enriched with everything the e-registration
screen needs: the assigned instructor (the active role=teacher registration
for the current term), live seat usage vs capacity, the open/closed verdict,
and — when ?person= is passed — that person's own status on the course."""
from fastapi import APIRouter

from app import db
from app.models import CourseIn

router = APIRouter(prefix="/api", tags=["courses"])

_COURSE_COLS = "sis_id, code, title, credits, days, time_slot, room, capacity"


@router.post("/courses")
def upsert_course(c: CourseIn):
    db.execute(
        """insert into course(sis_id, code, title, credits, days, time_slot, room, capacity)
           values(?,?,?,?,?,?,?,?)
           on conflict(sis_id) do update set
             code=excluded.code, title=excluded.title, credits=excluded.credits,
             days=excluded.days, time_slot=excluded.time_slot,
             room=excluded.room, capacity=excluded.capacity""",
        (c.sis_id, c.code, c.title, c.credits, c.days, c.time_slot, c.room, c.capacity),
    )
    return db.query(f"select {_COURSE_COLS} from course where sis_id=?", (c.sis_id,))[0]


@router.get("/courses")
def list_courses():
    return db.query(f"select {_COURSE_COLS} from course order by code")


@router.get("/offerings")
def offerings(person: str | None = None):
    """المواد المطروحة for the current term. Each row carries instructor,
    seats/capacity, open|closed, and (optionally) the caller's own status."""
    cur = db.query("select code from term where is_current=1 limit 1")
    term = cur[0]["code"] if cur else None
    rows = db.query(
        f"""select c.{', c.'.join(_COURSE_COLS.split(', '))},
              (select count(*) from registration r
                where r.course_sis_id=c.sis_id and r.term_code=?
                  and r.role='student' and r.status='active') as seats,
              (select p.first || ' ' || p.last
                 from registration r join person p on p.sis_id=r.person_sis_id
                where r.course_sis_id=c.sis_id and r.term_code=?
                  and r.role='teacher' and r.status='active'
                order by r.updated_at limit 1) as instructor
            from course c order by c.code""",
        (term, term))
    my = {}
    if person and term:
        my = {r["course_sis_id"]: r["status"] for r in db.query(
            "select course_sis_id, status from registration "
            "where person_sis_id=? and term_code=?", (person, term))}
    for r in rows:
        r["term_code"] = term
        r["closed"] = r["seats"] >= r["capacity"]
        r["my_status"] = my.get(r["sis_id"])
    return rows
