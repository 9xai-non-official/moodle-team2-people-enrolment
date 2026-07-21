// Who the demo personas ARE, in one line each — keyed by username so it works
// against mock and real DB alike. Feeds the persona chips and the switcher.
export const PERSONAS = {
  admin1: { label: "the admin", blurb: "Manager at System — sees and may do everything, everywhere." },
  "teacher.a": { label: "the teacher", blurb: "Editing teacher in CS101 & MATH200 — full control inside her courses." },
  "ta.a": { label: "the scoped TA", blurb: "Non-editing teacher in CS101, restricted to Group A — the hard-case-3 persona." },
  "ta.allgroups": { label: "the all-groups TA", blurb: "Same job as ta.a but her role keeps access-all-groups — compare them!" },
  "student.a": { label: "the double-enrolled student", blurb: "In CS101 twice: by hand AND via cohort sync (hard case 1)." },
  "student.multi": { label: "the two-groups student", blurb: "Member of Group A and Group B at once (hard case 4)." },
  "student.b": { label: "the ordinary student", blurb: "One course, one group — the control specimen." },
  "student.susp": { label: "the suspended account", blurb: "Account switched off site-wide, yet still on the roster — deliberately." },
};

export const personaBlurb = (username) => PERSONAS[username]?.blurb ?? null;
export const personaLabel = (username) => PERSONAS[username]?.label ?? username;
