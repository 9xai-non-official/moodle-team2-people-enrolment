"""
Moodle-replica backend — FastAPI skeleton.

A minimal, runnable API scaffold around Moodle's core "people & enrolment"
concepts. Endpoints are stubs that return placeholder data so the frontend
has something to talk to; fill in real logic + a database later.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import users, courses, enrolment, roles, groups

app = FastAPI(
    title="Moodle Replica API",
    description="Skeleton API for the people & enrolment module.",
    version="0.1.0",
)

# Allow the Vite dev server (localhost:5173) to call this API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # Vite may pick the next free port if 5173 is taken.
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["health"])
def health():
    """Simple liveness check the frontend can ping."""
    return {"status": "ok", "service": "moodle-replica-api", "version": "0.1.0"}


# Feature routers — each is a skeleton, ready to grow.
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(enrolment.router)
app.include_router(roles.router)
app.include_router(groups.router)
