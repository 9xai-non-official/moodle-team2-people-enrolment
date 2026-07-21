// Demos — the Thursday-demo control room. The story: five hard cases, five
// proofs, run one live. Four of the cases live on their own pages; HC-2 (the
// one with no home elsewhere) runs live right here, so it leads the page.
import PageIntro from "../components/common/PageIntro";
import HardCaseCard from "../components/demos/HardCaseCard";
import HC2DropReturn from "../components/demos/HC2DropReturn";

const CARDS = [
  {
    title: "HC-1 · Two ways into one course",
    see: "You'll see: two enrolment paths, remove one, still enrolled.",
    rule: "A student with two enrolment paths stays enrolled when you remove just one — membership is the OR of live paths. Open a participant's paths drawer.",
    target: "Enrolment",
  },
  {
    title: "HC-3 · An override subtracts one capability",
    see: "You'll see: the same role say yes everywhere but no in one context.",
    rule: "A role override can deny a capability in one context while the role keeps it everywhere else. Run the one-click checks in the Permission Checker.",
    target: "Roles",
  },
  {
    title: "HC-4 · Separate groups wall off visibility",
    see: "You'll see: two TAs on one course, two different rosters.",
    rule: "In separate group mode a non-privileged teacher/TA sees only their own group's members. Compare on the Groups board.",
    target: "Groups",
  },
  {
    title: "HC-5 · Deleted user, surviving history",
    see: "You'll see: gone from every roster, still present in history.",
    rule: "A deleted user drops off every roster but their completion history is still served from snapshots. Find them in History.",
    target: "Progress",
  },
];

export default function DemosPage({ onNavigate }) {
  return (
    <div>
      <h1>Hard-case demos</h1>
      <PageIntro line="Five hard cases from the brief — four live on their pages, one runs live right here." />

      <HC2DropReturn />

      <h2>The other four hard cases</h2>
      <p className="muted">Each card jumps to where that hard case already lives.</p>
      <div className="grid-cards">
        {CARDS.map((c) => (
          <HardCaseCard key={c.title} {...c} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
