// The flagship roster (task 06 §4.2). Status badge shows effective_status
// exactly as the API returns it — no client-side status logic. Row actions act
// per enrolment PATH, not per user: a user with two ways in gets two clusters.
//
// LIVENESS IS NEVER COMPUTED HERE. `path.live` is the server's own answer to
// the four §6.2 conditions (schemas_enrolment.py:82) and `effective_status` is
// the folded badge value. Both are read, never re-derived — a second liveness
// rule in the client is exactly the drift this table exists to avoid.
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiDelete, ApiError } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import Badge from "../common/Badge";
import DataTable from "../common/DataTable";
import ExportCsvButton from "../common/ExportCsvButton";
import EnrolUserModal from "./EnrolUserModal";

const STATUS_VARIANT = {
  active: "green",
  suspended: "grey",
  expired: "amber",
  method_disabled: "amber",
  account_suspended: "red",
};

// C-6: account-suspended users show RED yet stay on the roster.
const STATUS_TITLE = {
  account_suspended: "account suspended — remains on the roster",
};

const fmtAccess = (iso) => (iso ? new Date(iso).toLocaleDateString() : "never");

// An active cohort path is owned by the cohort sync, not by the operator:
// deleting the row by hand just means the next sync puts it back (HC-01).
// The correct lever is removing the person from the cohort, or disabling the
// method instance. Both inputs are the SERVER's — p.method and p.live — so
// this is reading the contract, not re-deriving liveness.
//
// NOTE: this is a UI guard only. The backend does not currently refuse a
// cohort-path unenrol (services/enrolment.py:unenrol_user removes by
// component+item_id whatever the method), so a direct API call still goes
// through. Backend refusal + reason is requested in the handover.
const isSyncOwnedPath = (p) => p.method === "cohort" && p.live;
const SYNC_OWNED_REASON =
  "This path is maintained by the cohort sync — removing it here would be " +
  "undone on the next sync. Remove the user from the cohort, or disable the " +
  "method instance, instead.";

