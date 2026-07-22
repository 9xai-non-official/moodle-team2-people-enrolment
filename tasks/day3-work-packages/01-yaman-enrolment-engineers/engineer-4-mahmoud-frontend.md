# Engineer 4 — Mahmoud · Phase F: Frontend

**Engineer slot:** 4 · **Owner:** Mahmoud Sadder
**Parent work package:** [01-yaman-enrolment.md](../01-yaman-enrolment.md)
**Branch:** `t2/yaman/frontend-enrolment` — exists locally; earlier work merged as PR #33
**Filed from:** Slack, 2026-07-22 13:11 — transcribed verbatim, nothing added to the requirements.

May proceed in parallel, but the final implementation must be **rebased after the backend API
contracts from Engineers 1, 2, and 3 stabilize**.

## Owned files

Only these may be modified:

- `src/pages/EnrolmentPage.jsx`
- `src/components/enrolment/SelfEnrolDemo.jsx`
- `src/components/enrolment/EnrolUserModal.jsx`
- `src/components/enrolment/ParticipantsTable.jsx`
- `src/components/enrolment/MethodsPanel.jsx`
- `src/components/enrolment/UserPathsDrawer.jsx`
- `src/mocks/enrolment.js`

Do not edit: `src/api.js` · `src/errors.js` · `src/components/common/*` · Khaled-owned
acting-user context · backend files · test backend files.

Any shared-surface requirement must be prepared as an **additive coordination diff for Essa**.

## SelfEnrolDemo

Correct the displayed backend behaviour. The real self-enrol gate order is
**stop-at-first-failure**:

1. `course_visible`
2. `method_enabled`
3. `window_open`
4. `capacity`
5. `key_match`

Remove copy stating that all gates are always evaluated. Consume the real API response instead
of divergent mock behaviour.

## EnrolUserModal

- Surface 401, 403, and 409 reasons.
- Use the existing `ReasonList` or `ApiError` path.
- Add explicit activate-on-re-enrol intent.
- Send `activate` only when the operator deliberately chooses reactivation.
- Do not make `activate` the default.

The exact placement of the control is not known from staging. Mark uncertain UI decisions:

> INSUFFICIENT EVIDENCE — requires staging inspection

## ParticipantsTable

- Preserve Suspend, Reactivate, and Unenrol actions.
- Disable or hide Unenrol for an active cohort path.
- Show the server-provided reason where possible.
- Continue using `effective_status` from the API.
- Do not calculate enrolment liveness in the client.

## MethodsPanel

Expose configuration where supported by the real backend contract: `expiredaction` ·
enrolment period · `longtimenosee` · `max_enrolled`.

Do not invent the final layout. Mark layout uncertainty as requiring staging inspection.

## UserPathsDrawer

- Verify the displayed live state still comes from backend data.
- Do not create a separate frontend liveness predicate.

## EnrolmentPage

- Preserve existing tab and page structure.
- Ensure the page works after mock retirement.

## Mock retirement

Retire or replace `src/mocks/enrolment.js`. Remove mock behaviour that diverges from the real
backend, including: incorrect self-enrol gate evaluation · incorrect duplicate handling ·
hardcoded window or capacity logic · client-side lifecycle decisions.

## Backend contracts to consume

Coordinate with the backend engineers for: 401 unauthenticated response · 403 capability
response · 409 duplicate/guest conflict · `activate` boolean · `effective_status` · expiry
configuration fields · active cohort unenrol refusal reason.

Do not invent a different response format.

## Frontend verification

Provide manual verification scenarios for:

- 401 reason displayed
- 403 reason displayed
- Guest duplicate 409 displayed
- Suspended re-enrol stays suspended without `activate`
- Explicit `activate` is sent when selected
- Active cohort unenrol is unavailable or refused clearly
- Correct self-enrol gate order
- Expiry fields render and submit
- Real API works after mocks are removed

## Restrictions

- No backend edits.
- No shared frontend edits without an Essa diff.
- No client-side liveness rules.
- No invented staging layout.
- No mock-only business logic.
- No silent error swallowing.

## Plan

1. Inspect current components and mock/API use.
2. Document the current backend response contracts.
3. Fix `SelfEnrolDemo` copy and result rendering.
4. Add error-reason rendering to `EnrolUserModal`.
5. Add explicit `activate` intent.
6. Add cohort-path action restrictions.
7. Add supported expiry configuration fields.
8. Remove mock dependency.
9. Rebase after backend contracts stabilize.
10. Produce manual verification evidence and shared-diff requests.

## Return

Modified components · removed mock behaviours · API contracts consumed · manual verification
results · shared-surface diffs required · INSUFFICIENT EVIDENCE UI items · remaining blockers.
