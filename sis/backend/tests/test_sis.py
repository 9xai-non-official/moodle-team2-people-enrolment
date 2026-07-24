"""Hermetic SIS suite — temp SQLite, no network, worker disabled.

Every test gets a FRESH database file (fixture below), so tests are
order-independent and parallel-safe. WHOCAN_SYNC_MODE=dry means draining marks
rows sent without any HTTP; the one 'off' test overrides per-case.
"""
import importlib
import os
import sys

import pytest
from fastapi.testclient import TestClient

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Pin every knob the tests care about so they never inherit a real .env
    # (which may set WHOCAN/PROVISION to live). Hermetic by construction.
    monkeypatch.setenv("SIS_DB_PATH", str(tmp_path / "sis-test.db"))
    monkeypatch.setenv("WHOCAN_SYNC_MODE", "dry")
    monkeypatch.setenv("PROVISION_MODE", "off")          # opt-in per test
    monkeypatch.setenv("OUTBOX_INTERVAL_SECONDS", "0")   # no background worker
    import main
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def _seed(c):
    assert c.post("/api/seed").status_code == 200


def test_health_and_seed(client):
    _seed(client)
    h = client.get("/api/health").json()
    assert h["status"] == "ok"
    assert h["counts"] == {"terms": 1, "people": 5, "courses": 6,
                           "registrations": 0}


def test_login_resolves_roles(client):
    _seed(client)
    assert client.post("/api/login", json={"sis_id": "S1001"}).json()["role"] == "student"
    assert client.post("/api/login", json={"sis_id": "T2001"}).json()["role"] == "teacher"
    admin = client.post("/api/login", json={"sis_id": "admin"}).json()
    assert admin["role"] == "admin" and admin["name"] == "Registrar"
    assert client.post("/api/login", json={"sis_id": "NOPE"}).status_code == 404


def test_offerings_catalog_shape(client):
    _seed(client)
    client.post("/api/assign", json={
        "person_sis_id": "T2001", "course_sis_id": "CRS-CS101"})
    client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})
    offs = {o["sis_id"]: o for o in
            client.get("/api/offerings", params={"person": "S1001"}).json()}
    cs = offs["CRS-CS101"]
    assert cs["instructor"] == "Tala Teacher"
    assert cs["seats"] == 1 and cs["closed"] is False
    assert cs["my_status"] == "active"
    assert offs["CRS-MATH200"]["my_status"] is None
    # teachers never consume seats
    assert offs["CRS-CS101"]["seats"] == 1


def test_capacity_reg_full(client):
    _seed(client)   # LAB090 has capacity 1
    ok = client.post("/api/register", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-LAB090"})
    assert ok.status_code == 200
    full = client.post("/api/register", json={
        "person_sis_id": "S1003", "course_sis_id": "CRS-LAB090"})
    assert full.status_code == 409 and "REG-FULL" in full.json()["detail"]
    # the seat-holder replaying their own registration is NOT a new seat
    again = client.post("/api/register", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-LAB090"})
    assert again.status_code == 200
    # closed flag shows in the catalog
    offs = {o["sis_id"]: o for o in client.get("/api/offerings").json()}
    assert offs["CRS-LAB090"]["closed"] is True


def test_schedule_for_student_and_teacher(client):
    _seed(client)
    client.post("/api/assign", json={
        "person_sis_id": "T2001", "course_sis_id": "CRS-CS101"})
    client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})
    st = client.get("/api/schedule/S1001").json()
    assert st["term"] == "FALL2026" and st["total_credits"] == 3
    assert st["rows"][0]["instructor"] == "Tala Teacher"
    assert st["rows"][0]["days"] == "ح ث خ"
    te = client.get("/api/schedule/T2001").json()
    assert te["rows"][0]["role"] == "teacher"
    assert te["rows"][0]["enrolled"] == 1


def test_register_creates_registration_and_outbox_event(client):
    _seed(client)
    r = client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"}).json()
    assert r["registration"]["status"] == "active"
    assert r["registration"]["term_code"] == "FALL2026"
    ev = r["event"]
    assert ev["type"] == "enrol" and ev["role"] == "student"
    # term rides as an OBJECT with dates — WhoCan stamps the window from it
    assert ev["term"]["code"] == "FALL2026"
    assert ev["term"]["starts_at"] == "2026-07-01"
    assert r["outbox"]["status"] == "pending"


