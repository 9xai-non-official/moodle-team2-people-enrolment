"""People + the demo sign-in.

Sign-in is deliberately password-less (the same affordance WhoCan's demo
personas use): identity picks the ROLE, and the role shapes the portal —
student / teacher from person.kind, plus the special 'admin' registrar
account. Real credentials are out of POC scope (contract §10)."""
from fastapi import APIRouter, HTTPException

from app import db
from app.models import LoginIn, PersonIn

router = APIRouter(prefix="/api", tags=["people"])

_PERSON_COLS = ("sis_id, first, last, email, kind, national_id, gender, "
                "nationality, birth_date, city, phone, hs_avg")


@router.post("/login")
def login(body: LoginIn):
    """Resolve an SIS id to a session identity: {role, name, person?}."""
    sid = body.sis_id.strip()
    if sid.lower() == "admin":
        return {"role": "admin", "name": "Registrar",
                "person": {"sis_id": "admin", "first": "The", "last": "Registrar"}}
    rows = db.query(f"select {_PERSON_COLS} from person where sis_id=?", (sid,))
    if not rows:
        raise HTTPException(404, f"unknown SIS id {sid}")
    p = rows[0]
    role = "teacher" if p["kind"] == "teacher" else "student"
    return {"role": role, "name": f"{p['first']} {p['last']}", "person": p}


@router.post("/people")
def upsert_person(p: PersonIn):
    db.execute(
        """insert into person(sis_id, first, last, email, kind, national_id,
                              gender, nationality, birth_date, city, phone, hs_avg)
           values(?,?,?,?,?,?,?,?,?,?,?,?)
           on conflict(sis_id) do update set
             first=excluded.first, last=excluded.last, email=excluded.email,
             kind=excluded.kind, national_id=excluded.national_id,
             gender=excluded.gender, nationality=excluded.nationality,
             birth_date=excluded.birth_date, city=excluded.city,
             phone=excluded.phone, hs_avg=excluded.hs_avg""",
        (p.sis_id, p.first, p.last, p.email, p.kind, p.national_id,
         p.gender, p.nationality, p.birth_date, p.city, p.phone, p.hs_avg),
    )
    return db.query(f"select {_PERSON_COLS} from person where sis_id=?", (p.sis_id,))[0]


@router.get("/people")
def list_people():
    return db.query(f"select {_PERSON_COLS} from person order by kind, last, first")


@router.get("/people/{sis_id}")
def get_person(sis_id: str):
    rows = db.query(f"select {_PERSON_COLS} from person where sis_id=?", (sis_id,))
    if not rows:
        raise HTTPException(404, f"unknown person {sis_id}")
    return rows[0]
