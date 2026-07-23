// Roles & Permissions — the security-sensitive workspace. Five tabs over one
// domain, on the shared WhoCan shell (sidebar / header / theme / language come
// from App.jsx; this page owns only its content region). It sets its own `dir`
// because the shell forces `.content` to LTR for every page but the Dashboard.
//
// The Permission Checker is the star and the default tab. A Decision Log row
// can be REPLAYED: it prefills the checker with the stored inputs and re-runs.
import { useEffect, useState } from "react";
import { useLang } from "../context/Lang";
import { RolesTabs, panelId, tabId } from "../components/roles/ui";
import PermissionChecker from "../components/roles/PermissionChecker";
import CapabilityEditor from "../components/roles/CapabilityEditor";
import AssignRoleForm from "../components/roles/AssignRoleForm";
import DecisionLog from "../components/roles/DecisionLog";
import RoleCreateForm from "../components/roles/RoleCreateForm";

const TABS = [
  { key: "checker", en: "Permission checker", ar: "فاحص الصلاحيات", icon: "shieldSearch" },
  { key: "capabilities", en: "Role capabilities", ar: "صلاحيات الدور", icon: "shieldPlus" },
  { key: "assignments", en: "Assignments", ar: "التعيينات", icon: "users" },
  { key: "log", en: "Decision log", ar: "سجل القرارات", icon: "clipboardClock" },
  { key: "create", en: "Create role", ar: "إنشاء دور", icon: "circlePlus" },
];
const KEYS = TABS.map((t) => t.key);

export default function RolesPage() {
  const { lang, dir } = useLang();
  const [active, setActive] = useState(() => {
    const saved = localStorage.getItem("roles-tab");
    return KEYS.includes(saved) ? saved : "checker";
  });
  const [replay, setReplay] = useState(null);

  useEffect(() => {
    localStorage.setItem("roles-tab", active);
  }, [active]);

  function onReplay(payload) {
    setReplay(payload);
    setActive("checker");
  }

  return (
    <div className="roles" dir={dir} lang={lang}>
      <header className="rl-head">
        <h1 className="rl-h1">
          <span>Roles &amp; permissions</span>
          <span className="rl-h1__ar" lang="ar">
            الأدوار والصلاحيات
          </span>
        </h1>
        <p className="rl-head__lede">
          {lang === "ar"
            ? "من يستطيع فعل ماذا، وأين — والفاحص الذي يجيب: هل يمكن لهذا الشخص فعل ذلك، ولماذا. القرارات وأدلتها تأتي من الخادم."
            : "What each role may do, and where — plus the checker that answers “can this person do this, and why”. Every decision and its evidence come from the backend."}
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
        {active === "checker" && (
          <PermissionChecker replay={replay} onReplayConsumed={() => setReplay(null)} />
        )}
        {active === "capabilities" && <CapabilityEditor />}
        {active === "assignments" && <AssignRoleForm />}
        {active === "log" && <DecisionLog onReplay={onReplay} />}
        {active === "create" && <RoleCreateForm />}
      </div>
    </div>
  );
}
