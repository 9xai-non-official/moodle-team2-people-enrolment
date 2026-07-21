// The flagship roster (task 06 §4.2). Status badge shows effective_status
// exactly as the API returns it — no client-side status logic. Row actions act
// per enrolment PATH, not per user: a user with two ways in gets two clusters.
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiDelete } from "../../api";
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

export default function ParticipantsTable({ courseId, onOpenUser }) {
  const { setActingUserId } = useActingUser();
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
