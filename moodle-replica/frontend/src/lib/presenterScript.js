// The Thursday walkthrough, page by page. Presenter mode pins these steps to
// the corner so the person driving never has to remember what's next.
export const SCRIPT = {
  Dashboard: [
    "Point at the persona chips — 'you are always somebody'.",
    "Switch to student.a — progress strip changes live.",
  ],
  Demos: [
    "Open with the four cards — one hard case each.",
    "Run HC-2 live: drop → progress survives → return, API trail on screen.",
  ],
  Enrolment: [
    "CS101 roster: Salma has TWO method badges (manual + cohort) — hard case 1.",
    "Sami is red but LISTED — account suspension ≠ unenrolment (C-6).",
    "Click Salma → paths drawer → 'IN (2/2 live)'.",
    "Methods tab → Remove the cohort method → roster: she's still in via manual.",
  ],
  Roles: [
    "Permission Checker → press the first scenario button (scoped TA).",
    "Read the green capability row + red group row TOGETHER — that's the thesis.",
    "Press scenario 2 (all-groups TA) — same inputs, all green.",
    "Decision Log → Replay any row.",
  ],
  Groups: [
    "Board: Majd wears ×2 — two groups at once is a feature (hard case 4).",
    "Activity policy: highlighted row = configured 'separate' silently forced to 'none' (GRP-012).",
    "Scope check: as ta.a → Basel = 'not even visible'; as ta.allgroups → allowed.",
  ],
  Progress: [
    "Report grid: ✓P / ✗F / 🔒 overridden — hover the lock.",
    "'Secret Forum' column is hidden: in the report, excluded from the dashboard %.",
    "History tab: HIST9 — three years of snapshots for a course that no longer exists (hard case 5).",
  ],
  Courses: [
    "Sign out → create a brand-new account → confirm the mock email (Moodle's real signup gate).",
    "Catalog: CS101 wants a key ('sesame') — MATH200 has no self-enrol, so REQUEST it (core Moodle just says 'you cannot enrol yourself').",
    "Open CS101 → Assignment 1 → type text, attach an image, tick the statement, Submit — it locks, like Moodle.",
    "Quiz 1 → start attempt → answer → Finish: auto-marked instantly, essay 'awaiting marking'.",
  ],
  Admin: [
    "Overview strip: pending course requests jump straight to Teaching → New course.",
    "As admin1: create an account — it signs in IMMEDIATELY (no confirm email; that gate is self-registration's only).",
    "'make manager' grants full site powers at System; revoking your OWN manager role refuses — no self-lockout.",
    "Suspend an account → its sign-in refuses, yet every roster still lists them (suspension ≠ deletion).",
    "Courses tab: hide LAB1 → it leaves the catalog untouched inside; delete it → Progress → History still answers (hard case 5).",
    "Try suspending yourself — refused: no self-lockout.",
  ],
  Teaching: [
    "As teacher.a: Roster tab — approve Ghada's enrolment request → she lands on the roster via manual enrol.",
    "Promote Basel to non-editing teacher — grade-only role, assignable because it's BELOW teacher.",
    "Grading: mark the pending essay (Tariq the scoped TA sees 'outside your groups' on Group B — hard case 3 in the grading queue).",
    "New course tab: 'Create course directly' REFUSES for teachers (moodle/course:create) — Request instead; as admin1, approve it.",
  ],
};