export default function ParticipantsTable({ courseId, onOpenUser, onNavigate }) {
  const { setActingUserId } = useActingUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const [showEnrol, setShowEnrol] = useState(false);
  const [lastChanged, setLastChanged] = useState(null); // user id to flash

  // counts of the rows the API returned for the current filter — presentation
  // only, no status logic (that all lives server-side in effective_status).
  const activeCount = rows.filter((r) => r.effective_status === "active").length;
  const acctSuspCount = rows.filter((r) => r.effective_status === "account_suspended").length;
  const dualPathCount = rows.filter((r) => (r.paths?.length ?? 0) > 1).length;
  const summary = rows.length
    ? [
        `${rows.length} ${rows.length === 1 ? "person" : "people"}`,
        `${activeCount} active`,
        acctSuspCount && `${acctSuspCount} suspended account${acctSuspCount === 1 ? "" : "s"}`,
        dualPathCount && `${dualPathCount} dual-path`,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const load = () => {
    setLoading(true);
    setLoadError(null);
    apiGet(`/api/enrolment/courses/${courseId}/participants?status=${status}`)
      .then(setRows)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId, status]);

  const mutate = (promise, userId) => {
    setBusy(true);
    setActionError(null);
    promise
      .then(() => {
        load();
        if (userId != null) {
          setLastChanged(userId);
          setTimeout(() => setLastChanged(null), 900); // clears the flash class
        }
      })
      .catch((e) =>
        // Show the server's own reason, not just the transport message —
        // a 409 "user is not enrolled via this method" is the useful half.
        setActionError(
          e instanceof ApiError && e.reasons?.length
            ? e.reasons.join(" · ")
            : e.message,
        ),
      )
      .finally(() => setBusy(false));
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <span>
          <button className="btn" onClick={() => onOpenUser(r.user_id, r.full_name)}>
            {r.full_name}
          </button>
          <button
            className="btn"
            title="switch the whole app to this persona"
            onClick={() => setActingUserId(r.user_id)}
          >
            Act as
          </button>
        </span>
      ),
    },
    { key: "roles", label: "Roles", render: (r) => r.roles.join(", ") || "—" },
    {
      key: "methods",
      label: "Method(s)",
      render: (r) =>
        r.paths.map((p) => (
          <Badge key={p.enrolment_id} variant="neutral">
            {p.method}
          </Badge>
        )),
    },
    {
      key: "status",
      label: "Status",
      // clicking the badge answers "why this status?" — the paths drawer IS
      // the explanation (per-path state + liveness + rollup)
      render: (r) => (
        <span
          style={{ cursor: "help" }}
          title="why? click for this user's enrolment paths"
          onClick={() => onOpenUser(r.user_id, r.full_name)}
        >
        <Badge
          variant={STATUS_VARIANT[r.effective_status] || "neutral"}
          title={STATUS_TITLE[r.effective_status]}
        >
          {r.effective_status.replace(/_/g, " ")}
        </Badge>
        </span>
      ),
    },
    {
      key: "groups",
      label: "Groups",
      render: (r) =>
        r.groups.length
          ? r.groups.map((g) => (
              <span
                key={g.id}
                className="chip"
                style={onNavigate ? { cursor: "pointer" } : undefined}
                title="open the Groups page"
                onClick={onNavigate ? () => onNavigate("Groups") : undefined}
              >
                {g.name}
              </span>
            ))
          : "—",
    },
    {
      key: "last_access",
      label: "Last access",
      render: (r) => fmtAccess(r.last_access),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        r.paths.map((p) => (
          <div key={p.enrolment_id} className="form-row path-actions">
            <span className="muted">{p.method}</span>
            {p.status === "active" ? (
              <button
                className="btn"
                title={`${p.method} path`}
                disabled={busy}
                onClick={() =>
                  mutate(
                    apiPatch(`/api/enrolment/enrolments/${p.enrolment_id}`, {
                      status: "suspended",
                    }),
                    r.user_id,
                  )
                }
              >
                Suspend
              </button>
            ) : (
              <button
                className="btn"
                title={`${p.method} path`}
                disabled={busy}
                onClick={() =>
                  mutate(
                    apiPatch(`/api/enrolment/enrolments/${p.enrolment_id}`, {
                      status: "active",
                    }),
                    r.user_id,
                  )
                }
              >
                Reactivate
              </button>
            )}
            <button
              className="btn btn--danger"
              title={isSyncOwnedPath(p) ? SYNC_OWNED_REASON : `${p.method} path`}
              disabled={busy || isSyncOwnedPath(p)}
              onClick={() =>
                window.confirm(
                  `Unenrol this ${p.method} path?\n\nIf it's their last path they ` +
                  "leave the course roster — but their completion records survive " +
                  "and progress resumes if they return (hard case #2).",
                ) && mutate(apiDelete(`/api/enrolment/enrolments/${p.enrolment_id}`), r.user_id)
              }
            >
              Unenrol
            </button>
            {isSyncOwnedPath(p) && (
              <span className="muted" title={SYNC_OWNED_REASON}>
                sync-managed
              </span>
            )}
          </div>
        )),
    },
  ];

  // counts are only sound when every status is loaded (the 'all' filter);
  // under a narrowed filter the other buckets aren't in `rows`, so stay plain.
  const showCounts = status === "all";

  return (
    <div className="roster">
      <div className="form-row">
        <label>Status</label>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">{showCounts ? `Active (${activeCount})` : "Active"}</option>
          <option value="suspended">Suspended</option>
          <option value="all">{showCounts ? `All (${rows.length})` : "All"}</option>
        </select>
        <button className="btn btn--primary" onClick={() => setShowEnrol(true)}>
          Enrol user
        </button>
        <ExportCsvButton
          filename={`participants-course-${courseId}-${status}.csv`}
          rows={rows}
          columns={[
            { key: "username", label: "username" },
            { key: "full_name", label: "name" },
            { key: "roles", label: "roles", value: (r) => (r.roles ?? []).join("|") },
            {
              key: "paths",
              label: "methods",
              value: (r) => (r.paths ?? []).map((p) => `${p.method}:${p.status}`).join("|"),
            },
            { key: "effective_status", label: "effective_status" },
            { key: "groups", label: "groups", value: (r) => (r.groups ?? []).map((g) => g.name).join("|") },
            { key: "last_access", label: "last_access" },
          ]}
        />
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}

      {summary && (
        <div
          className="roster-summary muted"
          title="counts of the rows loaded for this filter — presentation only"
        >
          {summary}
        </div>
      )}

      <DataTable
        loading={loading}
        error={loadError}
        rows={rows}
        empty={
          <span>
            No participants for this filter — try{" "}
            <button className="btn" onClick={() => setStatus("all")}>
              show all statuses
            </button>{" "}
            or{" "}
            <button className="btn btn--primary" onClick={() => setShowEnrol(true)}>
              enrol someone
            </button>
          </span>
        }
        rowKey={(r) => r.user_id}
        rowClassName={(r) => (r.user_id === lastChanged ? "row--flash" : "")}
        columns={columns}
      />

      <EnrolUserModal
        open={showEnrol}
        courseId={courseId}
        onClose={() => setShowEnrol(false)}
        onEnrolled={() => {
          setShowEnrol(false);
          load();
        }}
      />
    </div>
  );
}
