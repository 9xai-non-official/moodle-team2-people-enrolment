// Sign in / sign up — the front door. Mirrors Moodle's email-based
// self-registration (account → confirmation gate → sign-in) without the
// email round-trip: the confirmation "link" is a button on screen.
// One-click persona sign-ins keep the demo fast; "explore mode" keeps the
// original persona-switcher behaviour available without an account.
//
// Bilingual (EN | AR) presentation matches the approved login mockup
// (deliverables/frontend-mockups/01-login.png): split layout — form on the
// left, the branded 3D illustration on the right.
import { useState } from "react";
import { apiGet, apiPost } from "../api";
import { useActingUser } from "../context/ActingUser";
import { useSession } from "../context/Session";
import { PERSONAS } from "../lib/personas";
import ReasonList from "../components/common/ReasonList";
import LoginArt from "./LoginArt";

// Seed personas accept any non-empty password (mocks/lms.js). This constant
// makes that contract explicit instead of hiding it behind a magic string.
const DEMO_PASSWORD = "demo";

// One-click demo sign-ins, in the order the mockup shows them.
const PERSONA_CARDS = [
  { user: "student.a", en: "Student", ar: "طالب", tone: "blue", icon: "cap" },
  { user: "teacher.a", en: "Teacher", ar: "مدرس", tone: "orange", icon: "teacher" },
  { user: "ta.a", en: "TA", ar: "مساعد مدرس", tone: "purple", icon: "cap" },
  { user: "admin1", en: "Admin", ar: "مدير", tone: "blue", icon: "shield" },
];