def test_register_is_idempotent_upsert(client):
    _seed(client)
    for _ in range(3):
        client.post("/api/register", json={
            "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})
    regs = client.get("/api/registrations").json()
    assert len(regs) == 1                        # one row, not three
    ob = client.get("/api/outbox").json()
    assert ob["counts"]["pending"] == 3          # three replay-safe events


def test_assign_forces_teacher_role(client):
    _seed(client)
    r = client.post("/api/assign", json={
        "person_sis_id": "T2001", "course_sis_id": "CRS-CS101",
        "role": "student"}).json()               # caller's role is overridden
    assert r["registration"]["role"] == "teacher"
    assert r["event"]["role"] == "teacher"


def test_drop_marks_dropped_and_queues_drop_event(client):
    _seed(client)
    client.post("/api/register", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-CS101"})
    r = client.post("/api/drop", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-CS101"}).json()
    assert r["registration"]["status"] == "dropped"
    assert r["event"]["type"] == "drop"
    regs = client.get("/api/registrations").json()
    assert regs[0]["status"] == "dropped" and len(regs) == 1


def test_unknown_person_and_course_are_404(client):
    _seed(client)
    assert client.post("/api/register", json={
        "person_sis_id": "NOPE", "course_sis_id": "CRS-CS101"}).status_code == 404
    assert client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "NOPE"}).status_code == 404


def test_no_current_term_is_400(client):
    # no seed → no terms at all
    r = client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})
    assert r.status_code == 400
    assert "current term" in r.json()["detail"]


def test_drain_dry_marks_sent_and_logs_would_send(client):
    _seed(client)
    client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})
    out = client.post("/api/outbox/drain").json()
    assert out["modes"]["whocan"] == "dry"
    assert (out["processed"], out["sent"], out["failed"]) == (1, 1, 0)
    ob = client.get("/api/outbox").json()
    assert ob["counts"] == {"sent": 1}
    logs = client.get("/api/sync-log").json()
    assert logs and logs[0]["status"] == "would-send"


def test_provision_fanout_when_enabled(client, monkeypatch):
    """With PROVISION_MODE on, every enrol/drop is queued for BOTH targets;
    account events stay whocan-only (Teams has no login gate to drive)."""
    monkeypatch.setenv("PROVISION_MODE", "dry")
    _seed(client)
    r = client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"}).json()
    assert "provision_id" in r["outbox"]
    rows = client.get("/api/outbox").json()["rows"]
    assert {x["target"] for x in rows} == {"whocan", "provision"}

    out = client.post("/api/outbox/drain").json()
    assert out["processed"] == 2 and out["sent"] == 2   # both targets, dry

    client.post("/api/reconcile")
    pending = client.get("/api/outbox", params={"status": "pending"}).json()["rows"]
    import json as _json
    by_target = {}
    for row in pending:
        ev = _json.loads(row["event"])
        by_target.setdefault(row["target"], []).append(ev["type"])
    assert sorted(by_target["provision"]) == ["enrol"]          # no account events
    assert sorted(by_target["whocan"]) == ["account"] * 5 + ["enrol"]


def test_provision_off_by_default_no_fanout(client):
    _seed(client)
    r = client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"}).json()
    assert "provision_id" not in r["outbox"]
    rows = client.get("/api/outbox").json()["rows"]
    assert {x["target"] for x in rows} == {"whocan"}


def test_drain_off_skips(client, monkeypatch):
    _seed(client)
    client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})
    monkeypatch.setenv("WHOCAN_SYNC_MODE", "off")
    out = client.post("/api/outbox/drain").json()
    assert out["skipped"] == 1 and out["sent"] == 0
    assert client.get("/api/outbox").json()["counts"] == {"skipped": 1}


def test_reconcile_replays_desired_state_with_account_gate(client):
    _seed(client)
    client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"})   # active
    client.post("/api/assign", json={
        "person_sis_id": "T2001", "course_sis_id": "CRS-CS101"})   # active
    client.post("/api/register", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-CS101"})
    client.post("/api/drop", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-CS101"})   # dropped
    client.post("/api/outbox/drain")                # clear the event-driven rows

    rec = client.post("/api/reconcile").json()
    assert rec["queued"] == {"enrol": 2, "drop": 1, "account": 5}

    # account gate: registered people active; Omar (dropped everything),
    # Lina and Bilal (never registered) inactive
    import json as _json
    rows = client.get("/api/outbox", params={"status": "pending"}).json()["rows"]
    acct = {e["person"]["sis_id"]: e["active"]
            for e in (_json.loads(r["event"]) for r in rows)
            if e["type"] == "account"}
    assert acct == {"S1001": True, "T2001": True, "S1002": False,
                    "S1003": False, "T2002": False}


def test_make_current_switches_terms(client):
    _seed(client)
    client.post("/api/terms", json={
        "code": "SPRING2027", "name": "Spring 2027",
        "starts_at": "2027-01-10", "ends_at": "2027-05-20"})
    client.post("/api/terms/SPRING2027/make-current")
    terms = {t["code"]: t["is_current"] for t in client.get("/api/terms").json()}
    assert terms == {"FALL2026": 0, "SPRING2027": 1}
    # registering now lands in the new current term
    r = client.post("/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"}).json()
    assert r["registration"]["term_code"] == "SPRING2027"
