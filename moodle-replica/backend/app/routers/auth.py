"""Auth API — login / signup / confirm / me.

Wires the frontend LMS auth flow (AuthPage.jsx) to the real DB. Khaled's
services/auth.py provides the token/verifier layer; this router provides the
account flow the UI actually calls. Session shape mirrors the mock's
`meSummary`: {user, is_admin, teaches:[course_id], enrolled:[course_id]}.

Demo personas (seeded users with NO app_credential row) sign in with ANY
password — a deliberate demo affordance ("Demo personas sign in with any
password"). Self-registered accounts get a real password hash + a Moodle-style
email-confirmation gate.
"""
import hashlib
import hmac
import os

from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/api/auth", tags=["auth"])

_PEPPER = os.environ.get("AUTH_SECRET", "whocan-dev-pepper").encode()


def _hash(password: str) -> str:
    salt = hashlib.sha256(_PEPPER).digest()[:16]
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000).hex()


def _verify(password: str, stored: str) -> bool:
    return hmac.compare_digest(_hash(password), stored)


async def _me_summary(user: dict) -> dict:
    """The session payload the frontend Session context stores."""
    uid = user["id"]
    is_admin = bool(await db.fetch_one(
        """
        select 1 from role_assignment ra
          join role r on r.id = ra.role_id
          join context c on c.id = ra.context_id
         where ra.user_id = $1 and r.archetype = 'manager' and c.level = 'system'
         limit 1
        """, uid))
    teaches = await db.fetch_all(
        """
        select distinct c.instance_id as course_id
          from role_assignment ra
          join role r on r.id = ra.role_id
          join context c on c.id = ra.context_id
         where ra.user_id = $1 and c.level = 'course'
           and r.archetype in ('editingteacher','teacher')
        """, uid)
    enrolled = await db.fetch_all(
        "select course_id from v_course_participant where user_id = $1 and enrolled", uid)
    return {
        "user": {
            "id": uid, "username": user["username"],
            "first_name": user["first_name"], "last_name": user["last_name"],
            "full_name": f"{user['first_name']} {user['last_name']}",
            "suspended": user["suspended"],
        },
        "is_admin": is_admin,
        "teaches": [r["course_id"] for r in teaches],
        "enrolled": [r["course_id"] for r in enrolled],
    }


async def _user_by_name(username: str) -> dict | None:
    return await db.fetch_one(
        "select id, username, first_name, last_name, suspended, "
        "(deleted_at is not null) as deleted from app_user where username = $1",
        username)


@router.post("/login")
async def login(body: dict):
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    user = await _user_by_name(username)
    if not user or user["deleted"] or not password:
        raise HTTPException(status_code=401, detail="invalid username or password")
    cred = await db.fetch_one(
        "select password_hash, confirmed from app_credential where user_id = $1", user["id"])
    if cred is not None:
        # a self-registered account: password + confirmation are enforced
        if not _verify(password, cred["password_hash"]):
            raise HTTPException(status_code=401, detail="invalid username or password")
        if not cred["confirmed"]:
            raise HTTPException(status_code=403, detail={"reasons": [
                "account not confirmed yet — click the confirmation link first "
                "(we mock Moodle's confirmation email in-app)"]})
    # else: a demo persona — any password signs in
    if user["suspended"]:
        raise HTTPException(status_code=403, detail={"reasons": [
            "this account is suspended site-wide — sign-in refused, exactly like "
            "Moodle; enrolments and grades are kept"]})
    return await _me_summary(user)


@router.post("/signup", status_code=201)
async def signup(body: dict):
    for f in ("username", "first_name", "last_name", "password"):
        if not (body.get(f) or "").strip():
            raise HTTPException(status_code=400,
                                detail="username, first_name, last_name and password are all required")
    if await _user_by_name(body["username"]):
        raise HTTPException(status_code=409,
                            detail=f"username '{body['username']}' is taken — pick another")
    user = await db.fetch_one(
        """
        insert into app_user (username, email, first_name, last_name)
        values ($1, $2, $3, $4)
        returning id, username, first_name, last_name, suspended
        """,
        body["username"], f"{body['username']}@whocan.local",
        body["first_name"], body["last_name"])
    await db.fetch_one(
        "insert into app_credential (user_id, password_hash, confirmed) values ($1, $2, false) returning user_id",
        user["id"], _hash(body["password"]))
    return {"user": {**dict(user), "full_name": f"{user['first_name']} {user['last_name']}"},
            "confirmation_required": True}


@router.post("/confirm")
async def confirm(body: dict):
    row = await db.fetch_one(
        "update app_credential set confirmed = true where user_id = $1 returning user_id",
        int(body.get("user_id", 0)))
    if row is None:
        raise HTTPException(status_code=404, detail="unknown account")
    return {"confirmed": True}


@router.get("/me")
async def me(user_id: int):
    user = await db.fetch_one(
        "select id, username, first_name, last_name, suspended, "
        "(deleted_at is not null) as deleted from app_user where id = $1", user_id)
    if not user or user["deleted"]:
        raise HTTPException(status_code=404, detail="unknown user")
    return await _me_summary(user)
