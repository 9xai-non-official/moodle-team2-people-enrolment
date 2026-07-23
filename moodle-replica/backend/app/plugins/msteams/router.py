"""msteams status endpoint — powers the course-page Teams chip and the
Plugins page table. Readable by any authenticated principal (status only,
no secrets). Answers {installed: false} when the plugin table isn't there
yet, so main.py can include this router unconditionally."""
from fastapi import APIRouter, Depends, Query

from app import db
from app.deps import current_user

router = APIRouter(prefix="/api/plugins/msteams", tags=["plugins"])


@router.get("/status")
async def status(course_id: int | None = Query(default=None),
                 principal: dict = Depends(current_user)):
    installed = await db.fetch_val(
        "select to_regclass('public.msteams_course_team') is not null")
    if not installed:
        return {"installed": False, "teams": []}
    if course_id is not None:
        rows = await db.fetch_all(
            "select m.*, c.short_name, c.full_name from msteams_course_team m "
            "join course c on c.id = m.course_id where m.course_id = $1",
            course_id)
    else:
        rows = await db.fetch_all(
            "select m.*, c.short_name, c.full_name from msteams_course_team m "
            "join course c on c.id = m.course_id order by m.updated_at desc "
            "limit 100")
    return {"installed": True, "teams": rows}
