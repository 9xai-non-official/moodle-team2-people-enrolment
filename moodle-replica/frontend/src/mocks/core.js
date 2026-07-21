// Core mocks: users + courses lists (acting-user select, course selects,
// dashboard counts). Owned by the shell, not a domain.
import { USERS, COURSES, ENROLMENTS, GROUPS } from "./seed";

export const routes = [
  {
    method: "GET",
    pattern: /^\/api\/users$/,
    handler: () => USERS.filter((u) => u.username !== "student.gone"), // ghada exists only in snapshots
  },
  {
    method: "GET",
    pattern: /^\/api\/courses$/,
    handler: (m, body, query) =>
      query.include_deleted === "1" ? COURSES : COURSES.filter((c) => !c.deleted),
  },
  {
    method: "GET",
    pattern: /^\/api\/stats$/,
    handler: () => ({
      users: USERS.length - 1,
      courses: COURSES.filter((c) => !c.deleted).length,
      enrolments: ENROLMENTS.length,
      groups: GROUPS.length,
    }),
  },
];
