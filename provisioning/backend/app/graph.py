"""Microsoft Graph client — app-only (client credentials), stdlib + httpx.

Implements exactly the four moves the pipeline needs, using the permissions
from Issa's tenant setup (Team.Create, TeamMember.ReadWrite.All,
Group.ReadWrite.All, User.Read.All + admin consent):

  resolve_user   email/UPN → Entra user id           (User.Read.All)
  ensure_team    (course, term) → team/group id      (Team.Create; ≥1 real
                 licensed OWNER_UPN required for app-only creation)
  add_member     user → team, role member|owner      (TeamMember.ReadWrite.All)
  remove_member  user out of team                    (TeamMember.ReadWrite.All)

Known POC limitation (by design of the granted permissions): users are
RESOLVED, never created — SIS people must map to pre-created test UPNs.
Creating + licensing users needs User.ReadWrite.All and license assignment,
which the tenant setup deliberately did not grant yet.
"""
import os
import secrets
import string
import time

import httpx

GRAPH = "https://graph.microsoft.com/v1.0"

_token_cache = {"token": None, "expires": 0.0}


class GraphError(RuntimeError):
    pass


def _cfg():
    c = {k: os.getenv(k, "") for k in
         ("TENANT_ID", "CLIENT_ID", "CLIENT_SECRET", "OWNER_UPN")}
    missing = [k for k, v in c.items() if not v]
    if missing:
        raise GraphError(f"missing env: {', '.join(missing)} — fill provisioning/backend/.env")
    return c


def token() -> str:
    """Client-credentials token, cached until ~1 min before expiry."""
    if _token_cache["token"] and time.time() < _token_cache["expires"] - 60:
        return _token_cache["token"]
    c = _cfg()
    r = httpx.post(
        f"https://login.microsoftonline.com/{c['TENANT_ID']}/oauth2/v2.0/token",
        data={"grant_type": "client_credentials",
              "client_id": c["CLIENT_ID"],
              "client_secret": c["CLIENT_SECRET"],
              "scope": "https://graph.microsoft.com/.default"},
        timeout=20)
    if not r.is_success:
        raise GraphError(f"token: {r.status_code} {r.text[:300]}")
    data = r.json()
    _token_cache["token"] = data["access_token"]
    _token_cache["expires"] = time.time() + int(data.get("expires_in", 3600))
    return _token_cache["token"]


def _h():
    return {"Authorization": f"Bearer {token()}",
            "Content-Type": "application/json"}


def resolve_user(email_or_upn: str) -> dict | None:
    """Entra user by UPN, falling back to mail lookup. None = not in tenant."""
    r = httpx.get(f"{GRAPH}/users/{email_or_upn}"
                  "?$select=id,userPrincipalName,mail", headers=_h(), timeout=20)
    if r.is_success:
        return r.json()
    if r.status_code != 404:
        raise GraphError(f"resolve_user: {r.status_code} {r.text[:200]}")
    r = httpx.get(f"{GRAPH}/users?$filter=mail eq '{email_or_upn}'"
                  "&$select=id,userPrincipalName,mail", headers=_h(), timeout=20)
    if not r.is_success:
        raise GraphError(f"resolve_user filter: {r.status_code} {r.text[:200]}")
    hits = r.json().get("value", [])
    return hits[0] if hits else None


# ---------------------------------------------------------------------------
# User provisioning (create + license) — the "born from registration" path.
# This is how a real university does it: the SIS registration event creates
# the identity downstream; nobody hand-makes users in Azure. Needs
# User.ReadWrite.All (+ Organization.Read.All to read/assign license SKUs).
# ---------------------------------------------------------------------------

def _random_password(n: int = 18) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%*?"
    return "".join(secrets.choice(alphabet) for _ in range(n))


def _is_licensed(user_id: str) -> bool:
    r = httpx.get(f"{GRAPH}/users/{user_id}?$select=assignedLicenses",
                  headers=_h(), timeout=20)
    if not r.is_success:
        raise GraphError(f"license check: {r.status_code} {r.text[:200]}")
    return bool(r.json().get("assignedLicenses"))


def _sku_with_free_seat() -> str | None:
    """A subscribed SKU that still has a free seat — prefer Business Premium."""
    r = httpx.get(f"{GRAPH}/subscribedSkus"
                  "?$select=skuId,skuPartNumber,prepaidUnits,consumedUnits",
                  headers=_h(), timeout=20)
    if not r.is_success:
        raise GraphError(f"subscribedSkus: {r.status_code} {r.text[:200]}")
    skus = r.json().get("value", [])
    def free(s):  # seats left
        return s["prepaidUnits"]["enabled"] - s["consumedUnits"] > 0
    pref = [s for s in skus if "BUSINESS_PREMIUM" in s["skuPartNumber"] and free(s)]
    pick = pref or [s for s in skus if free(s)]
    return pick[0]["skuId"] if pick else None


