"""Plugin lifecycle CLI — the ONLY place plugin-owned DDL executes
(single-DDL-writer rule; the HTTP install endpoint refuses until this ran).

    cd moodle-replica/backend
    python -m app.plugin_cli install msteams
    python -m app.plugin_cli status

Mirrors migrations/apply.py: each plugin migration file runs in its own
transaction and is ledgered (plugin_migration) so re-runs are no-ops.
"""
import asyncio
import sys

from app import db
from app.services import plugin_core


async def _install(name: str) -> None:
    mod = plugin_core.registry().get(name)
    if mod is None:
        sys.exit(f"unknown plugin '{name}' — packages under app/plugins: "
                 f"{sorted(plugin_core.registry())}")
    manifest = mod.MANIFEST
    # The plugin row must exist before plugin_migration rows (FK).
    await db.execute(
        "insert into plugin (name, version) values ($1, $2) "
        "on conflict (name) do nothing", name, manifest["version"])
    applied = {
        r["filename"] for r in await db.fetch_all(
            "select filename from plugin_migration where plugin = $1", name)
    }
    for path in plugin_core.plugin_migration_files(mod):
        if path.name in applied:
            print(f"  = {path.name} (already applied)")
            continue
        async with db.transaction() as conn:
            await conn.execute(path.read_text())
            await conn.execute(
                "insert into plugin_migration (plugin, filename) "
                "values ($1, $2)", name, path.name)
        print(f"  + {path.name}")
    result = await plugin_core.install(name)
    print(f"ok — {name} {result['version']} installed "
          f"(enable via the Plugins page or: python -m app.plugin_cli "
          f"enable {name})")


async def _set_enabled(name: str, enabled: bool) -> None:
    row = await plugin_core.set_enabled(name, enabled)
    print(f"ok — {row['name']} enabled={row['enabled']}")


async def _status() -> None:
    reg = plugin_core.registry()
    rows = {r["name"]: r for r in await db.fetch_all(
        "select name, version, enabled from plugin")}
    for name, mod in sorted(reg.items()):
        row = rows.get(name)
        pending = await plugin_core.pending_migrations(name)
        state = (f"installed v{row['version']} enabled={row['enabled']}"
                 if row else "not installed")
        print(f"{name:12} code v{mod.MANIFEST['version']:8} {state}"
              + (f"  pending migrations: {pending}" if pending else ""))


async def _main() -> None:
    await db.connect()
    if not db.connected():
        sys.exit("DATABASE_URL not set (backend/.env)")
    try:
        match sys.argv[1:]:
            case ["install", name]:
                await _install(name)
            case ["enable", name]:
                await _set_enabled(name, True)
            case ["disable", name]:
                await _set_enabled(name, False)
            case ["status"]:
                await _status()
            case _:
                sys.exit("usage: python -m app.plugin_cli "
                         "{install|enable|disable} <name> | status")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(_main())
