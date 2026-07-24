"""9xai Microsoft provisioning — Teams + Outlook via Entra ID (owner: Issa).

Receives the SIS's enrol/drop events (contract §9c) and mirrors them into the
9xai tenant: one Teams team (= one M365 group = one Outlook group inbox) per
(course, term); teachers become owners, students members.

Modes: PROVISION_MODE=dry (default — log what WOULD happen, no Graph calls)
or live (real). The caller (the SIS outbox) retries on failure and the moves
here are idempotent, so delivery is safely at-least-once.
"""
import os
from contextlib import asynccontextmanager
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()

from app import graph, store  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.init_db()
    yield


app = FastAPI(title="9xai Provisioning", version="0.1.0", lifespan=lifespan)


class Term(BaseModel):
    code: str
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None


class Person(BaseModel):
    sis_id: str
    first: str
    last: str
    email: str


class Course(BaseModel):
    sis_id: str
    code: str
    title: str


class ProvisionEvent(BaseModel):
    type: Literal["enrol", "drop"]
    term: Term
    role: Literal["student", "teacher"] = "student"
    person: Person
    course: Course


def _mode() -> str:
    return os.getenv("PROVISION_MODE", "dry")


@app.get("/health")
def health():
    creds = all(os.getenv(k) for k in
                ("TENANT_ID", "CLIENT_ID", "CLIENT_SECRET", "OWNER_UPN"))
    return {"status": "ok", "service": "9xai-provisioning",
            "mode": _mode(), "credentials_present": creds,
            "teams_mapped": len(store.list_teams())}


@app.get("/teams")
def teams():
    return {"teams": store.list_teams()}


@app.get("/log")
def log(limit: int = 100):
    return store.logs(limit)


@app.post("/provision")
def provision(event: ProvisionEvent):
    mode = _mode()
    team_name = f"{event.course.code} — {event.term.code}"
    who = f"{event.person.email} ({event.role})"

    if mode == "dry":
        would = (f"ensure team '{team_name}'; "
                 + ("add " if event.type == "enrol" else "remove ")
                 + who
                 + (" as owner" if event.role == "teacher"
                    and event.type == "enrol" else ""))
        store.log(event.type, mode, "would", would)
        return {"ok": True, "mode": "dry", "would": would}

    # ---- live: ensure user (create+license on enrol) → team → membership ----
    try:
        person = {"email": event.person.email, "first": event.person.first,
                  "last": event.person.last}
        if event.type == "enrol":
            # Identity is BORN from registration — create + license if missing.
            user_id, user_action = graph.ensure_user(person)
        else:
            existing = graph.resolve_user(event.person.email)
            if existing is None:          # never provisioned → nothing to remove
                store.log("drop", mode, "ok",
                          f"{event.person.email}: not in tenant — noop")
                return {"ok": True, "noop": True, "reason": "user not in tenant"}
            user_id, user_action = existing["id"], "found"

        mapped = store.get_team(event.course.sis_id, event.term.code)
        if mapped:
            team_id = mapped["group_id"]
        elif event.type == "enrol":
            team_id = graph.create_team(
                team_name, f"{event.course.title} · {event.term.code} · 9xai")
            store.save_team(event.course.sis_id, event.term.code,
                            team_id, team_name)
        else:                             # drop for an unmapped team
            store.log("drop", mode, "ok", f"no team for {team_name} — noop")
            return {"ok": True, "noop": True, "reason": "no team mapped"}

        if event.type == "enrol":
            res = graph.add_member(team_id, user_id, owner=(event.role == "teacher"))
        else:
            res = graph.remove_member(team_id, user_id)

        store.log(event.type, mode, "ok",
                  f"{who} [{user_action}] → {team_name}: {res}")
        return {"ok": True, "entra_user_id": user_id, "user": user_action,
                "group_id": team_id, "result": res}

    except graph.GraphError as e:
        # A real Graph failure → non-2xx so the SIS outbox retries it.
        store.log(event.type, mode, "error", str(e))
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=str(e)) from e
