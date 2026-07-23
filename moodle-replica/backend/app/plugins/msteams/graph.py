"""Thin Microsoft Graph client for the msteams plugin — httpx + client
credentials, no msal (one token POST is all the flow needs).

Error contract, consumed by handlers + the outbox:
  * GraphError            → retryable; the dispatcher backs off and retries.
  * find_user() -> None   → terminal (no AAD account for that email); the
                            handler skips the member, never retries.
  * add_member 409 "already a member" / remove_member no-match → success
    (idempotent re-dispatch is the normal case, not an error).

429s honor Retry-After once; 401 refreshes the app token once. Everything
else raises GraphError with the Graph response body for the outbox's
last_error column.
"""
import asyncio
import time
from urllib.parse import quote

import httpx

GRAPH = "https://graph.microsoft.com/v1.0"
_TIMEOUT = 30.0

# Module-level app-token cache: (tenant_id, client_id) -> (token, expires_at).
_token_cache: dict[tuple, tuple[str, float]] = {}


class GraphError(Exception):
    def __init__(self, status: int, body: str):
        self.status = status
        super().__init__(f"Graph {status}: {body[:500]}")


async def _token(settings: dict, *, force: bool = False) -> str:
    key = (settings["tenant_id"], settings["client_id"])
    cached = _token_cache.get(key)
    if cached and not force and cached[1] > time.time() + 60:
        return cached[0]
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"https://login.microsoftonline.com/{settings['tenant_id']}"
            "/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": settings["client_id"],
                "client_secret": settings["client_secret"],
                "scope": "https://graph.microsoft.com/.default",
            })
    if resp.status_code != 200:
        raise GraphError(resp.status_code, resp.text)
    data = resp.json()
    _token_cache[key] = (data["access_token"],
                         time.time() + int(data.get("expires_in", 3600)))
    return data["access_token"]


async def _call(method: str, path: str, settings: dict,
                **kwargs) -> httpx.Response:
    token = await _token(settings)
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for attempt in (1, 2):
            resp = await client.request(
                method, f"{GRAPH}{path}",
                headers={"Authorization": f"Bearer {token}"}, **kwargs)
            if resp.status_code == 429 and attempt == 1:
                await asyncio.sleep(float(resp.headers.get("Retry-After", 5)))
                continue
            if resp.status_code == 401 and attempt == 1:
                token = await _token(settings, force=True)
                continue
            return resp
    return resp


async def find_user(email: str, settings: dict) -> str | None:
    """AAD object id for an email/UPN, or None (terminal skip)."""
    resp = await _call("GET", f"/users/{quote(email)}", settings)
    if resp.status_code == 404:
        return None
    if resp.status_code != 200:
        raise GraphError(resp.status_code, resp.text)
    return resp.json()["id"]


async def create_team(name: str, description: str, owner_upn: str,
                      settings: dict) -> str:
    """Create a standard team with one owner; returns the team (group) id.
    App-only creation requires >=1 owner (Graph rule)."""
    owner_id = await find_user(owner_upn, settings)
    if owner_id is None:
        raise GraphError(
            404, f"owner_upn '{owner_upn}' not found in tenant — fix the "
            "msteams plugin settings")
    resp = await _call("POST", "/teams", settings, json={
        "template@odata.bind":
            "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
        "displayName": name,
        "description": description,
        "members": [{
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            "roles": ["owner"],
            "user@odata.bind":
                f"https://graph.microsoft.com/v1.0/users('{owner_id}')",
        }],
    })
    if resp.status_code != 202:
        raise GraphError(resp.status_code, resp.text)
    # Content-Location: /teams('<id>')
    location = resp.headers.get("Content-Location", "")
    team_id = location.split("'")[1] if "'" in location else None
    if not team_id:
        raise GraphError(202, f"no team id in Content-Location: {location!r}")
    return team_id


async def add_member(team_id: str, aad_user_id: str, settings: dict) -> None:
    resp = await _call("POST", f"/teams/{team_id}/members", settings, json={
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        "roles": [],
        "user@odata.bind":
            f"https://graph.microsoft.com/v1.0/users('{aad_user_id}')",
    })
    if resp.status_code in (200, 201):
        return
    if resp.status_code in (400, 409) and "already" in resp.text.lower():
        return  # idempotent re-add
    raise GraphError(resp.status_code, resp.text)


async def remove_member(team_id: str, aad_user_id: str,
                        settings: dict) -> None:
    flt = quote(f"(microsoft.graph.aadUserConversationMember/userId eq "
                f"'{aad_user_id}')", safe="()'")
    resp = await _call("GET", f"/teams/{team_id}/members?$filter={flt}",
                       settings)
    if resp.status_code != 200:
        raise GraphError(resp.status_code, resp.text)
    memberships = resp.json().get("value", [])
    if not memberships:
        return  # already gone
    membership_id = memberships[0]["id"]
    resp = await _call("DELETE", f"/teams/{team_id}/members/{membership_id}",
                       settings)
    if resp.status_code not in (204, 404):
        raise GraphError(resp.status_code, resp.text)


async def archive_team(team_id: str, settings: dict) -> None:
    resp = await _call("POST", f"/teams/{team_id}/archive", settings, json={})
    if resp.status_code not in (202, 204):
        # Archiving an already-archived team errors — treat as done.
        if resp.status_code == 400 and "archiv" in resp.text.lower():
            return
        raise GraphError(resp.status_code, resp.text)
