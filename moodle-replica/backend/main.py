"""
Moodle-replica backend — FastAPI skeleton.

A minimal, runnable API scaffold around Moodle's core "people & enrolment"
concepts. Endpoints are stubs that return placeholder data so the frontend
has something to talk to; fill in real logic + a database later.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db, errors
from app.routers import users, courses, enrolment, roles, groups, progress
from app.routers import permissions, auth, progress_report, sis_events
from app.routers.lms import router as lms_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(
    title="Moodle Replica API",
    description="Skeleton API for the people & enrolment module.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the Vite dev server (localhost:5173) during development, plus the
# deployed frontend on Vercel (any *.vercel.app preview/prod of this team).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # Vite may pick the next free port if 5173 is taken.
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Map database constraint violations onto shaped {ok:false, code, reason}
# responses instead of bare 500s (work package §15). Registered before the
# routers so every endpoint inherits it.
#
# MERGE POINT for Khaled's D-AUTH middleware — add it to the stack here.
errors.install(app)


@app.get("/", include_in_schema=False)
def root():
    """Friendly landing for the bare API domain — people WILL open it."""
    return {
        "service": "WhoCan API — people & enrolment",
        "app": "https://whocan.vercel.app",
        "health": "/api/health",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
async def health():
    """Liveness + DB reachability (proves the deployed schema answers)."""
    out = {"status": "ok", "service": "moodle-replica-api", "version": "0.1.0",
           "database": "not configured"}
    if db.connected():
        counts = await db.fetch_one(
            "select (select count(*) from role) as roles, "
            "(select count(*) from capability) as capabilities"
        )
        out["database"] = {"connected": True, **counts}
    return out


@app.get("/api/stats", tags=["health"])
async def stats():
    """Dashboard cards: seeded counts from the live DB."""
    return await db.fetch_one(
        "select (select count(*) from app_user where deleted_at is null) as users, "
        "(select count(*) from course where deleted_at is null) as courses, "
        "(select count(*) from enrolment) as enrolments, "
        "(select count(*) from course_group) as groups"
    )


# Feature routers — each is a skeleton, ready to grow.
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(enrolment.router)
app.include_router(roles.router)
app.include_router(groups.router)
app.include_router(progress.router)
app.include_router(progress_report.router)
app.include_router(permissions.router)
app.include_router(auth.router)
app.include_router(lms_router)
app.include_router(sis_events.router)  # SIS portal ingest (Mahmoud, T2-SIS-001)
