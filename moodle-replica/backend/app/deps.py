"""Shared request dependencies (Essa custodian — shared surface).

`current_user` — the authenticated principal for route handlers.

  INTERIM IDENTITY ASSERTION (documented, deliberate): the caller states who
  they are via the `X-Acting-User` header (the frontend sends its acting-user
  id). The server validates the account exists and is neither deleted nor
  suspended, and every capability decision is still made SERVER-SIDE against
  that principal by Khaled's resolver. What this does NOT do is prove the
  caller owns the identity — that is D-AUTH (Khaled's session/JWT work) and
  slots in here, replacing only this dependency, with zero changes at the
  ~40 call sites. Routes consume `Depends(current_user)` per the work-package
  contract either way.

`require_capability` — thin 403-raiser delegating to Khaled's
`has_capability(db, user_id, capability, context_id)`. No resolution logic
lives here (that would be the anti-pattern the audit killed in groups.py).

`course_context_id` — the course→context resolver (D-GRP-ARITY): course id
and context id are different keyspaces; passing a course id where a context
id belongs was exactly the T2-GRP-001 crash.
"""
from fastapi import Header, HTTPException

from app import db
from app.services.permissions import has_capability


async def current_user(x_acting_user: int | None = Header(default=None)) -> dict:
    if x_acting_user is None:
        raise HTTPException(
            status_code=401,
            detail="no principal — send X-Acting-User (interim identity "
            "assertion until D-AUTH session auth lands)",
        )
    row = await db.fetch_one(
        "select id, username, suspended, (deleted_at is not null) as deleted "
        "from app_user where id = $1",
        x_acting_user,
    )
    if row is None or row["deleted"]:
        raise HTTPException(status_code=401, detail=f"unknown principal {x_acting_user}")
    if row["suspended"]:
        # Docstring promises "neither deleted nor suspended"; the guard omitted
        # the suspended check, letting a suspended account reach every gated route.
        raise HTTPException(status_code=403, detail=f"account {x_acting_user} is suspended")
    return row


async def require_capability(user_id: int, capability: str, context_id: int) -> None:
    """403 naming the capability — matches V1 of the groups work package."""
    allowed = await has_capability(db, user_id, capability, context_id)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"requires capability '{capability}' at context {context_id}",
        )


async def course_context_id(course_id: int) -> int:
    row = await db.fetch_one(
        "select id from context where level = 'course' and instance_id = $1",
        course_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"no context for course {course_id}")
    return row["id"]
