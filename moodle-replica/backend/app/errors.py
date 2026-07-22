"""Database-error -> HTTP-response mapping (work package §15).

Before this existed, an uncaught constraint violation surfaced as a bare 500
with an opaque body: the PostgREST layer turned every failure into a generic
500 via an unhandled `raise_for_status()`, and asyncpg errors propagated raw.
The frontend's ApiError (src/errors.js:4-26) reads `detail` / `reason` /
`reasons` / `blocking_reasons`, so it had nothing to show the user.

Registering `install(app)` maps the violations our constraints actually raise
onto deterministic, shaped responses. This is what makes the DB the enforcement
point rather than something the app has to defend against: a race that loses is
now a 409 with a reason, not a 500.

Mappings:
    unique violation      -> 409  (guest method race M08; crit-compl M04;
                                   role sort_order race)
    foreign key violation -> 409  (referenced row missing or still referenced)
    check violation       -> 400  (availability one-target CHECK M06;
                                   cohort method CHECK)
    restrict violation    -> 409  (write-once time_completed M13)
    not-null violation    -> 400
    raise_exception       -> 409  (explicit `raise exception` in a trigger)
"""
from __future__ import annotations

import logging

import asyncpg
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

# asyncpg exception -> (status, stable machine-readable code)
_MAP: list[tuple[type[Exception], int, str]] = [
    (asyncpg.UniqueViolationError, 409, "conflict"),
    (asyncpg.ForeignKeyViolationError, 409, "foreign_key"),
    (asyncpg.CheckViolationError, 400, "check_failed"),
    (asyncpg.RestrictViolationError, 409, "restricted"),
    (asyncpg.NotNullViolationError, 400, "missing_field"),
    (asyncpg.RaiseError, 409, "rejected"),
]


def _classify(exc: BaseException) -> tuple[int, str] | None:
    for exc_type, status, code in _MAP:
        if isinstance(exc, exc_type):
            return status, code
    return None


def _reason(exc: asyncpg.PostgresError) -> str:
    """Prefer the database's own message.

    Our constraint names and trigger messages are written to be read by a
    human ('course_completion.time_completed is write-once...'), so passing
    them through beats inventing a vaguer one here.
    """
    detail = getattr(exc, "detail", None)
    message = getattr(exc, "message", None) or str(exc)
    return f"{message} ({detail})" if detail else message


def install(app: FastAPI) -> None:
    @app.exception_handler(asyncpg.PostgresError)
    async def _postgres_error(request: Request, exc: asyncpg.PostgresError):
        hit = _classify(exc)
        if hit is None:
            # Genuinely unexpected: log it with the SQLSTATE, but do not leak
            # query text or connection details to the client.
            log.exception("unhandled database error on %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=500,
                content={
                    "ok": False,
                    "code": "database_error",
                    "reason": "the database rejected this operation",
                    "detail": "the database rejected this operation",
                },
            )
        status, code = hit
        reason = _reason(exc)
        constraint = getattr(exc, "constraint_name", None)
        body = {"ok": False, "code": code, "reason": reason, "detail": reason}
        if constraint:
            body["constraint"] = constraint
        return JSONResponse(status_code=status, content=body)
