"""Ably realtime — raw REST + stdlib token signing, zero new dependencies.

The backend needs exactly two operations, so no SDK:
  * publish()              — one httpx POST with basic auth (the API key).
  * create_token_request() — a signed TokenRequest (Ably spec TK500/RSA9)
                             the browser exchanges for a short-lived token;
                             the API key itself never reaches the client.

ABLY_API_KEY env var, "keyName:keySecret" format. Unset key: publish is a
silent no-op and the token endpoint answers 503 — realtime is optional
infrastructure and must never break a domain flow.
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time

import httpx

_log = logging.getLogger("realtime")


def _key() -> tuple[str, str] | None:
    raw = os.environ.get("ABLY_API_KEY", "")
    if ":" not in raw:
        return None
    name, secret = raw.split(":", 1)
    return name, secret


def configured() -> bool:
    return _key() is not None


def create_token_request(client_id: str, capability: dict,
                         ttl_ms: int = 3600_000) -> dict:
    """Signed Ably TokenRequest (spec RSA9). The sign text is the newline-
    joined fields, each followed by \\n, HMAC-SHA256 with the key secret."""
    key = _key()
    if key is None:
        raise RuntimeError("ABLY_API_KEY not configured")
    key_name, key_secret = key
    timestamp_ms = int(time.time() * 1000)
    nonce = secrets.token_hex(16)
    capability_json = json.dumps(capability, separators=(",", ":"),
                                 sort_keys=True)
    sign_text = (f"{key_name}\n{ttl_ms}\n{capability_json}\n{client_id}\n"
                 f"{timestamp_ms}\n{nonce}\n")
    mac = base64.b64encode(
        hmac.new(key_secret.encode(), sign_text.encode(),
                 hashlib.sha256).digest()).decode()
    return {
        "keyName": key_name,
        "ttl": ttl_ms,
        "capability": capability_json,
        "clientId": client_id,
        "timestamp": timestamp_ms,
        "nonce": nonce,
        "mac": mac,
    }


async def publish(channel: str, name: str, data: dict) -> None:
    """Best-effort publish — logs and swallows every failure. Realtime is a
    status overlay; it must never fail the handler that called it."""
    key = _key()
    if key is None:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://rest.ably.io/channels/{channel}/messages",
                auth=key,
                json={"name": name, "data": json.dumps(data)})
        if resp.status_code not in (200, 201):
            _log.warning("ably publish %s failed: %s %s", channel,
                         resp.status_code, resp.text[:200])
    except Exception:
        _log.exception("ably publish %s failed", channel)
