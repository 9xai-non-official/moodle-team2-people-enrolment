// Sign in / sign up — the front door. Mirrors Moodle's email-based
// self-registration (account → confirmation gate → sign-in) without the
// email round-trip: the confirmation "link" is a button on screen.
// One-click persona sign-ins keep the demo fast; "explore mode" keeps the
// original persona-switcher behaviour available without an account.
import { useState } from "react";
import { apiGet, apiPost } from "../api";
import { useActingUser } from "../context/ActingUser";
import { useSession } from "../context/Session";
import { PERSONAS, personaLabel } from "../lib/personas";
import ReasonList from "../components/common/ReasonList";

const QUICK = ["student.a", "teacher.a", "ta.a", "admin1"];

export default function AuthPage() {
  const { users, setActingUserId, addUser } = useActingUser();
  const { signIn } = useSession();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({});
  const [pendingUser, setPendingUser] = useState(null); // signup → confirm gate
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function finishSignIn(me, mode = "user") {
    addUser(me.user);
    setActingUserId(me.user.id);
    signIn({
      mode,
      user: me.user,
      is_admin: me.is_admin,
      teaches: me.teaches,
      enrolled: me.enrolled,
      token: me.token ?? null, // Bearer for hardened endpoints (real mode)
    });
  }

  async function doLogin(username, password) {
    setError(null);
    setBusy(true);
    try {
      finishSignIn(await apiPost("/api/auth/login", { username, password }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function doSignup(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiPost("/api/auth/signup", {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
      });
      setPendingUser(res.user);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function doConfirm() {
    setError(null);
    setBusy(true);
    try {
      await apiPost("/api/auth/confirm", { user_id: pendingUser.id });
      finishSignIn(await apiPost("/api/auth/login", { username: pendingUser.username, password: form.password }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function explore() {
    // No account — original behaviour, first user becomes the acting persona.
    const first = users[0];
    const me = first
      ? await apiGet(`/api/auth/me?user_id=${first.id}`).catch(() => null)
      : null;
    signIn({
      mode: "explore",
      user: first ?? null,
      is_admin: me?.is_admin ?? true,
      teaches: me?.teaches ?? [],
      enrolled: me?.enrolled ?? [],
    });
  }

  if (pendingUser) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand">WhoCan</div>
          <h1>Confirm your account</h1>
          <p className="muted">
            Moodle would now email <strong>{pendingUser.username}</strong> a
            confirmation link. We mock that email right here — nothing works
            until you confirm, exactly like the real thing.
          </p>
          <div className="panel">
            <div className="panel__title">📧 Mock inbox — 1 new message</div>
            <p>Hi {pendingUser.first_name}, please confirm your new account:</p>
            <button className="btn btn--primary" disabled={busy} onClick={doConfirm}>
              Confirm my account →
            </button>
          </div>
          {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          WhoCan <span className="brand__sub">people &amp; enrolment</span>
        </div>
        <p className="muted">
          A learning platform inspired by Moodle — everything you can see and
          do depends on who you are.
        </p>

        <div className="tabs">
          {["login", "signup"].map((t) => (
            <button
              key={t}
              className={`tab ${tab === t ? "tab--active" : ""}`}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(form.username, form.password);
            }}
          >
            <div className="form-col">
              <input className="input" placeholder="Username" autoComplete="username" value={form.username ?? ""} onChange={set("username")} autoFocus />
              <div className="form-row pw-row">
                <input
                  className="input input--wide"
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={form.password ?? ""}
                  onChange={set("password")}
                />
                <button type="button" className="btn" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
              <button className="btn btn--primary" disabled={busy || !form.username || !form.password}>
                Sign in
              </button>
            </div>
            <p className="muted auth-hint">
              Demo personas sign in with any password — or use one click:
            </p>
            <div className="form-row">
              {QUICK.map((u) => (
                <span key={u} className="chip" title={PERSONAS[u]?.blurb} onClick={() => doLogin(u, "demo")}>
                  {personaLabel(u)}
                </span>
              ))}
            </div>
          </form>
        ) : (
          <form onSubmit={doSignup}>
            <div className="form-col">
              <div className="form-row">
                <input className="input" placeholder="First name" value={form.first_name ?? ""} onChange={set("first_name")} autoFocus />
                <input className="input" placeholder="Last name" value={form.last_name ?? ""} onChange={set("last_name")} />
              </div>
              <input className="input" placeholder="Username" autoComplete="username" value={form.username ?? ""} onChange={set("username")} />
              <input className="input" type={showPw ? "text" : "password"} placeholder="Password" autoComplete="new-password" value={form.password ?? ""} onChange={set("password")} />
              <button
                className="btn btn--primary"
                disabled={busy || !form.username || !form.password || !form.first_name || !form.last_name}
              >
                Create account
              </button>
            </div>
            <p className="muted auth-hint">
              New accounts start with no role anywhere — you become a student
              in a course only by enrolling. That&apos;s Moodle&apos;s rule too.
            </p>
          </form>
        )}

        {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}

        <button className="auth-explore" onClick={explore}>
          Skip sign-in — explore every persona (demo mode) →
        </button>
      </div>
    </div>
  );
}
