"""9xai SIS — Student Information System (the registration source of truth).

A standalone mini-service. It owns people, courses, terms, and registrations,
and delivers enrolment events to WhoCan (the LMS) through a transactional
outbox drained by a background worker. Teachers flow through the same pipeline
as students — only the role differs (student registers, registrar assigns).

See docs/SIS-WHOCAN-SYNC-CONTRACT.md for the ownership + sync rules.
"""
import asyncio
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app import db, outbox  # noqa: E402  (after load_dotenv so env is honoured)
from app.routers import courses, people, registrations, terms  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    interval = outbox.worker_interval()
    task = asyncio.create_task(outbox.worker(interval)) if interval > 0 else None
    yield
    if task:
        task.cancel()


app = FastAPI(
    title="9xai SIS",
    description="Student registration — source of truth for people, courses, enrolments.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "9xai SIS",
        "docs": "/docs",
        "syncs_to": os.getenv("WHOCAN_API_URL", "http://localhost:8010"),
        "sync_mode": os.getenv("WHOCAN_SYNC_MODE", "dry"),
    }


@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "service": "9xai-sis",
        "sync_mode": os.getenv("WHOCAN_SYNC_MODE", "dry"),
        "outbox": outbox.counts(),
        "counts": {
            "terms": len(db.query("select 1 from term")),
            "people": len(db.query("select 1 from person")),
            "courses": len(db.query("select 1 from course")),
            "registrations": len(db.query("select 1 from registration")),
        },
    }


@app.post("/api/seed", tags=["health"])
def seed():
    """Demo data: a live term, a teacher, two students, one course.
    Term starts 2026-07-01 so enrolment windows are LIVE during the demo
    (a September start would leave every path enrolled-but-not-yet-live)."""
    db.execute(
        """insert into term(code, name, starts_at, ends_at, is_current)
           values('FALL2026','Fall 2026','2026-07-01','2026-12-20',1)
           on conflict(code) do update set
             starts_at=excluded.starts_at, ends_at=excluded.ends_at, is_current=1"""
    )
    db.execute("update term set is_current=0 where code<>'FALL2026'")
    # Emails MUST equal the Entra UPNs (graph.resolve_user matches UPN→mail),
    # so the tenant's onmicrosoft.com domain is used, not a vanity domain.
    roster = [
        ("S1001", "Sara", "Ali", "sara@9xai.onmicrosoft.com", "student"),
        ("S1002", "Omar", "Nasser", "omar@9xai.onmicrosoft.com", "student"),
        ("T2001", "Tala", "Teacher", "tala@9xai.onmicrosoft.com", "teacher"),
    ]
    for sid, f, l, e, k in roster:
        db.execute(
            """insert into person(sis_id, first, last, email, kind) values(?,?,?,?,?)
               on conflict(sis_id) do update set
                 first=excluded.first, last=excluded.last, email=excluded.email, kind=excluded.kind""",
            (sid, f, l, e, k),
        )
    db.execute(
        """insert into course(sis_id, code, title)
           values('CRS-CS101','CS101','Intro to Computer Science')
           on conflict(sis_id) do update set code=excluded.code, title=excluded.title"""
    )
    return {"seeded": True, "term": "FALL2026", "people": len(roster), "course": "CS101"}


app.include_router(terms.router)
app.include_router(people.router)
app.include_router(courses.router)
app.include_router(registrations.router)