def _assign_license(user_id: str, sku_id: str):
    r = httpx.post(f"{GRAPH}/users/{user_id}/assignLicense",
                   json={"addLicenses": [{"skuId": sku_id}], "removeLicenses": []},
                   headers=_h(), timeout=30)
    if not r.is_success:
        raise GraphError(f"assignLicense: {r.status_code} {r.text[:300]}")


def create_user(person: dict) -> str:
    """Create an Entra user from an SIS person. UPN = the SIS email (contract).
    A random password is set + force-change on first sign-in; the demo never
    logs in as them, and an admin can reset it if ever needed."""
    upn = person["email"]
    body = {
        "accountEnabled": True,
        "displayName": f"{person['first']} {person['last']}",
        "mailNickname": upn.split("@")[0],
        "userPrincipalName": upn,
        # usageLocation MUST be set before a license can be assigned
        "usageLocation": os.getenv("TENANT_USAGE_LOCATION", "JO"),
        "passwordProfile": {
            "password": _random_password(),
            "forceChangePasswordNextSignIn": True,
        },
    }
    r = httpx.post(f"{GRAPH}/users", json=body, headers=_h(), timeout=30)
    if not r.is_success:
        raise GraphError(f"create_user {upn}: {r.status_code} {r.text[:300]}")
    return r.json()["id"]


def ensure_user(person: dict) -> tuple[str, str]:
    """Find-or-create the Entra user and make sure it's licensed. Returns
    (user_id, 'found'|'created'). Idempotent: a replayed enrol finds the
    existing user; an unlicensed one gets a seat."""
    existing = resolve_user(person["email"])
    if existing:
        user_id, action = existing["id"], "found"
    else:
        user_id, action = create_user(person), "created"
    if not _is_licensed(user_id):
        sku = _sku_with_free_seat()
        if sku is None:
            raise GraphError("no license seats available in the tenant")
        _assign_license(user_id, sku)
    return user_id, action


def create_team(display_name: str, description: str) -> str:
    """App-only team creation. Returns the new team/group id.

    Graph answers 202 Accepted with a Location like
      /teams('19a...')/operations('...')
    — the team id is IN the location; the operation completes async. We parse
    the id and poll the operation briefly so add_member calls that follow
    don't race a half-provisioned team."""
    owner = os.getenv("OWNER_UPN")
    body = {
        "template@odata.bind":
            f"{GRAPH}/teamsTemplates('standard')",
        "displayName": display_name,
        "description": description,
        "members": [{
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            "roles": ["owner"],
            "user@odata.bind": f"{GRAPH}/users('{owner}')",
        }],
    }
    r = httpx.post(f"{GRAPH}/teams", json=body, headers=_h(), timeout=30)
    if r.status_code != 202:
        raise GraphError(f"create_team: {r.status_code} {r.text[:300]}")
    loc = r.headers.get("Location", "")
    try:
        team_id = loc.split("teams('")[1].split("')")[0]
    except IndexError as e:
        raise GraphError(f"create_team: no team id in Location '{loc}'") from e
    _poll_operation(loc)
    return team_id


def _poll_operation(location: str, tries: int = 6, delay: float = 2.5):
    """Best-effort wait for the async create to finish; give up quietly —
    the retrying outbox will heal a member-add that raced provisioning."""
    url = GRAPH + location if location.startswith("/") else location
    for _ in range(tries):
        r = httpx.get(url, headers=_h(), timeout=20)
        if r.is_success and r.json().get("status") == "succeeded":
            return
        time.sleep(delay)


def add_member(team_id: str, user_id: str, owner: bool) -> str:
    """Add (idempotently) a user to a team. Owner=True for teachers."""
    body = {
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        "roles": ["owner"] if owner else [],
        "user@odata.bind": f"{GRAPH}/users('{user_id}')",
    }
    r = httpx.post(f"{GRAPH}/teams/{team_id}/members",
                   json=body, headers=_h(), timeout=30)
    if r.is_success:
        return "added"
    if r.status_code in (400, 409) and "already" in r.text.lower():
        return "already-member"          # replay-safe
    raise GraphError(f"add_member: {r.status_code} {r.text[:300]}")


def remove_member(team_id: str, user_id: str) -> str:
    """Remove a user from a team; absent = success no-op (replay-safe)."""
    r = httpx.get(
        f"{GRAPH}/teams/{team_id}/members?$filter="
        f"(microsoft.graph.aadUserConversationMember/userId eq '{user_id}')",
        headers=_h(), timeout=20)
    if not r.is_success:
        raise GraphError(f"remove_member lookup: {r.status_code} {r.text[:200]}")
    hits = r.json().get("value", [])
    if not hits:
        return "not-a-member"
    membership_id = hits[0]["id"]
    r = httpx.delete(f"{GRAPH}/teams/{team_id}/members/{membership_id}",
                     headers=_h(), timeout=20)
    if r.is_success or r.status_code == 404:
        return "removed"
    raise GraphError(f"remove_member: {r.status_code} {r.text[:300]}")
