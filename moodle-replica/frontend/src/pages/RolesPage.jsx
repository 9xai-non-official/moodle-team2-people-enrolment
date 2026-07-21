// Roles / Permissions (task 06 §4.3). Four tabs over one domain: the
// capability sheet, role assignments, the permission checker (the demo
// star), and the decision log. A log row can be replayed: it jumps to the
// checker with the original inputs prefilled and re-runs them.
import { useState } from "react";
import Tabs from "../components/common/Tabs";
import CapabilityEditor from "../components/roles/CapabilityEditor";
import AssignRoleForm from "../components/roles/AssignRoleForm";
import PermissionChecker from "../components/roles/PermissionChecker";
import DecisionLog from "../components/roles/DecisionLog";

const TABS = ["Roles", "Assignments", "Permission Checker", "Decision Log"];

export default function RolesPage() {
  const [tab, setTab] = useState(TABS[0]);
  const [replay, setReplay] = useState(null);

  function replayDecision(decision) {
    setReplay({ ...decision, nonce: (replay?.nonce ?? 0) + 1 });
    setTab("Permission Checker");
  }

  return (
    <div>
      <h1>Roles &amp; Permissions</h1>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "Roles" && <CapabilityEditor />}
      {tab === "Assignments" && <AssignRoleForm />}
      {tab === "Permission Checker" && <PermissionChecker replay={replay} />}
      {tab === "Decision Log" && <DecisionLog onReplay={replayDecision} />}
    </div>
  );
}
