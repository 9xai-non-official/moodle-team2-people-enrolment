// Manager-only role builder + account creator.
// Flow: pick permissions (all capabilities in the system) → name the role →
// create it (grants every picked capability at the system context) → create a
// user account (username + password) and assign the new role to it.
//
// All data is live from the backend: GET /api/roles/capabilities (the picker),
// POST /api/roles + PUT /api/roles/{id}/capabilities (build), POST
// /api/auth/signup + /confirm + POST /api/roles/assignments (account).
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "../../api";
import { capExplain } from "../../lib/capabilityInfo";

const slug = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export default function RoleBuilder() {
  const [caps, setCaps] = useState([]);
  const [sysCtx, setSysCtx] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [roleName, setRoleName] = useState("");
  const [createdRole, setCreatedRole] = useState(null);
  const [acc, setAcc] = useState({ username: "", password: "", first_name: "", last_name: "" });
  const [createdUser, setCreatedUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    Promise.all([apiGet("/api/roles/capabilities"), apiGet("/api/roles/contexts")])
      .then(([cs, ctxs]) => {
        setCaps(cs || []);
        setSysCtx((ctxs || []).find((c) => c.level === "system")?.id ?? null);
      })
      .catch((e) => setError(e.message || String(e)));
  }, []);

  const groups = useMemo(() => {
    const g = {};
    for (const c of caps) (g[c.component || "core"] ||= []).push(c);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [caps]);

  const shortName = slug(roleName);
  const err = (e) => setError(e.reasons?.join("; ") || e.message || String(e));

  const toggle = (name) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  const toggleGroup = (names, on) =>
    setSelected((s) => {
      const n = new Set(s);
      names.forEach((x) => (on ? n.add(x) : n.delete(x)));
      return n;
    });

  async function createRole() {
    setError(null); setNotice(null);
    if (!roleName.trim()) return setError("Give the role a name.");
    if (!shortName) return setError("Role name must contain letters or digits.");
    if (selected.size === 0) return setError("Pick at least one permission.");
    if (sysCtx == null) return setError("No system context found — cannot grant permissions.");
    setBusy(true);
    try {
      const role = await apiPost("/api/roles", {
        short_name: shortName,
        name: roleName.trim(),
        description: `Custom role — ${selected.size} permission(s)`,
        archetype: null,
      });
      for (const cap of selected) {
        await apiPut(`/api/roles/${role.id}/capabilities`, {
          context_id: sysCtx, capability: cap, permission: "allow",
        });
      }
      setCreatedRole(role);
      setNotice(`✅ Role “${role.name}” created with ${selected.size} permission(s).`);
    } catch (e) { err(e); } finally { setBusy(false); }
  }

  async function createAccount() {
    setError(null);
    if (!createdRole) return setError("Create the role first.");
    const { username, password, first_name, last_name } = acc;
    if (!username.trim() || !password || !first_name.trim() || !last_name.trim())
      return setError("Username, password, first and last name are all required.");
    setBusy(true);
    try {
      const { user } = await apiPost("/api/auth/signup", {
        username: username.trim(), password,
        first_name: first_name.trim(), last_name: last_name.trim(),
      });
      await apiPost("/api/auth/confirm", { user_id: user.id }); // activate → can sign in
      await apiPost("/api/roles/assignments", {
        user_id: user.id, role_id: createdRole.id, context_id: sysCtx,
      });
      setCreatedUser(user);
      setNotice(`✅ Account “${username}” created and assigned role “${createdRole.name}”.`);
    } catch (e) { err(e); } finally { setBusy(false); }
  }

  const box = { border: "1px solid var(--border,#d5d8de)", borderRadius: 10, padding: "1rem 1.15rem", marginBottom: "1rem" };
  const inp = { padding: ".5rem .6rem", borderRadius: 6, border: "1px solid #c7cad0", minWidth: 220 };

  return (
    <div>
      {error && <div className="rl-error" style={{ color: "#c5221f", marginBottom: ".75rem" }}>⚠ {error}</div>}
      {notice && <div style={{ color: "#137333", marginBottom: ".75rem" }}>{notice}</div>}

      {/* Step 1 — build the role */}
      <section style={box}>
        <h3 style={{ marginTop: 0 }}>1 · Build a role</h3>
        <div style={{ display: "flex", gap: ".75rem", alignItems: "center", flexWrap: "wrap", marginBottom: ".75rem" }}>
          <input style={inp} placeholder="Role name (e.g. Lab Assistant)"
                 value={roleName} onChange={(e) => setRoleName(e.target.value)} disabled={!!createdRole} />
          <span style={{ color: "#5f6368", fontSize: ".85rem" }}>
            id: <code>{shortName || "—"}</code> · {selected.size} permission(s) picked
          </span>
        </div>

        <div style={{ maxHeight: 340, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: ".5rem" }}>
          {groups.map(([comp, list]) => {
            const names = list.map((c) => c.name);
            const allOn = names.every((n) => selected.has(n));
            return (
              <div key={comp} style={{ marginBottom: ".5rem" }}>
                <div style={{ fontWeight: 700, fontSize: ".8rem", textTransform: "uppercase", color: "#5f6368", display: "flex", gap: ".5rem" }}>
                  <label><input type="checkbox" checked={allOn} disabled={!!createdRole}
                                onChange={(e) => toggleGroup(names, e.target.checked)} /> {comp}</label>
                </div>
                {list.map((c) => (
                  <label key={c.name} title={c.risks?.length ? `risks: ${c.risks.join(", ")}` : ""}
                         style={{ display: "inline-flex", gap: ".4rem", alignItems: "flex-start", verticalAlign: "top", width: 320, fontSize: ".85rem", padding: ".25rem 0" }}>
                    <input type="checkbox" checked={selected.has(c.name)} disabled={!!createdRole}
                           onChange={() => toggle(c.name)} style={{ marginTop: ".2rem", flex: "0 0 auto" }} />
                    <span style={{ display: "flex", flexDirection: "column", gap: ".1rem", minWidth: 0 }}>
                      <span>{c.name} <em style={{ color: "#9aa0a6" }}>({c.cap_type})</em></span>
                      <span style={{ color: "#8a8f98", fontSize: ".76rem", lineHeight: 1.3 }}>{capExplain(c)}</span>
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        {!createdRole && (
          <button className="btn btn--primary" style={{ marginTop: ".75rem" }} disabled={busy} onClick={createRole}>
            {busy ? "Creating…" : "Create role"}
          </button>
        )}
      </section>

      {/* Step 2 — create the account */}
      <section style={{ ...box, opacity: createdRole ? 1 : 0.5 }}>
        <h3 style={{ marginTop: 0 }}>2 · Create an account with this role</h3>
        {!createdRole && <p style={{ color: "#5f6368" }}>Create the role first.</p>}
        {createdRole && !createdUser && (
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
            <input style={inp} placeholder="First name" value={acc.first_name} onChange={(e) => setAcc({ ...acc, first_name: e.target.value })} />
            <input style={inp} placeholder="Last name" value={acc.last_name} onChange={(e) => setAcc({ ...acc, last_name: e.target.value })} />
            <input style={inp} placeholder="Username" value={acc.username} onChange={(e) => setAcc({ ...acc, username: e.target.value })} />
            <input style={inp} type="password" placeholder="Password" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} />
            <button className="btn btn--primary" disabled={busy} onClick={createAccount}>
              {busy ? "Creating…" : `Create account & assign “${createdRole.name}”`}
            </button>
          </div>
        )}
        {createdUser && (
          <p style={{ color: "#137333" }}>
            Account <strong>{createdUser.username}</strong> created, confirmed, and assigned
            <strong> {createdRole.name}</strong>. They can sign in with the username and password.
          </p>
        )}
      </section>
    </div>
  );
}
