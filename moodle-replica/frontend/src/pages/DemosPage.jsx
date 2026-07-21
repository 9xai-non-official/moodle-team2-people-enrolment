// Demos — the Thursday-demo control room. A hub of the hard cases that live on
// other pages, plus HC-2 (the one with no home elsewhere) run live below.
import HardCaseCard from "../components/demos/HardCaseCard";
import HC2DropReturn from "../components/demos/HC2DropReturn";

const CARDS = [
  {
    title: "HC-1 · Two ways into one course",
    rule: "A student with two enrolment paths stays enrolled when you remove just one — membership is the OR of live paths. Open a participant's paths drawer.",
    target: "Enrolment",
  },
  {
    title: "HC-3 · An override subtracts one capability",
    rule: "A role override can deny a capability in one context while the role keeps it everywhere else. Run the one-click checks in the Permission Checker.",
    target: "Roles",
  },
  {
    title: "HC-4 · Separate groups wall off visibility",
    rule: "In separate group mode a non-privileged teacher/TA sees only their own group's members. Compare on the Groups board.",
    target: "Groups",
  },
  {
    title: "HC-5 · Deleted user, surviving history",
    rule: "A deleted user drops off every roster but their completion history is still served from snapshots. Find them in History.",
    target: "Progress",
  },
];

export default function DemosPage({ onNavigate }) {
  return (
    <div>
      <h1>Hard-case demos</h1>
      <p className="muted">
        Each card jumps to where that hard case already lives. HC-2 runs live
        below.
      </p>
      <div className="grid-cards">
        {CARDS.map((c) => (
          <HardCaseCard key={c.title} {...c} onNavigate={onNavigate} />
        ))}
      </div>
      <HC2DropReturn />
    </div>
  );
}
