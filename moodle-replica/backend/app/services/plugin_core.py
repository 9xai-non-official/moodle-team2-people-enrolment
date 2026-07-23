"""Plugin framework core (T2-PLUG-001).

Moodle's plugin model adapted to this stack: plugin CODE lives in the repo
under app/plugins/<name>/ (a package exposing MANIFEST + HANDLERS), while the
LIFECYCLE lives in the DB (M20): install/upgrade ledgered in plugin +
plugin_migration, enable/disable + settings editable at runtime via the admin
API, events delivered through the plugin_event transactional outbox.

Plugin-owned DDL is applied ONLY by the CLI (`python -m app.plugin_cli
install <name>`) — single-DDL-writer rule. install() here never runs DDL; it
verifies the ledger and refuses with a clear message if migrations are
missing.

Dispatch model: emit() writes the event INSIDE the caller's transaction, so an
event exists iff its mutation committed. dispatch_pending() claims due rows
with FOR UPDATE SKIP LOCKED — middleware, the local lifespan loop and the
pg_cron sweep can all run concurrently without a 'processing' state or
double-delivery. A failed handler backs off exponentially (30s * 2^attempts)
and goes 'dead' after MAX_ATTEMPTS. One event row fans out to every enabled
subscribed plugin, so handlers must be idempotent.
ponytail: rows stay locked while handlers run (Graph calls, seconds) — fine at
this scale; claim-then-release if throughput ever matters.
"""
import importlib
import json
import pkgutil
from pathlib import Path

from app import db

MAX_ATTEMPTS = 8
BACKOFF_BASE_SECONDS = 30

_REQUIRED_MANIFEST_KEYS = ("name", "version", "events")
_SCHEMA_FIELD_TYPES = ("text", "bool", "json", "number")


async def emit(dbx, event: str, payload: dict) -> None:
    """Queue one event. Call INSIDE the domain transaction (pass the conn) so
    the event commits or rolls back with the mutation it describes. dbx is the
    app.db module or an asyncpg connection — both expose .execute with the
    same signature (same duck-typing as services/enrolment.py)."""
    await dbx.execute(
        "insert into plugin_event (event, payload) values ($1, $2::jsonb)",
        event, json.dumps(payload or {}),
    )


# ---------------------------------------------------------------------------
# Registry — discover plugin packages under app.plugins.
# ---------------------------------------------------------------------------
def validate_manifest(mod) -> list[str]:
    """Return a list of problems (empty = valid). Pure — tier-a testable."""
    problems: list[str] = []
    manifest = getattr(mod, "MANIFEST", None)
    handlers = getattr(mod, "HANDLERS", None)
    if not isinstance(manifest, dict):
        return ["MANIFEST dict missing"]
    for key in _REQUIRED_MANIFEST_KEYS:
        if not manifest.get(key):
            problems.append(f"MANIFEST.{key} missing or empty")
    if not isinstance(handlers, dict):
        problems.append("HANDLERS dict missing")
    else:
        extra = set(handlers) - set(manifest.get("events", []))
        if extra:
            problems.append(
                f"HANDLERS for events not in MANIFEST.events: {sorted(extra)}")
    for field in manifest.get("settings_schema", []):
        if not isinstance(field, dict) or not field.get("key"):
            problems.append(f"settings_schema field without key: {field!r}")
        elif field.get("type") not in _SCHEMA_FIELD_TYPES:
            problems.append(
                f"settings_schema.{field['key']}: unknown type "
                f"{field.get('type')!r} (allowed: {_SCHEMA_FIELD_TYPES})")
    return problems


def registry() -> dict[str, object]:
    """name -> imported plugin module, for every valid plugin package."""
    import app.plugins as plugins_pkg

    found: dict[str, object] = {}
    for info in pkgutil.iter_modules(plugins_pkg.__path__):
        if not info.ispkg:
            continue
        mod = importlib.import_module(f"app.plugins.{info.name}")
        if hasattr(mod, "MANIFEST") and not validate_manifest(mod):
            found[mod.MANIFEST["name"]] = mod
    return found


def _get_plugin(name: str):
    mod = registry().get(name)
    if mod is None:
        raise LookupError(f"unknown plugin '{name}'")
    return mod


