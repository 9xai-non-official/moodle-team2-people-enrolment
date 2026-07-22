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

// -- teacher roster management: manual enrol, suspend, unenrol, demote
refuses(403, () => call("POST", "/api/lms/courses/1/enrol", { actor_id: 3, user_id: 9, role_id: 4 })); // non-editing can't enrol
call("POST", "/api/lms/courses/1/enrol", { actor_id: 2, user_id: 9, role_id: 3 }); // Ghada in as TA
const ghadaPath = ENROLMENTS.find((e) => e.user_id === 9);
call("PATCH", `/api/lms/enrolments/${ghadaPath.id}`, { actor_id: 2, status: "suspended" });
assert.equal(ghadaPath.status, "suspended");
call("PATCH", `/api/lms/enrolments/${ghadaPath.id}`, { actor_id: 2, status: "active" });
refuses(403, () => call("PATCH", "/api/lms/enrolments/62", { actor_id: 2, status: "suspended" })); // cohort path owned by sync
call("POST", "/api/lms/courses/1/remove-role", { actor_id: 2, user_id: 9, role_id: 3 });
assert.ok(!ROLE_ASSIGNMENTS.some((a) => a.user_id === 9 && a.role_id === 3), "TA role removed");
call("DELETE", "/api/lms/enrolments/" + ghadaPath.id, null, { actor_id: "2" });
assert.ok(!ENROLMENTS.includes(ghadaPath), "path unenrolled");

// -- revert to draft unlocks, keeps the grade
const graded = call("POST", "/api/lms/submissions/82/revert", { actor_id: 2 });
assert.equal(graded.status, "draft");
assert.equal(graded.grade, 86, "revert keeps the grade on record");

// -- activity visibility: non-editing refused, editing toggles
refuses(403, () => call("PATCH", "/api/lms/activities/101", { actor_id: 3, visible: false }));
call("PATCH", "/api/lms/activities/101", { actor_id: 2, visible: false });
const actsHidden = call("GET", "/api/lms/courses/1/activities", null, { user_id: "7" });
assert.ok(!actsHidden.some((a) => a.id === 101), "hidden activity vanishes for students");
call("PATCH", "/api/lms/activities/101", { actor_id: 2, visible: true });

// -- admin: create user (usable immediately), suspend, course lifecycle
refuses(403, () => call("POST", "/api/lms/users", { actor_id: 2, username: "x", first_name: "X", last_name: "Y", password: "p" }));
const staff = call("POST", "/api/lms/users", { actor_id: 1, username: "check.staff", first_name: "Sana", last_name: "Staff", password: "pw" });
call("POST", "/api/auth/login", { username: "check.staff", password: "pw" }); // no confirm gate for admin-created
refuses(409, () => call("PATCH", "/api/lms/users/1", { actor_id: 1, suspended: true })); // no self-lockout
call("PATCH", `/api/lms/users/${staff.id}`, { actor_id: 1, suspended: true });
refuses(403, () => call("POST", "/api/auth/login", { username: "check.staff", password: "pw" }));
call("PATCH", `/api/lms/users/${staff.id}`, { actor_id: 1, suspended: false });

call("PATCH", "/api/lms/courses/4", { actor_id: 1, visible: false });
assert.equal(call("GET", "/api/lms/catalog", null, { user_id: "7" }).some((r) => r.course.id === 4), false, "hidden course leaves the catalog");
call("PATCH", "/api/lms/courses/4", { actor_id: 1, visible: true });
refuses(403, () => call("DELETE", "/api/lms/courses/4", null, { actor_id: "2" })); // teachers cannot delete
const del = call("DELETE", "/api/lms/courses/4", null, { actor_id: "1" });
assert.ok(del.note.includes("snapshots survive") || del.note.includes("hard case 5"));

// -- profile: password proof required; name change propagates
refuses(403, () => call("PATCH", "/api/auth/profile", { user_id: user.id, current_password: "wrong", new_password: "np" }));
const renamed = call("PATCH", "/api/auth/profile", { user_id: user.id, first_name: "Checked", current_password: "pw", new_password: "pw2" });
assert.equal(renamed.full_name.split(" ")[0], "Checked");
call("POST", "/api/auth/login", { username: "check.u", password: "pw2" });

// -- my-grades: graded submission + released quiz total both appear
const grades = call("GET", "/api/lms/my-grades", null, { user_id: "7" });
assert.ok(grades.some((g) => g.kind === "assignment" && g.score === 70), "Basel's assignment grade listed");
assert.ok(grades.some((g) => g.kind === "quiz" && g.score === 9), "Basel's quiz total listed");

// -- manager toggle: grant, self-revoke refusal, revoke
refuses(403, () => call("POST", `/api/lms/users/${staff.id}/toggle-manager`, { actor_id: 2 }));
assert.equal(call("POST", `/api/lms/users/${staff.id}/toggle-manager`, { actor_id: 1 }).manager, true);
refuses(409, () => call("POST", "/api/lms/users/1/toggle-manager", { actor_id: 1 })); // no self-lockout
assert.equal(call("POST", `/api/lms/users/${staff.id}/toggle-manager`, { actor_id: 1 }).manager, false);

// -- activity edit: rename + attempts; grading queue counts for teachers
call("PATCH", "/api/lms/activities/102", { actor_id: 2, name: "Quiz 1 (v2)", attempts_allowed: 5 });
const tActs = call("GET", "/api/lms/courses/1/activities", null, { user_id: "2" });
const q102 = tActs.find((a) => a.id === 102);
assert.equal(q102.name, "Quiz 1 (v2)");
assert.ok(q102.queue && typeof q102.queue.pending_essays === "number", "teacher sees the marking queue");
const sActs = call("GET", "/api/lms/courses/1/activities", null, { user_id: "7" });
assert.equal(sActs.find((a) => a.id === 102).queue, undefined, "students never see the queue");

console.log(`lms self-check OK — ${USERS.length} users, ${ENROLMENTS.length} enrolments in final state`);
