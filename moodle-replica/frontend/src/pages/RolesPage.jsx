// Roles / Permissions (task 06 §4.3). Four tabs over one domain: the
// capability sheet, role assignments, the permission checker (the demo
// star), and the decision log. A log row can be replayed: it jumps to the
// checker with the original inputs prefilled and re-runs them.
import { useEffect, useState } from "react";
import PageIntro from "../components/common/PageIntro";
import Term from "../components/common/Term";
import Tabs from "../components/common/Tabs";
import CapabilityEditor from "../components/roles/CapabilityEditor";
import AssignRoleForm from "../components/roles/AssignRoleForm";
import PermissionChecker from "../components/roles/PermissionChecker";
import DecisionLog from "../components/roles/DecisionLog";

// Checker first: it's the demo star, so it's the default landing tab.
const TABS = ["Permission Checker", "Roles", "Assignments", "Decision Log"];

export default function RolesPage() {
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem("roles-tab");
    return TABS.includes(saved) ? saved : TABS[0];
  });
  const [replay, setReplay] = useState(null);

  useEffect(() => {
    localStorage.setItem("roles-tab", tab);
  }, [tab]);

  function replayDecision(decision) {
    setReplay({ ...decision, nonce: (replay?.nonce ?? 0) + 1 });
    setTab("Permission Checker");
  }

  return (
    <div>
      <h1>Roles &amp; Permissions</h1>
      <PageIntro line={<>What each <Term k="role" /> may do, where — and the checker that answers "can this person do this, and why".</>}>
        <p>Permissions live on roles, not people. A <Term k="capability" /> is one nameable action; roles say allow / prevent / <Term k="prohibit" /> for it, at a <Term k="context" /> — rules nest System › course › activity, deeper <Term k="override">overrides</Term> win.</p>
        <p>The Permission Checker tab shows the whole decision, gate by gate, with evidence. That screen is the project.</p>
      </PageIntro>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "Roles" && <CapabilityEditor />}
      {tab === "Assignments" && <AssignRoleForm />}
      {tab === "Permission Checker" && <PermissionChecker replay={replay} />}
      {tab === "Decision Log" && <DecisionLog onReplay={replayDecision} />}
    </div>
  );
}