def plugin_migration_files(mod) -> list[Path]:
    """Plugin-owned *.sql files in filename order (the apply order)."""
    mig_dir = Path(mod.__path__[0]) / mod.MANIFEST.get("migrations_dir",
                                                       "migrations")
    if not mig_dir.is_dir():
        return []
    return sorted(mig_dir.glob("*.sql"))


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------
async def pending_migrations(name: str) -> list[str]:
    """Plugin migration filenames not yet in the plugin_migration ledger."""
    mod = _get_plugin(name)
    applied = {
        r["filename"] for r in await db.fetch_all(
            "select filename from plugin_migration where plugin = $1", name)
    }
    return [p.name for p in plugin_migration_files(mod) if p.name not in applied]


async def install(name: str, actor_id: int | None = None) -> dict:
    """Register/upgrade a plugin. Idempotent. NEVER runs DDL: refuses until
    the CLI has applied + ledgered every plugin-owned migration (single-DDL-
    writer rule; the CLI is the one place plugin DDL executes)."""
    mod = _get_plugin(name)
    manifest = mod.MANIFEST
    missing = await pending_migrations(name)
    if missing:
        raise RuntimeError(
            f"plugin '{name}' has unapplied migrations {missing} — run "
            f"`python -m app.plugin_cli install {name}` (CLI is the only "
            "DDL path)")
    async with db.transaction() as conn:
        await conn.execute(
            """
            insert into plugin (name, version) values ($1, $2)
            on conflict (name) do update
               set version = excluded.version, updated_at = now()
            """, name, manifest["version"])
        for cap in manifest.get("capabilities", []):
            cap_name, cap_type, min_ctx, component, risks = cap
            await conn.execute(
                """
                insert into capability
                    (name, cap_type, min_context_level, component, risks)
                values ($1, $2, $3, $4, $5)
                on conflict (name) do nothing
                """, cap_name, cap_type, min_ctx, component, risks)
        await db.audit("plugin.installed", actor_id=actor_id,
                       detail={"plugin": name, "version": manifest["version"]},
                       conn=conn)
    return {"ok": True, "plugin": name, "version": manifest["version"]}


async def set_enabled(name: str, enabled: bool,
                      actor_id: int | None = None) -> dict:
    row = await db.fetch_one(
        "update plugin set enabled = $2, updated_at = now() "
        "where name = $1 returning name, enabled", name, enabled)
    if row is None:
        raise LookupError(f"plugin '{name}' is not installed")
    await db.audit("plugin.enabled" if enabled else "plugin.disabled",
                   actor_id=actor_id, detail={"plugin": name})
    return row


def _schema(mod) -> list[dict]:
    return mod.MANIFEST.get("settings_schema", [])


def _jsonb(raw) -> dict:
    """asyncpg returns jsonb columns as strings — decode them."""
    return json.loads(raw) if isinstance(raw, str) else (raw or {})


def mask_settings(schema: list[dict], values: dict) -> dict:
    """Secret fields never leave the API — a reader learns only whether the
    value is set."""
    out = {}
    for field in schema:
        key = field["key"]
        if field.get("secret"):
            out[key] = {"set": bool(values.get(key))}
        elif key in values:
            out[key] = values[key]
        elif "default" in field:
            out[key] = field["default"]
    return out


def merge_settings(schema: list[dict], stored: dict, incoming: dict) -> dict:
    """Validate + merge a settings PUT. An omitted/blank secret keeps its
    stored value (the form round-trips masked secrets as absent). Returns the
    new full settings dict; raises ValueError on a bad payload."""
    by_key = {f["key"]: f for f in schema}
    unknown = set(incoming) - set(by_key)
    if unknown:
        raise ValueError(f"unknown settings keys: {sorted(unknown)}")
    out = dict(stored)
    for key, value in incoming.items():
        field = by_key[key]
        if field.get("secret") and value in (None, ""):
            continue  # omitted/blank secret = keep stored
        if field["type"] == "bool" and not isinstance(value, bool):
            raise ValueError(f"'{key}' must be a boolean")
        if field["type"] == "number" and not isinstance(value, (int, float)):
            raise ValueError(f"'{key}' must be a number")
        if field["type"] == "json" and isinstance(value, str):
            try:
                value = json.loads(value or "{}")
            except json.JSONDecodeError as e:
                raise ValueError(f"'{key}' is not valid JSON: {e}")
        out[key] = value
    for field in schema:
        if field.get("required") and not out.get(field["key"]):
            raise ValueError(f"'{field['key']}' is required")
    return out


