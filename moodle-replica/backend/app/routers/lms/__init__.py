"""LMS API surface (/api/lms) — the backend the staging frontend already calls.
Aggregates the per-domain sub-routers (admin, enrol, requests, quiz, grade)
under one prefix. Identity on every route is the X-Acting-User principal
(app.deps.current_user); capability decisions defer to Khaled's resolver."""
from fastapi import APIRouter

from app.routers.lms import admin, enrol, requests, quiz, grade

router = APIRouter(prefix="/api/lms", tags=["lms"])
for _sub in (admin, enrol, requests, quiz, grade):
    router.include_router(_sub.router)
