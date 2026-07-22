"""Enrolment expiry sweep + group side-effect reconciliation.

Owner: Engineer 1 (expiry sweep). Thin scheduled-task entry point — the domain
logic lives in app/services/enrolment.py so this module stays a wiring layer.

Coordination seam (Engineer 1 ⇄ Yaman): the group side-effect reconciler is
implemented in the enrolment service and re-exported here so the scheduled
expiry pass can invoke it in the same tick. It is idempotent and convergent —
safe to call on every run:
  * add_member is on-conflict-do-nothing  -> repeated adds never duplicate
  * remove_members_by_provenance is a delete -> repeated removes stay OK
  * a clean system yields an empty diff -> repeated repairs converge
The reconciler introduces NO group business logic of its own; it only re-issues
the normal app/services/groups.py calls the live enrolment path uses.
"""
from app import db as _db
from app.services import enrolment as _enrol

# Re-export so schedulers can `from app.tasks.enrol_expiry import
# reconcile_group_side_effects` and call it directly.
reconcile_group_side_effects = _enrol.reconcile_group_side_effects


async def run(db=None) -> dict:
    """Scheduled entry point. `db` accepts the app.db module (default) or a
    live connection, matching the service's db-adapter contract.

    Engineer 1: add the enrolment-expiry sweep here; the reconciliation pass
    below repairs any cohort sync-group memberships the deferred post-commit
    path failed to apply.
    """
    dbx = _db if db is None else db
    group_reconciliation = await reconcile_group_side_effects(dbx)
    return {"ok": True, "group_reconciliation": group_reconciliation}
