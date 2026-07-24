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
from fastapi.staticfiles import StaticFiles

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
        # Per-target delivery modes — the portal's Sync view renders these.
        "modes": {name: t["mode"]() for name, t in outbox.TARGETS.items()},
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
    """Demo data: a live term, people with full profiles, and a real course
    catalog (days/time/room/credits/capacity — what المواد المطروحة shows).
    Term starts 2026-07-01 so enrolment windows are LIVE during the demo.

    Master data only — teaching assignments and registrations go through the
    API so they flow through the outbox like real life."""
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
        ("S1001", "Sara", "Ali", "sara@9xai.onmicrosoft.com", "student",
         "2001428379", "أنثى", "الأردنية", "2007-05-04", "عمان", "0785454080", 88.4),
        ("S1002", "Omar", "Nasser", "omar@9xai.onmicrosoft.com", "student",
         "2001551200", "ذكر", "الأردنية", "2006-11-19", "الزرقاء", "0791234567", 79.2),
        ("S1003", "Lina", "Haddad", "lina@9xai.onmicrosoft.com", "student",
         "2001662311", "أنثى", "الأردنية", "2007-02-27", "إربد", "0779988776", 91.5),
        ("T2001", "Tala", "Teacher", "tala@9xai.onmicrosoft.com", "teacher",
         "9841022137", "أنثى", "الأردنية", "1988-09-12", "عمان", "0788112233", None),
        ("T2002", "Bilal", "Diab", "bilal@9xai.onmicrosoft.com", "teacher",
         "9790455610", "ذكر", "الأردنية", "1979-03-30", "عمان", "0795556677", None),
    ]
    for sid, f, l, e, k, nid, g, nat, bd, city, ph, avg in roster:
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
            (sid, f, l, e, k, nid, g, nat, bd, city, ph, avg),
        )
    catalog = [
        ("CRS-CS101", "CS101", "Intro to Computer Science", 3, "ح ث خ", "10:00 - 11:30", "405ل", 30),
        ("CRS-MATH200", "MATH200", "Discrete Mathematics", 3, "ن ر", "09:00 - 10:30", "119ت", 25),
        ("CRS-ENG101", "ENG101", "English Communication Skills", 3, "ح ث خ", "13:00 - 14:30", "منصة", 40),
        ("CRS-PHYS101", "PHYS101", "General Physics 1", 3, "ن ر", "11:00 - 12:30", "306هـ", 25),
        ("CRS-ETH110", "ETH110", "Ethics in Medical Sciences", 2, "ن ر", "12:00 - 13:00", "117ت", 35),
        ("CRS-LAB090", "LAB090", "Closed-Section Demo Lab", 1, "ن", "08:00 - 09:00", "420ت", 1),
    ]
    for sid, code, title, cr, days, ts, room, cap in catalog:
        db.execute(
            """insert into course(sis_id, code, title, credits, days, time_slot, room, capacity)
               values(?,?,?,?,?,?,?,?)
               on conflict(sis_id) do update set
                 code=excluded.code, title=excluded.title, credits=excluded.credits,
                 days=excluded.days, time_slot=excluded.time_slot,
                 room=excluded.room, capacity=excluded.capacity""",
            (sid, code, title, cr, days, ts, room, cap),
        )
    return {"seeded": True, "term": "FALL2026",
            "people": len(roster), "courses": len(catalog)}


app.include_router(terms.router)
app.include_router(people.router)
app.include_router(courses.router)
app.include_router(registrations.router)

# Serve the student portal (sis/frontend/) at /portal when present.
_frontend = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
if os.path.isdir(_frontend):
    app.mount("/portal", StaticFiles(directory=_frontend, html=True), name="portal")
