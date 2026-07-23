// Plain-English, one-line explanation per capability, shown under each
// permission in the role builder so the picker reads like sentences, not
// jargon. Keys are the capability `name` exactly as the API returns it
// (component:action). Keep every entry to ONE short sentence.
//
// The capabilities API only returns name/cap_type/component/risks — no
// description — so these live client-side. capExplain() falls back to a
// generic read/write sentence for any capability not listed here, so a
// newly-seeded capability never renders blank.
export const CAP_INFO = {
  // activity
  "activity:grade": "Mark and score students' submissions in activities.",
  "activity:submit": "Hand in attempts and submissions to activities (the student action).",
  "activity:view": "Open and view activities inside a course.",

  // cohort (site-wide bulk-enrolment lists)
  "cohort:manage": "Create, edit and delete site-wide cohorts.",
  "cohort:view": "See existing cohorts and who belongs to them.",
  "cohort:assign": "Add and remove the members of a cohort.",
  "cohort:config": "Change a cohort's settings.",

  // completion / progress
  "completion:override": "Manually mark an activity or course complete, overriding the automatic rule.",
  "progress:viewall": "View the completion progress of every student in a course.",
  "progress:viewown": "View your own completion progress.",

  // course management
  "course:create": "Create new courses.",
  "course:delete": "Permanently delete a course and everything in it.",
  "course:update": "Edit course settings (name, format, dates, and so on).",
  "course:view": "Enter and view a course.",
  "course:viewhidden": "See courses that are hidden from students.",
  "course:viewhiddenactivities": "See activities that have been hidden from students.",
  "course:viewparticipants": "See the list of people enrolled in a course.",
  "course:manageactivities": "Add, edit, move and remove activities and resources.",
  "course:managescales": "Create and edit the grading scales used for marking.",
  "course:activityvisibility": "Show or hide individual activities from students.",
  "course:sectionvisibility": "Show or hide whole course sections/topics from students.",
  "course:reset": "Wipe a course's user data (grades, submissions) to reuse it next term.",
  "course:tag": "Add and manage tags on a course.",
  "course:enrolconfig": "Configure a course's enrolment methods.",

  // grades
  "grade:edit": "Enter and change grades in the gradebook.",
  "grade:manage": "Configure the gradebook: categories, aggregation and grade settings.",
  "grade:view": "View grades in the gradebook.",
  "grade:viewall": "View the grades of all students in the course.",
  "grade:viewhidden": "View grades and grade items hidden from students.",
  "grade:export": "Export the gradebook to a file (CSV, Excel, and so on).",
  "grade:import": "Import grades into the gradebook from a file.",

  // groups
  "group:manage": "Create groups and groupings and manage their membership.",
  "site:accessallgroups": "See and access every group, ignoring separate-groups limits.",

  // roles & permissions
  "role:assign": "Assign roles to users in a context (e.g. make someone a teacher here).",
  "role:manage": "Create, edit, duplicate and delete roles site-wide.",
  "role:override": "Change what a role may do in a specific context (permission overrides).",
  "role:review": "View roles and the permissions each one grants.",

  // enrolment
  "enrol:manual": "Manually enrol and remove users in a course.",
  "enrol:unenrol": "Remove users from a course.",
  "enrol:manage": "Configure a course's enrolment methods.",
  "enrol:selfenrol": "Enrol yourself into a course.",

  // users
  "user:viewdetails": "View users' profile details.",
  "user:viewhiddendetails": "View profile fields hidden from ordinary users.",
};

// Explanation for a capability object ({ name, cap_type }). Falls back to a
// generic sentence keyed on read/write so nothing renders blank.
export function capExplain(cap) {
  const known = CAP_INFO[cap?.name];
  if (known) return known;
  return cap?.cap_type === "read"
    ? "Read-only access to this area."
    : "Perform this action / make this change.";
}
