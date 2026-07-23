// Self-check for the LMS mock layer — the rules that must not rot:
// auth gates, self-enrol key, HC-3 grading scope, non-editing refusal,
// course-create refusal. Run:  node src/mocks/lms.selfcheck.mjs
// (no framework on purpose; exits non-zero on first failure)
import assert from "node:assert/strict";
import { routes } from "./lms.js";
import { ENROLMENTS, ROLE_ASSIGNMENTS, USERS } from "./seed.js";

const call = (method, path, body, query = {}) => {
  const route = routes.find((r) => r.method === method && path.match(r.pattern));
  assert.ok(route, `no route for ${method} ${path}`);
  return route.handler(path.match(route.pattern), body, query);
};
const refuses = (status, fn) => {
  try {
    fn();
  } catch (e) {
    assert.equal(e.status, status, `expected ${status}, got ${e.status}: ${e.message}`);
    return e;
  }
  assert.fail("expected a refusal, got success");
};

// -- auth: signup → unconfirmed login refused → confirm → login ok
const { user } = call("POST", "/api/auth/signup", {
  username: "check.u", first_name: "Check", last_name: "User", password: "pw",
});
refuses(403, () => call("POST", "/api/auth/login", { username: "check.u", password: "pw" }));
call("POST", "/api/auth/confirm", { user_id: user.id });
const me = call("POST", "/api/auth/login", { username: "check.u", password: "pw" });
assert.equal(me.user.id, user.id);
assert.equal(me.enrolled.length, 0, "fresh account enrolled nowhere");

// -- suspended account login refused
refuses(403, () => call("POST", "/api/auth/login", { username: "student.susp", password: "x" }));

// -- self-enrol: wrong key 403, right key enrols + role row with provenance
refuses(403, () => call("POST", "/api/lms/courses/1/self-enrol", { user_id: user.id, key: "nope" }));
call("POST", "/api/lms/courses/1/self-enrol", { user_id: user.id, key: "sesame" });
assert.ok(ENROLMENTS.some((e) => e.user_id === user.id && e.method_id === 42));
assert.ok(ROLE_ASSIGNMENTS.some((a) => a.user_id === user.id && a.component === "enrol_self"));
refuses(409, () => call("POST", "/api/lms/courses/1/self-enrol", { user_id: user.id, key: "sesame" }));

// -- submission statement is a hard gate; submit locks
refuses(403, () =>
  call("POST", "/api/lms/activities/101/submission", { user_id: user.id, text: "hi", action: "submit", statement_accepted: false }),
);
call("POST", "/api/lms/activities/101/submission", { user_id: user.id, text: "hi", action: "submit", statement_accepted: true });
refuses(409, () =>
  call("POST", "/api/lms/activities/101/submission", { user_id: user.id, text: "edit", action: "draft" }),
);

// -- HC-3: scoped TA (ta.a=3, Group A) may grade Salma (A), not Basel (B)
const subs = call("GET", "/api/lms/activities/101/submissions", null, { actor_id: "3" });
const by = (name) => subs.find((s) => s.user.full_name.includes(name));
assert.equal(by("Salma").can_grade, true, "ta.a grades own group");
assert.equal(by("Basel").can_grade, false, "ta.a blocked outside her group");
refuses(403, () => call("POST", `/api/lms/submissions/${by("Basel").id}/grade`, { actor_id: 3, grade: 50 }));
// all-groups TA (4) grades Basel fine
call("POST", `/api/lms/submissions/${by("Basel").id}/grade`, { actor_id: 4, grade: 70, feedback: "ok" });

// -- essay marking releases total (auto 6 + essay 3 = 9 for attempt 71)
const attempt = call("POST", "/api/lms/attempts/71/grade-essay", { actor_id: 2, question_id: 4, points: 3 });
assert.equal(attempt.state, "graded");
assert.equal(attempt.total, 9);

// -- non-editing teacher cannot create activities; editing teacher can
refuses(403, () => call("POST", "/api/lms/courses/1/activities", { actor_id: 3, activity_type: "assign", name: "X" }));
call("POST", "/api/lms/courses/1/activities", { actor_id: 2, activity_type: "assign", name: "Extra credit" });

// -- teachers cannot create courses; request → admin approve → requester teaches
refuses(403, () => call("POST", "/api/lms/courses", { actor_id: 2, full_name: "Nope", short_name: "NOPE" }));
const req = call("POST", "/api/lms/course-requests", { actor_id: 2, full_name: "Check Course", short_name: "CHK1" });
refuses(403, () => call("POST", `/api/lms/course-requests/${req.id}/approve`, { actor_id: 2 }));
const approved = call("POST", `/api/lms/course-requests/${req.id}/approve`, { actor_id: 1 });
assert.ok(
  ROLE_ASSIGNMENTS.some((a) => a.user_id === 2 && a.role_id === 2 && a.context_id !== 10 && a.context_id !== 20),
  "requester became teacher of the new course",
);
assert.equal(approved.course.short_name, "CHK1");

// -- enrol-request approve enrols via manual method
const er = call("POST", "/api/lms/courses/4/enrol-request", { user_id: 6, message: "lab please" });
call("POST", `/api/lms/enrol-requests/${er.id}/approve`, { actor_id: 1 });
assert.ok(ENROLMENTS.some((e) => e.user_id === 6 && e.method_id === 46));

console.log(`lms self-check OK — ${USERS.length} users, ${ENROLMENTS.length} enrolments in final state`);
