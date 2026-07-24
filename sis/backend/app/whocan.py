"""WhoCan delivery — event builders + the HTTP transport.

This module knows two things and nothing else:
  * how to BUILD contract §9a events (term carried as an object WITH dates, so
    WhoCan can stamp the enrolment window and needs no term table of its own);
  * how to DELIVER one event over HTTP and say whether it landed.

Queueing, retries, modes and logging live in app/outbox.py — delivery is
deliberately dumb so the outbox can own the policy.
"""
import os

import httpx


def cfg():
    return {
        "url": os.getenv("WHOCAN_API_URL", "http://localhost:8010"),
        "mode": os.getenv("WHOCAN_SYNC_MODE", "dry"),   # dry | live | off
        "user": os.getenv("WHOCAN_SERVICE_USER", "1"),  # admin1 on the local DB
    }


def _term_obj(term_row: dict) -> dict:
    return {"code": term_row["code"],
            "starts_at": term_row.get("starts_at"),
            "ends_at": term_row.get("ends_at")}


def build_event(kind: str, person: dict, course: dict, term_row: dict,
                role: str) -> dict:
    """kind = 'enrol' | 'drop'. person/course/term_row are SIS store rows."""
    return {
        "type": kind,
        "term": _term_obj(term_row),
        "role": role,
        "person": {
            "sis_id": person["sis_id"],
            "first": person["first"],
            "last": person["last"],
            "email": person["email"],
        },
        "course": {
            "sis_id": course["sis_id"],
            "code": course["code"],
            "title": course["title"],
        },
    }


def build_account_event(person: dict, term_row: dict, active: bool) -> dict:
    """The login gate (contract §6): does this person have any active
    registration in the current term?"""
    return {
        "type": "account",
        "term": _term_obj(term_row),
        "active": active,
        "person": {
            "sis_id": person["sis_id"],
            "first": person["first"],
            "last": person["last"],
            "email": person["email"],
        },
    }


def deliver(event: dict) -> tuple[bool, str]:
    """POST one event to WhoCan. Returns (ok, detail). Never raises."""
    c = cfg()
    endpoint = f"{c['url']}/api/sis/events"
    try:
        r = httpx.post(endpoint, json=event,
                       headers={"X-Acting-User": str(c["user"])}, timeout=15)
        if r.is_success:
            return True, f"{r.status_code} {r.text[:200]}"
        return False, f"{r.status_code} {r.text[:300]}"
    except Exception as e:  # noqa: BLE001 — transport errors become retries
        return False, f"transport: {e}"
