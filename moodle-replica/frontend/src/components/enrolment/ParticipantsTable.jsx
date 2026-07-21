// The flagship roster (task 06 §4.2). Status badge shows effective_status
// exactly as the API returns it — no client-side status logic. Row actions act
// per enrolment PATH, not per user: a user with two ways in gets two clusters.
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiDelete } from "../../api";
import Badge from "../common/Badge";
import DataTable from "../common/DataTable";
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

export default function ParticipantsTable({ courseId, onOpenUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const [showEnrol, setShowEnrol] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    apiGet(`/api/enrolment/courses/${courseId}/participants?status=${status}`)
      .then(setRows)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId, status]);

  const mutate = (promise) => {
    setBusy(true);
    setActionError(null);
    promise
      .then(load)
      .catch((e) => setActionError(e.message))
      .finally(() => setBusy(false));
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <button className="btn" onClick={() => onOpenUser(r.user_id, r.full_name)}>
          {r.full_name}
        </button>
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
      render: (r) => (
        <Badge
          variant={STATUS_VARIANT[r.effective_status] || "neutral"}
          title={STATUS_TITLE[r.effective_status]}
        >
          {r.effective_status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "groups",
      label: "Groups",
      render: (r) =>
        r.groups.length
          ? r.groups.map((g) => (
              <span key={g.id} className="chip">
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
          <div key={p.enrolment_id} className="form-row">
            <span className="muted">{p.method}</span>
            {p.status === "active" ? (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  mutate(
                    apiPatch(`/api/enrolment/enrolments/${p.enrolment_id}`, {
                      status: "suspended",
                    }),
                  )
                }
              >
                Suspend
              </button>
            ) : (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  mutate(
                    apiPatch(`/api/enrolment/enrolments/${p.enrolment_id}`, {
                      status: "active",
                    }),
                  )
                }
              >
                Reactivate
              </button>
            )}
            <button
              className="btn btn--danger"
              disabled={busy}
              onClick={() =>
                mutate(apiDelete(`/api/enrolment/enrolments/${p.enrolment_id}`))
              }
            >
              Unenrol
            </button>
          </div>
        )),
    },
  ];

  return (
    <div>
      <div className="form-row">
        <label>Status</label>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="all">All</option>
        </select>
        <button className="btn btn--primary" onClick={() => setShowEnrol(true)}>
          Enrol user
        </button>
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}

      <DataTable
        loading={loading}
        error={loadError}
        rows={rows}
        empty="No participants for this filter."
        rowKey={(r) => r.user_id}
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
