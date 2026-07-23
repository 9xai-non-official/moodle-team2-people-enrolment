// Plugins admin (T2-PLUG-001) — Moodle's plugin overview adapted: registry
// list with lifecycle actions, a settings form rendered from each plugin's
// settings_schema, the event outbox, and the msteams provisioning table.
// Every mutation round-trips through the plugin:manage-gated API; refusals
// surface verbatim (same posture as every other admin page).
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import Badge from "../components/common/Badge";
import PageIntro from "../components/common/PageIntro";

const EVENT_VARIANT = { pending: "amber", done: "green", dead: "red" };

function SettingsForm({ plugin, onSaved }) {
  const [schema, setSchema] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet(`/api/plugins/${plugin}/settings`)
      .then(({ schema, values }) => {
        setSchema(schema);
        const init = {};
        for (const f of schema) {
          if (f.secret) init[f.key] = ""; // masked — blank keeps stored value
          else if (f.type === "json")
            init[f.key] = JSON.stringify(values[f.key] ?? f.default ?? {}, null, 2);
          else init[f.key] = values[f.key] ?? f.default ?? (f.type === "bool" ? false : "");
        }
        setForm(init);
      })
      .catch((e) => setError(e.message));
  }, [plugin]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {};
      for (const f of schema) {
        const v = form[f.key];
        if (f.secret && v === "") continue; // untouched secret — keep stored
        if (f.type === "number") payload[f.key] = v === "" ? null : Number(v);
        else payload[f.key] = v; // json goes as string; backend parses+validates
      }
      await apiPut(`/api/plugins/${plugin}/settings`, payload);
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e.payload?.detail ?? e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !schema) return <p className="error">{error}</p>;
  if (!schema) return <p className="muted">Loading settings…</p>;
  return (
    <div className="plugin-settings">
      {schema.map((f) => (
        <div className="form-row" key={f.key}>
          <label htmlFor={`ps-${f.key}`}>{f.label ?? f.key}</label>
          {f.type === "bool" ? (
            <input
              id={`ps-${f.key}`}
              type="checkbox"
              checked={!!form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
            />
          ) : f.type === "json" ? (
            <textarea
              id={`ps-${f.key}`}
              rows={3}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          ) : (
            <input
              id={`ps-${f.key}`}
              type={f.secret ? "password" : f.type === "number" ? "number" : "text"}
              placeholder={f.secret ? "•••••• (blank keeps current)" : undefined}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <div className="form-row">
        <button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <Badge variant="green">saved</Badge>}
        {error && <span className="error">{error}</span>}
      </div>
    </div>
  );
}

function OutboxPanel() {
  const [events, setEvents] = useState([]);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    apiGet("/api/plugins/events?limit=50")
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const dispatchNow = async () => {
    setDispatching(true);
    try {
      await apiPost("/api/plugins/dispatch");
      refresh();
    } catch (e) {
      setError(e.payload?.detail ?? e.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <section>
      <h2>
        Event outbox{" "}
        <button onClick={dispatchNow} disabled={dispatching}>
          {dispatching ? "Dispatching…" : "Run dispatch now"}
        </button>
      </h2>
      {error && <p className="error">{error}</p>}
      {!events.length && <p className="muted">No events yet — create a course.</p>}
      {events.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>id</th><th>event</th><th>status</th><th>attempts</th>
              <th>last error</th><th>created</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td><code>{e.event}</code></td>
                <td><Badge variant={EVENT_VARIANT[e.status] ?? "neutral"}>{e.status}</Badge></td>
                <td>{e.attempts}</td>
                <td className="muted">{e.last_error ?? ""}</td>
                <td className="muted">{new Date(e.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TeamsTable() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const load = () =>
      apiGet("/api/plugins/msteams/status").then(setState).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!state?.installed || !state.teams.length) return null;
  return (
    <section>
      <h2>MS Teams provisioning</h2>
      <table className="data-table">
        <thead>
          <tr><th>course</th><th>status</th><th>team (AAD group) id</th><th>error</th></tr>
        </thead>
        <tbody>
          {state.teams.map((t) => (
            <tr key={t.course_id}>
              <td>{t.full_name} <span className="muted">({t.short_name})</span></td>
              <td><Badge variant={{ pending: "amber", ready: "green", failed: "red", archived: "grey" }[t.status] ?? "neutral"}>{t.status}</Badge></td>
              <td><code>{t.aad_group_id ?? "—"}</code></td>
              <td className="muted">{t.error ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState(null);
  const [error, setError] = useState(null);
  const [openSettings, setOpenSettings] = useState(null);
  const [busy, setBusy] = useState(null);

  const refresh = useCallback(() => {
    apiGet("/api/plugins")
      .then((list) => {
        setPlugins(list);
        setError(null);
      })
      .catch((e) => setError(e.payload?.detail ?? e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const act = async (name, action) => {
    setBusy(`${name}:${action}`);
    try {
      await apiPost(`/api/plugins/${name}/${action}`);
      refresh();
    } catch (e) {
      setError(e.payload?.detail ?? e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1>Plugins</h1>
      <PageIntro line="Moodle-style plugins: code ships in the repo, lifecycle lives here.">
        <p>
          Install registers the plugin and seeds its capabilities (its DB
          migrations are CLI-applied — single DDL writer). Enable turns its
          event handlers on; a disabled plugin drops its events. Settings are
          runtime-editable; secrets are write-only.
        </p>
      </PageIntro>
      {error && <p className="error">{error}</p>}
      {!plugins && !error && <p className="muted">Loading…</p>}
      {plugins?.map((p) => (
        <section key={p.name} className="plugin-card">
          <h2>
            {p.name} <span className="muted">v{p.code_version}</span>{" "}
            {p.installed ? (
              <Badge variant={p.enabled ? "green" : "grey"}>
                {p.enabled ? "enabled" : "disabled"}
              </Badge>
            ) : (
              <Badge variant="neutral">not installed</Badge>
            )}
            {p.pending_migrations.length > 0 && (
              <Badge variant="amber" title={p.pending_migrations.join(", ")}>
                {p.pending_migrations.length} pending migration(s) — run CLI
              </Badge>
            )}
          </h2>
          <p className="muted">events: {p.events.join(", ")}</p>
          <div className="form-row">
            {!p.installed && (
              <button
                onClick={() => act(p.name, "install")}
                disabled={busy === `${p.name}:install`}
              >
                Install
              </button>
            )}
            {p.installed && !p.enabled && (
              <button onClick={() => act(p.name, "enable")}>Enable</button>
            )}
            {p.installed && p.enabled && (
              <button onClick={() => act(p.name, "disable")}>Disable</button>
            )}
            {p.installed && (
              <button
                onClick={() =>
                  setOpenSettings(openSettings === p.name ? null : p.name)
                }
              >
                {openSettings === p.name ? "Hide settings" : "Settings"}
              </button>
            )}
          </div>
          {openSettings === p.name && <SettingsForm plugin={p.name} />}
        </section>
      ))}
      <TeamsTable />
      <OutboxPanel />
    </div>
  );
}
