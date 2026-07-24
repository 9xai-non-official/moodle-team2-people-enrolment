"""Microsoft provisioning delivery — the SIS side of contract §9c.

Same shape as whocan.py: config + one dumb deliver(). The provisioning
SERVICE (provisioning/backend — Issa's domain) owns all Microsoft Graph
knowledge; the SIS only POSTs it the same enrol/drop events it sends WhoCan.

PROVISION_MODE gates the whole target:
  off  (default) → no provision rows are even enqueued; enable later and run
                   /api/reconcile to backfill the full desired state
  dry  → rows drain to 'sent' with a would-send audit line
  live → rows POST to {PROVISION_URL}/provision
"""
import os

import httpx


def cfg():
    return {
        "url": os.getenv("PROVISION_URL", "http://localhost:8030"),
        "mode": os.getenv("PROVISION_MODE", "off"),
    }


def deliver(event: dict) -> tuple[bool, str]:
    """POST one enrol/drop event to the provisioning service. Never raises."""
    endpoint = f"{cfg()['url']}/provision"
    try:
        r = httpx.post(endpoint, json=event, timeout=30)
        if r.is_success:
            return True, f"{r.status_code} {r.text[:200]}"
        return False, f"{r.status_code} {r.text[:300]}"
    except Exception as e:  # noqa: BLE001 — transport errors become retries
        return False, f"transport: {e}"
