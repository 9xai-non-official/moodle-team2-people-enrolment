// Core mocks: users + courses + stats. Restored after a real-mode regression:
// domain mocks resolve ids against seed.js, so mock mode must serve the seed's
// users/courses too — half-real half-mock ids diverge (real DEMO-CS101 id 2 is
// seed MATH200). Delete this file only when ALL domain endpoints are real.
// Real mode (VITE_USE_MOCKS=0) never touches this file.
import { USERS, COURSES, ENROLMENTS, GROUPS } from "./seed";

export const routes = [
  {
    method: "GET",
    pattern: /^\/api\/users$/,
    handler: () => USERS.filter((u) => u.username !== "student.gone"),
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