/* ---- inline brand icons (currentColor, no external deps) ---------------- */
function LogoMark() {
  return (
    <svg className="lf-logo-mark" viewBox="0 0 48 40" aria-hidden="true">
      {/* three figures: blue · orange · blue */}
      <circle cx="24" cy="7" r="5.5" fill="#ef7d2e" />
      <path d="M14 30c0-6 4.5-10 10-10s10 4 10 10v3H14z" fill="#ef7d2e" />
      <circle cx="9" cy="11" r="4.5" fill="#2f6fd6" />
      <path d="M1 32c0-5 3.6-8.5 8-8.5s8 3.5 8 8.5v2H1z" fill="#2f6fd6" />
      <circle cx="39" cy="11" r="4.5" fill="#22285f" />
      <path d="M31 32c0-5 3.6-8.5 8-8.5s8 3.5 8 8.5v2H31z" fill="#22285f" />
    </svg>
  );
}
function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function EyeIcon({ off, ...props }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c5.5 0 9 6 9 6a15 15 0 0 1-3 3.6M6.5 7.9A15 15 0 0 0 3 12s3.5 6 9 6a9 9 0 0 0 3.4-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 6c5.5 0 9 6 9 6s-3.5 6-9 6-9-6-9-6 3.5-6 9-6z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function SendIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}
function PersonaGlyph({ kind }) {
  if (kind === "teacher") {
    return (
      <svg className="lf-persona__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="12" rx="1.5" />
        <path d="M7 20h10M12 15v5" />
        <path d="M7 8h6M7 11h4" />
      </svg>
    );
  }
  if (kind === "shield") {
    return (
      <svg className="lf-persona__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  // graduation cap
  return (
    <svg className="lf-persona__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9l10-4 10 4-10 4z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v5" />
    </svg>
  );
}

export default function AuthPage() {
  const { users, setActingUserId, addUser } = useActingUser();
  const { signIn } = useSession();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [pendingUser, setPendingUser] = useState(null); // signup → confirm gate
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function finishSignIn(me) {
    addUser(me.user);
    setActingUserId(me.user.id);
    signIn({ mode: "user", user: me.user, is_admin: me.is_admin, teaches: me.teaches, enrolled: me.enrolled });
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
    setError(null);
    setBusy(true);
    try {
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
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const Brand = (
    <div className="lf-brand">
      <div className="lf-brand__row">
        <LogoMark />
        <div className="lf-wordmark">
          <span className="lf-wordmark__who">Who</span>
          <span className="lf-wordmark__can">Can</span>
        </div>
      </div>
      <div className="lf-tagline">
        people &amp; enrolment
        <span className="lf-sep">|</span>
        <span className="lf-ar">الأشخاص والتسجيل</span>
      </div>
    </div>
  );

  function ArtSide() {
    return (
      <aside className="login__art-side">
        <LoginArt />
      </aside>
    );
  }

  // signup → email-confirmation gate
  if (pendingUser) {
    return (
      <div className="login">
        <div className="login__form-side">
          <div className="login__card">
            {Brand}
            <h1 className="lf-h1">
              Confirm your account <span className="lf-ar">تأكيد الحساب</span>
            </h1>
            <p className="lf-muted">
              Moodle would now email <strong>{pendingUser.username}</strong> a
              confirmation link. We mock that email right here — nothing works
              until you confirm, exactly like the real thing.
            </p>
            <div className="lf-inbox">
              <div className="lf-inbox__title">📧 Mock inbox — 1 new message</div>
              <p>Hi {pendingUser.first_name}, please confirm your new account:</p>
              <button className="lf-submit" disabled={busy} onClick={doConfirm}>
                Confirm my account <span className="lf-sep">|</span>
                <span className="lf-ar">أكِّد حسابي</span> →
              </button>
            </div>
            {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}
          </div>
        </div>
        <ArtSide />
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__form-side">
        <div className="login__card">
          {Brand}

          <div className="lf-tabs" role="tablist">
            {[
              { id: "login", en: "Sign in", ar: "تسجيل الدخول" },
              { id: "signup", en: "Create account", ar: "إنشاء حساب" },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`lf-tab ${tab === t.id ? "lf-tab--active" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  setError(null);
                }}
              >
                {t.en}
                <span className="lf-ar">{t.ar}</span>
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
              <div className="lf-field">
                <label className="lf-label" htmlFor="lf-username">
                  Username <span className="lf-sep">|</span> <span className="lf-ar">اسم المستخدم</span>
                </label>
                <div className="lf-input-wrap">
                  <UserIcon className="lf-input-icon" />
                  <input
                    id="lf-username"
                    className="lf-input"
                    placeholder="Username | اسم المستخدم"
                    autoComplete="username"
                    value={form.username ?? ""}
                    onChange={set("username")}
                    autoFocus
                  />
                </div>
              </div>

              <div className="lf-field">
                <label className="lf-label" htmlFor="lf-password">
                  Password <span className="lf-sep">|</span> <span className="lf-ar">كلمة المرور</span>
                </label>
                <div className="lf-input-wrap">
                  <LockIcon className="lf-input-icon" />
                  <input
                    id="lf-password"
                    className="lf-input lf-input--pw"
                    type={showPw ? "text" : "password"}
                    placeholder="Password | كلمة المرور"
                    autoComplete="current-password"
                    value={form.password ?? ""}
                    onChange={set("password")}
                  />
                  <button
                    type="button"
                    className="lf-eye"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((v) => !v)}
                  >
                    <EyeIcon off={showPw} width="20" height="20" />
                  </button>
                </div>
              </div>

              <button className="lf-submit" disabled={busy || !form.username || !form.password}>
                Sign in <span className="lf-sep">|</span> <span className="lf-ar">دخول</span>
              </button>

              <div className="lf-divider">
                Demo personas <span className="lf-sep">|</span>
                <span className="lf-ar">حسابات تجريبية</span>
              </div>

              <div className="lf-personas">
                {PERSONA_CARDS.map((p) => (
                  <button
                    key={p.user}
                    type="button"
                    className={`lf-persona lf-persona--${p.tone}`}
                    title={PERSONAS[p.user]?.blurb}
                    disabled={busy}
                    onClick={() => doLogin(p.user, DEMO_PASSWORD)}
                  >
                    <PersonaGlyph kind={p.icon} />
                    <span className="lf-persona__label">
                      {p.en} <span className="lf-sep">|</span>{" "}
                      <span className="lf-persona__ar">{p.ar}</span>
                    </span>
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <form onSubmit={doSignup}>
              <div className="lf-row">
                <div className="lf-field">
                  <label className="lf-label" htmlFor="lf-first">
                    First name <span className="lf-sep">|</span> <span className="lf-ar">الاسم الأول</span>
                  </label>
                  <div className="lf-input-wrap">
                    <input id="lf-first" className="lf-input lf-input--bare" placeholder="First name | الاسم الأول" value={form.first_name ?? ""} onChange={set("first_name")} autoFocus />
                  </div>
                </div>
                <div className="lf-field">
                  <label className="lf-label" htmlFor="lf-last">
                    Last name <span className="lf-sep">|</span> <span className="lf-ar">اسم العائلة</span>
                  </label>
                  <div className="lf-input-wrap">
                    <input id="lf-last" className="lf-input lf-input--bare" placeholder="Last name | اسم العائلة" value={form.last_name ?? ""} onChange={set("last_name")} />
                  </div>
                </div>
              </div>

              <div className="lf-field">
                <label className="lf-label" htmlFor="lf-su-username">
                  Username <span className="lf-sep">|</span> <span className="lf-ar">اسم المستخدم</span>
                </label>
                <div className="lf-input-wrap">
                  <UserIcon className="lf-input-icon" />
                  <input id="lf-su-username" className="lf-input" placeholder="Username | اسم المستخدم" autoComplete="username" value={form.username ?? ""} onChange={set("username")} />
                </div>
              </div>

              <div className="lf-field">
                <label className="lf-label" htmlFor="lf-su-password">
                  Password <span className="lf-sep">|</span> <span className="lf-ar">كلمة المرور</span>
                </label>
                <div className="lf-input-wrap">
                  <LockIcon className="lf-input-icon" />
                  <input
                    id="lf-su-password"
                    className="lf-input lf-input--pw"
                    type={showPw ? "text" : "password"}
                    placeholder="Password | كلمة المرور"
                    autoComplete="new-password"
                    value={form.password ?? ""}
                    onChange={set("password")}
                  />
                  <button type="button" className="lf-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>
                    <EyeIcon off={showPw} width="20" height="20" />
                  </button>
                </div>
              </div>

              <button
                className="lf-submit"
                disabled={busy || !form.username || !form.password || !form.first_name || !form.last_name}
              >
                Create account <span className="lf-sep">|</span> <span className="lf-ar">إنشاء حساب</span>
              </button>

              <p className="lf-hint">
                New accounts start with no role anywhere — you become a student
                in a course only by enrolling. That&apos;s Moodle&apos;s rule too.
              </p>
            </form>
          )}

          {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}

          <button className="lf-skip" onClick={explore}>
            <span className="lf-skip__icon">
              <SendIcon />
            </span>
            <span className="lf-skip__text">
              <span className="lf-skip__title">
                Skip sign-in — explore demo mode <span className="lf-sep">|</span>{" "}
                <span className="lf-ar">تخطِّي الدخول — استكشف الوضع التجريبي</span>
              </span>
              <span className="lf-skip__sub">
                Everything you can see and do depends on who you are <span className="lf-sep">|</span>{" "}
                <span className="lf-ar">كل ما تراه وما يمكنك فعله يعتمد على هويتك</span>
              </span>
            </span>
          </button>
        </div>
      </div>
      <ArtSide />
    </div>
  );
}