async def get_settings(name: str) -> dict:
    mod = _get_plugin(name)
    row = await db.fetch_one(
        "select settings from plugin where name = $1", name)
    if row is None:
        raise LookupError(f"plugin '{name}' is not installed")
    return {"schema": _schema(mod),
            "values": mask_settings(_schema(mod), _jsonb(row["settings"]))}


async def put_settings(name: str, incoming: dict,
                       actor_id: int | None = None) -> dict:
    mod = _get_plugin(name)
    row = await db.fetch_one(
        "select settings from plugin where name = $1", name)
    if row is None:
        raise LookupError(f"plugin '{name}' is not installed")
    merged = merge_settings(_schema(mod), _jsonb(row["settings"]), incoming)
    await db.execute(
        "update plugin set settings = $2::jsonb, updated_at = now() "
        "where name = $1", name, json.dumps(merged))
    await db.audit("plugin.settings_updated", actor_id=actor_id,
                   detail={"plugin": name, "keys": sorted(incoming.keys())})
    return {"ok": True, "values": mask_settings(_schema(mod), merged)}


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
def route_handlers(event: str, enabled_plugins: dict[str, dict],
                   reg: dict[str, object]) -> list[tuple]:
    """(handler, settings) pairs for every ENABLED plugin subscribed to
    event. Pure — tier-a testable."""
    out = []
    for name, settings in enabled_plugins.items():
        mod = reg.get(name)
        if mod is None:
            continue
        handler = getattr(mod, "HANDLERS", {}).get(event)
        if handler is not None:
            out.append((handler, settings))
    return out


async def dispatch_pending(limit: int = 10) -> dict:
    """Deliver due outbox rows. Safe to call from anywhere, anytime:
    concurrent sweeps skip each other's rows (FOR UPDATE SKIP LOCKED); an
    unconfigured DB is a quiet no-op (the middleware calls this after every
    write, it must never 503)."""
    if not db.connected():
        return {"dispatched": 0, "failed": 0}
    reg = registry()
    dispatched = failed = 0
    async with db.transaction() as conn:
        rows = await conn.fetch(
            """
            select id, event, payload from plugin_event
             where status = 'pending' and next_attempt_at <= now()
             order by id
               for update skip locked
             limit $1
            """, limit)
        if not rows:
            return {"dispatched": 0, "failed": 0}
        enabled = {
            r["name"]: _jsonb(r["settings"])
            for r in await conn.fetch(
                "select name, settings from plugin where enabled")
        }
        for row in rows:
            payload = _jsonb(row["payload"])
            handlers = route_handlers(row["event"], enabled, reg)
            try:
                for handler, settings in handlers:
                    await handler(payload, settings)
                # No enabled subscriber → done too: a disabled plugin DROPS
                # its events (Moodle-alike; documented).
                await conn.execute(
                    "update plugin_event set status = 'done', "
                    "updated_at = now() where id = $1", row["id"])
                dispatched += 1
            except Exception as e:  # noqa: BLE001 — any handler error = retry
                failed += 1
                attempts_row = await conn.fetchrow(
                    """
                    update plugin_event
                       set attempts = attempts + 1,
                           last_error = $2,
                           status = case when attempts + 1 >= $3
                                         then 'dead' else 'pending' end,
                           next_attempt_at = now() + make_interval(
                               secs => $4 * pow(2, attempts + 1)),
                           updated_at = now()
                     where id = $1
                     returning attempts, status
                    """, row["id"], str(e)[:2000], MAX_ATTEMPTS,
                    float(BACKOFF_BASE_SECONDS))
                if attempts_row["status"] == "dead":
                    await db.audit("plugin.event_dead",
                                   detail={"event_id": row["id"],
                                           "event": row["event"],
                                           "error": str(e)[:500]},
                                   conn=conn)
    return {"dispatched": dispatched, "failed": failed}
