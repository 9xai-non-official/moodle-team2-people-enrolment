// Core mocks: users + courses. Restored after a real-mode regression:
// domain mocks resolve ids against seed.js, so mock mode must serve the seed's
// users/courses too — half-real half-mock ids diverge (real DEMO-CS101 id 2 is
// seed MATH200). Delete this file only when ALL domain endpoints are real.
// Real mode (VITE_USE_MOCKS=0) never touches this file.
//
// /api/stats is DELIBERATELY not mocked here: the dashboard's headline counts
// are global and id-independent, so we let them fall through to the live DB
// (Supabase) even while auth/domain ids stay seeded. That is what makes the
// dashboard read "from the database" without the seed↔DB id divergence above
// leaking into the per-user views. Re-add a handler here only to demo offline.
import { USERS, COURSES } from "./seed";

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
];
