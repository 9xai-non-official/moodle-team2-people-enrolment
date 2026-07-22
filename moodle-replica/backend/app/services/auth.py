"""Authentication — resolve the acting principal from a VERIFIED credential.

Why this file exists
--------------------
Before this, the roles/permissions endpoints trusted a caller-supplied actor id
(a request-body field or query parameter), and admin-ness was computed from that
*unverified* id — so any caller could claim to be anyone, including a site admin.
This module makes identity come from a verified credential instead, and nothing
about *authority* (admin, capabilities) is taken from the token: it is derived
downstream from the verified user id by the permission engine.

Assumption (documented, because this repo carries NO session / JWT / identity-
provider infrastructure and no secret): the caller presents a Bearer token in the
Authorization header. The DEFAULT verifier treats it as an HMAC-SHA256-signed
token, self-contained and dependency-free (stdlib only, so requirements.txt is
untouched):

    token   = base64url(payload_json) + "." + base64url(HMAC_SHA256(payload_b64, secret))
    payload = {"sub": <user_id:int>, "username"?: <str>, "exp"?: <unix seconds>}

The signing secret is read from the AUTH_SECRET environment variable — never
hardcoded.

Pluggable: the real identity mechanism (server session, JWT from an IdP, or an
authenticating gateway that injects a header) is NOT determinable from this repo.
Swap the verifier with ``set_verifier(v)`` to plug in a real check without
touching a single call site; the default HMAC verifier is a correct stand-in.

Fail-closed: a missing / malformed / invalid / expired credential yields HTTP
401. If AUTH_SECRET is unset, the default verifier authenticates *nobody* (every
request → 401) rather than falling open.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


@dataclass(frozen=True)
class Principal:
    """The authenticated caller. IDENTITY ONLY — authority (admin status,
    capabilities) is resolved downstream from this verified id, never trusted
    from the credential itself."""

    user_id: int
    username: Optional[str] = None


@runtime_checkable
class TokenVerifier(Protocol):
    """Anything that turns raw credential material into a Principal (or None)."""

    def verify(self, credentials: str) -> Optional[Principal]:
        ...


# --- base64url helpers (no padding, URL-safe) ------------------------------
def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


class HmacTokenVerifier:
    """Default stand-in verifier: HMAC-SHA256-signed bearer tokens.

    Holds the shared secret. With no secret it verifies nothing (fail-closed).
    """

    def __init__(self, secret: Optional[str]):
        self._secret: Optional[bytes] = secret.encode("utf-8") if secret else None

    @classmethod
    def from_env(cls) -> "HmacTokenVerifier":
        return cls(os.environ.get("AUTH_SECRET"))

    def _sign(self, payload_b64: str) -> str:
        assert self._secret is not None
        return _b64url_encode(
            hmac.new(self._secret, payload_b64.encode("ascii"), hashlib.sha256).digest()
        )

    def verify(self, credentials: str) -> Optional[Principal]:
        # A valid base64url token is always ASCII. Starlette decodes header bytes
        # as latin-1, so a crafted `Bearer é.abc` would otherwise reach _sign()/
        # compare_digest (which reject non-ASCII by raising) — guard first so a
        # malformed credential fails CLOSED (None → 401), never crashes (500).
        if (not self._secret or not credentials or not credentials.isascii()
                or credentials.count(".") != 1):
            return None
        payload_b64, sig = credentials.rsplit(".", 1)
        # Constant-time signature comparison, then decode — never trust unverified
        # bytes.
        if not hmac.compare_digest(sig, self._sign(payload_b64)):
            return None
        try:
            payload = json.loads(_b64url_decode(payload_b64))
            sub = int(payload["sub"])
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            return None
        exp = payload.get("exp")
        if exp is not None:
            try:
                if float(exp) < time.time():
                    return None
            except (ValueError, TypeError):
                return None
        username = payload.get("username")
        return Principal(user_id=sub, username=username if isinstance(username, str) else None)


def issue_token(
    user_id: int,
    *,
    secret: Optional[str] = None,
    username: Optional[str] = None,
    ttl_seconds: Optional[int] = None,
) -> str:
    """Mint an HMAC token for the default verifier. For dev/test/tooling — not an
    HTTP endpoint. ``secret`` defaults to AUTH_SECRET."""
    secret = secret if secret is not None else os.environ.get("AUTH_SECRET")
    if not secret:
        raise RuntimeError("AUTH_SECRET is not set — cannot issue a token")
    payload: dict = {"sub": int(user_id)}
    if username:
        payload["username"] = username
    if ttl_seconds is not None:
        payload["exp"] = time.time() + ttl_seconds
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = _b64url_encode(
        hmac.new(secret.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    )
    return f"{payload_b64}.{sig}"


# --- pluggable verifier + FastAPI dependency -------------------------------
# Bound at import from the environment. Swap it at runtime (e.g. a real JWT/IdP
# verifier, or a test double) with set_verifier() — no call site changes.
_verifier: TokenVerifier = HmacTokenVerifier.from_env()
_bearer = HTTPBearer(auto_error=False)  # auto_error=False so WE raise 401, not 403


def set_verifier(verifier: TokenVerifier) -> None:
    global _verifier
    _verifier = verifier


def get_verifier() -> TokenVerifier:
    return _verifier


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Principal:
    """FastAPI dependency: the verified acting principal, or HTTP 401.

    Depend on this instead of reading an actor id from the request. It never
    consults the request body/query for identity.
    """
    if creds is None or (creds.scheme or "").lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="missing or malformed Authorization header (expected 'Bearer <token>')",
        )
    # Fail-closed even if a (custom) verifier throws: any error → 401, never 500.
    try:
        principal = _verifier.verify(creds.credentials)
    except Exception:
        principal = None
    if principal is None:
        raise HTTPException(status_code=401, detail="invalid or expired credential")
    return principal
