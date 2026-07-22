// Admin — site administration in one place: accounts and courses.
// Every power here is manager-scoped and refuses for everyone else; role
// assignment stays on the Roles page (it owns the assignable matrix),
// course requests stay on Teaching → New course.
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api";
import { useActingUser } from "../context/ActingUser";
import Badge from "../components/common/Badge";
import PageIntro from "../components/common/PageIntro";
import ReasonList from "../components/common/ReasonList";
import Tabs from "../components/common/Tabs";

const errText = (e) => (e.reasons?.length ? e.reasons : [e.message]);

function UsersTab({ actorId }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  const load = () => apiGet("/api/users").then(setUsers).catch(setError);
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(e) {
    e.preventDefault();
    setError(null);
    try {
      const u = await apiPost("/api/lms/users", { actor_id: actorId, ...form });
      setCreated(u);
      setForm({});
      setCreating(false);
      load();
    } catch (err) {
      setError(err);
    }
  }

  async function toggleSuspend(u) {
    setError(null);
    try {
      await apiPatch(`/api/lms/users/${u.id}`, { actor_id: actorId, suspended: !u.suspended });
      load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <div className="form-row">
        <h3 style={{ margin: 0 }}>Accounts</h3>
        <span style={{ flex: 1 }} />
        <button className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
          + Create user
        </button>
      </div>
      {creating && (
        <form className="panel panel--attention" onSubmit={create}>
          <div className="panel__title">New account</div>
          <div className="form-row">
            <input className="input" placeholder="First name" value={form.first_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} autoFocus />
            <input className="input" placeholder="Last name" value={form.last_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            <input className="input" placeholder="Username" value={form.username ?? ""} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            <input className="input" placeholder="Initial password" value={form.password ?? ""} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <button className="btn btn--primary" disabled={!form.username || !form.password || !form.first_name || !form.last_name}>
              Create
            </button>
          </div>
          <p className="muted">
            Admin-created accounts work immediately — the confirmation-email
            gate belongs to self-registration only (Moodle&apos;s rule).
          </p>
        </form>
      )}
      {created && (
        <p className="muted">
          ✓ {created.full_name} can sign in right now as <code>{created.username}</code> —
          no role anywhere until enrolled or assigned one.
        </p>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>who</th>
              <th>username</th>
              <th>account</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>
                  <code>{u.username}</code>
                </td>
                <td>
                  <Badge variant={u.suspended ? "red" : "green"}>
                    {u.suspended ? "suspended" : "active"}
                  </Badge>
                </td>
                <td>
                  <div className="cell-actions">
                    <button
                      className={`btn btn--sm ${u.suspended ? "" : "btn--danger"}`}
                      title={
                        u.suspended
                          ? "Reactivate: they can sign in again — nothing was lost while suspended"
                          : "Suspend site-wide: sign-in refused, but enrolments, grades and completions stay untouched"
                      }
                      onClick={() => toggleSuspend(u)}
                    >
                      {u.suspended ? "reactivate" : "suspend"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <ReasonList reasons={errText(error)} />}
      <p className="muted">
        Role assignment lives on the <strong>Roles</strong> page (assignable
        matrix); course requests on <strong>Teaching → New course</strong>.
      </p>
    </>
  );
}

function CoursesTab({ actorId }) {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const load = () =>
    apiGet("/api/courses?include_deleted=1").then(setCourses).catch(setError);
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/lms/courses", { actor_id: actorId, ...form });
      setForm({});
      load();
    } catch (err) {
      setError(err);
    }
  }

  async function act(fn) {
    setError(null);
    setNote(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <form className="form-row" onSubmit={create}>
        <input className="input" placeholder="Full name" value={form.full_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
        <input className="input" placeholder="Short name" value={form.short_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value }))} />
        <button className="btn btn--primary" disabled={!form.full_name || !form.short_name}>
          Create course
        </button>
        <span className="muted">managers create directly (moodle/course:create) — teachers request</span>
      </form>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>course</th>
              <th>state</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.short_name}</strong> <span className="muted">{c.full_name}</span>
                </td>
                <td>
                  {c.deleted ? (
                    <Badge variant="amber" title="snapshots and completions survive — Progress → History">
                      deleted
                    </Badge>
                  ) : c.visible ? (
                    <Badge variant="green">visible</Badge>
                  ) : (
                    <Badge variant="grey">hidden from catalog</Badge>
                  )}
                </td>
                <td>
                  {!c.deleted && (
                    <div className="cell-actions">
                      <button
                        className="btn btn--sm"
                        title={c.visible ? "Hide from the catalog — contents untouched" : "Show in the catalog again"}
                        onClick={() => act(() => apiPatch(`/api/lms/courses/${c.id}`, { actor_id: actorId, visible: !c.visible }))}
                      >
                        {c.visible ? "hide" : "show"}
                      </button>
                      <button
                        className="btn btn--sm btn--danger"
                        title="Soft-delete: the course disappears everywhere, but completions and snapshots survive (hard case 5)"
                        onClick={() =>
                          act(async () => {
                            const res = await apiDelete(`/api/lms/courses/${c.id}?actor_id=${actorId}`);
                            setNote(res?.note ?? null);
                          })
                        }
                      >
                        delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <div className="panel">{note}</div>}
      {error && <ReasonList reasons={errText(error)} />}
    </>
  );
}

export default function AdminPage() {
  const { actingUser } = useActingUser();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("Users");

  useEffect(() => {
    if (!actingUser) return;
    apiGet(`/api/auth/me?user_id=${actingUser.id}`).then(setMe).catch(() => setMe(null));
  }, [actingUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!actingUser || !me) return null;
  if (!me.is_admin)
    return (
      <div>
        <h1>Admin</h1>
        <ReasonList
          reasons={[
            `${actingUser.full_name} is not a manager — site administration needs a manager role at the System context`,
          ]}
        />
      </div>
    );

  return (
    <div>
      <h1>Admin</h1>
      <PageIntro line="Accounts and courses, site-wide — every other power stays with the page that owns it." />
      <Tabs tabs={["Users", "Courses"]} active={tab} onChange={setTab} />
      {tab === "Users" && <UsersTab actorId={actingUser.id} />}
      {tab === "Courses" && <CoursesTab actorId={actingUser.id} />}
    </div>
  );
}
