// Roles & Permissions — MANAGER-ONLY workspace. The star tab is the Role
// Builder: a manager picks permissions from the whole capability catalogue,
// names the role, creates it, then creates an account (username + password)
// and assigns the new role. Capabilities / Assignments / Decision-log stay as
// supporting tabs. Everything is live from the backend.
import { useEffect, useState } from "react";
import { useLang } from "../context/Lang";
import { useSession } from "../context/Session";
import { RolesTabs, panelId, tabId } from "../components/roles/ui";
import RoleBuilder from "../components/roles/RoleBuilder";
import CapabilityEditor from "../components/roles/CapabilityEditor";
import AssignRoleForm from "../components/roles/AssignRoleForm";
import DecisionLog from "../components/roles/DecisionLog";

const TABS = [
  { key: "build", en: "Build role & account", ar: "بناء دور وحساب", icon: "circlePlus" },
  { key: "capabilities", en: "Role capabilities", ar: "صلاحيات الدور", icon: "shieldPlus" },
  { key: "assignments", en: "Assignments", ar: "التعيينات", icon: "users" },
  { key: "log", en: "Decision log", ar: "سجل القرارات", icon: "clipboardClock" },
];
const KEYS = TABS.map((t) => t.key);

export default function RolesPage() {
  const { lang, dir } = useLang();
  const { session } = useSession();
  const isAdmin = Boolean(session?.is_admin);

  const [active, setActive] = useState(() => {
    const saved = localStorage.getItem("roles-tab");
    return KEYS.includes(saved) ? saved : "build";
  });
  useEffect(() => {
    localStorage.setItem("roles-tab", active);
  }, [active]);

  // Manager-only page: everyone else is refused.
  if (!isAdmin) {
    return (
      <div className="roles" dir={dir} lang={lang}>
        <header className="rl-head">
          <h1 className="rl-h1"><span>Roles &amp; permissions</span></h1>
        </header>
        <div className="rl-panel" role="alert" style={{ padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Managers only</h2>
          <p style={{ color: "#5f6368" }}>
            {lang === "ar"
              ? "هذه الصفحة مخصّصة للمدراء فقط. سجّل الدخول بحساب مدير للوصول إليها."
              : "This page is restricted to site managers. Sign in as a manager to access role administration."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="roles" dir={dir} lang={lang}>
      <header className="rl-head">
        <h1 className="rl-h1">
          <span>Roles &amp; permissions</span>
          <span className="rl-h1__ar" lang="ar">الأدوار والصلاحيات</span>
        </h1>
        <p className="rl-head__lede">
          {lang === "ar"
            ? "أنشئ دورًا باختيار الصلاحيات، ثم أنشئ حسابًا وعيّن له الدور — كل البيانات من الخادم."
            : "Build a role by picking permissions, then create an account and assign it the role — all data from the backend."}
        </p>
      </header>

      <RolesTabs tabs={TABS} active={active} onChange={setActive} dir={dir} />

      <div
        className="rl-panel"
        id={panelId(active)}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        tabIndex={0}
      >
        {active === "build" && <RoleBuilder />}
        {active === "capabilities" && <CapabilityEditor />}
        {active === "assignments" && <AssignRoleForm />}
        {active === "log" && <DecisionLog onReplay={() => {}} />}
      </div>
    </div>
  );
}
