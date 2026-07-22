// One plain-English sentence per jargon term. Moodle makes you google these;
// we put them under the cursor. Rendered by <Term> as a dotted-underline
// hover — keep every entry ONE sentence, no nested jargon.
export const GLOSSARY = {
  enrolment:
    "Being IN a course. A person can be enrolled by several routes at once; they stay in while at least one route is alive.",
  method:
    "A way INTO a course: added by hand (manual), signed up with a key (self), or synced automatically from a cohort.",
  cohort:
    "A site-wide list of people (e.g. '2026 intake'). Attach it to a course and its members get enrolled automatically.",
  role:
    "A named bundle of permissions — Student, Teacher, Manager. Held AT a place (site, course, activity), not globally.",
  capability:
    "One nameable action, like activity:grade. Roles say allow / prevent / prohibit for each capability.",
  context:
    "WHERE a permission applies. Contexts nest: System › course › activity — rules set higher apply below.",
  override:
    "A rule redefined deeper in the tree: 'teachers may grade — but not in THIS course.' Deeper wins.",
  prohibit:
    "The nuclear no: once set, no deeper rule can turn it back on. Regular 'prevent' can be out-voted; prohibit can't.",
  provenance:
    "WHO created a row — by hand ('manual') or by machinery (enrol_cohort). Machine-made rows resist manual deletion.",
  group:
    "A partition of people INSIDE one course. A person can be in several groups of the same course at once.",
  grouping:
    "A named SET OF GROUPS. Activities restrict themselves to a grouping — never directly to people.",
  "group mode":
    "Per-course or per-activity isolation: none (everyone), separate (you see only your groups), visible (see all, interact with yours).",
  "effective status":
    "What actually holds after combining every rule — e.g. enrolled-but-suspended, or configured 'separate' but forced to 'none'.",
  archetype:
    "The template a role resets to. Duplicating a role copies its rules — Moodle's real answer to 'this TA needs different powers'.",
  "completion":
    "A record that work happened. It survives unenrolment and even course deletion — the past doesn't get rewritten.",
  criteria:
    "The checklist that defines 'course complete' — activities to finish, aggregated by ALL or ANY.",
  "self enrolment":
    "Signing yourself into a course, sometimes gated by a key the teacher hands out.",
  "enrolment key":
    "The password of a course's self-enrolment door — wrong key, no entry.",
  "submission statement":
    "The 'this is my own work' declaration — no tick, no hand-in.",
  "non-editing teacher":
    "The grade-only role: may view and mark students' work, may never add or change activities.",
  "course request":
    "A teacher can't create courses — they ask, a manager approves, and the requester becomes the new course's teacher.",
  "manual marking":
    "Essay answers wait for a human: the quiz total stays hidden until a teacher scores them.",
};
