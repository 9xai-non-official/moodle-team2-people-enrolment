"""Smoke test: the app assembles, the roles/permissions routes are registered,
and the /check endpoint is wired through to the DB layer (answering a clean 503
when no database is configured, exactly like the rest of the app)."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402  (importing runs app.db.load_dotenv())
from app.services.auth import Principal, get_current_user  # noqa: E402

# Keep these smoke tests hermetic: never open a real DB connection during the
# app lifespan, even when a populated backend/.env exists. Cleared AFTER import
# because importing app.db calls load_dotenv(), which would repopulate it.
os.environ.pop("DATABASE_URL", None)


def _as_user(uid: int):
    """Bypass credential verification for wiring tests by injecting a Principal —
    the auth mechanism itself is covered in test_check_integration.py. Returns a
    cleanup callable."""
    app.dependency_overrides[get_current_user] = lambda: Principal(user_id=uid)
    return lambda: app.dependency_overrides.pop(get_current_user, None)


def test_expected_routes_registered():
    paths = {r.path for r in app.routes}
    for expected in [
        "/api/permissions/check",
        "/api/permissions/decisions",
        "/api/permissions/dev-login",
        "/api/roles",
        "/api/roles/assignable",
        "/api/roles/capabilities",
        "/api/roles/contexts",
        "/api/roles/{role_id}/capabilities",
        "/api/roles/{role_id}/clone",
        "/api/roles/assignments",
        "/api/roles/assignments/{assignment_id}",
        "/api/roles/users/{user_id}/assignments",
    ]:
        assert expected in paths, f"route not registered: {expected}"


def test_check_endpoint_requires_authentication():
    # WP04: no credential → 401, before any DB access (hermetic).
    with TestClient(app) as client:
        r = client.post(
            "/api/permissions/check",
            json={"actor_user_id": 3, "capability": "activity:grade", "context_id": 9},
        )
        assert r.status_code == 401


def test_check_endpoint_wired_returns_503_without_db():
    # Authenticated (self-subject) but no DB → the endpoint is still wired down to
    # the DB layer, which answers a clean 503.
    cleanup = _as_user(3)
    try:
        with TestClient(app) as client:
            r = client.post(
                "/api/permissions/check",
                json={"actor_user_id": 3, "capability": "activity:grade", "context_id": 9},
            )
        assert r.status_code == 503
        assert "database" in r.text.lower()
    finally:
        cleanup()


def test_check_endpoint_validates_body():
    cleanup = _as_user(3)
    try:
        with TestClient(app) as client:
            r = client.post("/api/permissions/check", json={"capability": "x"})
        assert r.status_code == 422  # missing required actor_user_id / context_id
    finally:
        cleanup()
