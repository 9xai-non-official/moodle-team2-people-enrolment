from fastapi import APIRouter, HTTPException

from app import db
from app.models import TermIn

router = APIRouter(prefix="/api", tags=["terms"])


@router.post("/terms")
def upsert_term(t: TermIn):
    db.execute(
        """insert into term(code, name, starts_at, ends_at, is_current)
           values(?,?,?,?,?)
           on conflict(code) do update set
             name=excluded.name, starts_at=excluded.starts_at,
             ends_at=excluded.ends_at, is_current=excluded.is_current""",
        (t.code, t.name, t.starts_at, t.ends_at, 1 if t.is_current else 0),
    )
    if t.is_current:
        db.execute("update term set is_current=0 where code<>?", (t.code,))
    return db.query("select * from term where code=?", (t.code,))[0]


@router.get("/terms")
def list_terms():
    return db.query("select * from term order by code")


@router.post("/terms/{code}/make-current")
def make_current(code: str):
    if not db.query("select 1 from term where code=?", (code,)):
        raise HTTPException(404, f"unknown term {code}")
    db.execute("update term set is_current = case when code=? then 1 else 0 end", (code,))
    return db.query("select * from term where code=?", (code,))[0]
