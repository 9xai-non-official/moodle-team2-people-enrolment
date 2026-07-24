from fastapi import APIRouter

from app import db
from app.models import PersonIn

router = APIRouter(prefix="/api", tags=["people"])


@router.post("/people")
def upsert_person(p: PersonIn):
    db.execute(
        """insert into person(sis_id, first, last, email, kind)
           values(?,?,?,?,?)
           on conflict(sis_id) do update set
             first=excluded.first, last=excluded.last,
             email=excluded.email, kind=excluded.kind""",
        (p.sis_id, p.first, p.last, p.email, p.kind),
    )
    return db.query("select * from person where sis_id=?", (p.sis_id,))[0]


@router.get("/people")
def list_people():
    return db.query("select * from person order by kind, last, first")
