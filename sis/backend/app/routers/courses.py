from fastapi import APIRouter

from app import db
from app.models import CourseIn

router = APIRouter(prefix="/api", tags=["courses"])


@router.post("/courses")
def upsert_course(c: CourseIn):
    db.execute(
        """insert into course(sis_id, code, title)
           values(?,?,?)
           on conflict(sis_id) do update set
             code=excluded.code, title=excluded.title""",
        (c.sis_id, c.code, c.title),
    )
    return db.query("select * from course where sis_id=?", (c.sis_id,))[0]


@router.get("/courses")
def list_courses():
    return db.query("select * from course order by code")
