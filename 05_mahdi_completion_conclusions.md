# Team 2 — Course & Activity Completion: Conclusions

**Owner:** Mahdi
**Team:** Team 2 — People and Enrolment
**Scope:** How Moodle decides an activity/course is complete, and how that is represented
**Moodle under test:** 5.3dev (Build: 20260714), MariaDB, prefix `mdl_`
**Status legend:** ✅ Confirmed · 🟡 Plausible (needs a second check) · ❓ Unknown

---

## 1. The single most important conclusion

Moodle tracks **two different things** that people constantly confuse:

| # | Concept | Driven by | Stored in | Shown as |
|---|---|---|---|---|
| 1 | **Progress percentage** | *activity* completion only | `mdl_course_modules_completion` | the progress bar / % on the course card |
| 2 | **Course completion state** (Complete/Not) | *course completion criteria* (self, grade, date, activity, …) | `mdl_course_completions` | green tick + date in the completion report |

They are **separate systems**. A course can be "Complete" with a 0-activity setup (e.g. Manual self completion), and a course can be at 66% and still not "Complete". ✅

---

## 2. Prerequisites for anything to be recorded

- **Site setting** `enablecompletion = 1` must be on. ✅ (`mdl_config`)
- **Course setting** `enablecompletion = 1` must be on. ✅ (`mdl_course.enablecompletion`)
- If completion is disabled, **no completion rows are written at all** — activities show no Done indicator and reports are empty. (P-01) 🟡 *(logic confirmed in code path `completion_info::is_enabled()`; UI screenshot still to capture)*
- **A course with completion enabled but zero criteria can never be "Complete."** ✅ (observed: `hello` had `enablecompletion=1` but empty `mdl_course_completion_criteria`; nothing could complete until a criterion was added)

---

## 3. Completion state values (from `lib/completionlib.php`) ✅

| Constant | Value | Meaning |
|---|---|---|
| `COMPLETION_INCOMPLETE` | 0 | not complete |
| `COMPLETION_COMPLETE` | 1 | complete |
| `COMPLETION_COMPLETE_PASS` | 2 | complete + passing grade |
| `COMPLETION_COMPLETE_FAIL` | 3 | complete + failing grade |

These are the `completionstate` values in `mdl_course_modules_completion`.

## 4. Course-completion criteria types (from `completion/criteria/completion_criteria.php`) ✅

| Constant | Value | How the course completes |
|---|---|---|
| `..._TYPE_SELF` | 1 | student clicks "Complete course" (manual self) |
| `..._TYPE_DATE` | 2 | a set date passes |
| `..._TYPE_UNENROL` | 3 | student is unenrolled |
| `..._TYPE_ACTIVITY` | 4 | required activities are complete |
| `..._TYPE_DURATION` | 5 | N days after enrolment |
| `..._TYPE_GRADE` | 6 | course grade reaches a set value |
| `..._TYPE_ROLE` | 7 | a role (teacher/manager) marks the student complete |
| `..._TYPE_COURSE` | 8 | other prerequisite course(s) completed |

Aggregation: `COMPLETION_AGGREGATION_ALL = 1` (all criteria required) · `COMPLETION_AGGREGATION_ANY = 2` (any one). ✅

## 5. Activity completion conditions (per activity) ✅

Set per activity under **Activity completion**:
- **Manual** — student ticks "Mark as done".
- **Automatic** — one or more of: *Require view*, *Require grade*, *Require passing grade*, or activity-specific rules (Forum: N discussions/posts/replies; Quiz: receive/pass grade; Assignment: make a submission).
- Teachers can override a student's activity completion in the report.

---

## 6. The percentage formula ✅

From `completion/classes/progress.php::get_course_progress_percentage()`:

```
if course is formally complete            -> 100
else percentage = (completed tracked activities / total tracked activities) * 100
if no activities have completion tracking -> null (no bar shown)
```

**Consequence:** only **activity completion** moves the bar incrementally. Course criteria (self/grade/date/…) do **not** nudge the %, they only snap it to 100 when the course completes. This is why `hello` never showed a partial %: its only activity (a forum) had completion disabled.

---

## 7. Aggregation timing (P-08) ✅

- **Activity** completion is written **immediately** when the condition is met.
- **Course** completion is aggregated by the scheduled task **`\core\task\completion_regular_task`** (cron), **not** instantly. Observed: after marking a criterion, `mdl_course_completions.timecompleted` was only populated **after** running that task.
- Implication for our app: course completion has an eventual-consistency delay; don't assume it is real-time.

---

## 8. Database map (the chain to document) ✅

```
Trigger (view/submit/grade/pass/self/manual)
   └─> mdl_course_modules_completion   (per-activity; completionstate 0/1/2/3, timemodified)
          └─(feeds)→ Activity-completion criterion
   └─> mdl_course_completion_crit_compl (per-criterion completion, timecompleted)   [see finding 10]
          └─(aggregated by cron)→ mdl_course_completions.timecompleted  = "Complete"
```

Supporting config tables:
- `mdl_course_completion_criteria` — the criteria defined for a course.
- `mdl_course_completion_aggr_methd` — the All/Any aggregation method.

---

## 9. Where completion is represented (UI) ✅

| View | URL (this install) | Shows |
|---|---|---|
| Student Dashboard | `/my/` | Course overview bar + In-progress/Completed filter |
| Course page | `/course/view.php?id=2` | per-activity Done indicators |
| Completion report | `/report/completion/index.php?id=2` | grid of students × activities/criteria, ticks + dates |

Verified via API: for course `hello`, `is_course_complete` returned **true** for `student.a` and **false** for other enrolled users — completion is strictly per-user. ✅

---

## 10. Notable findings & open leads

- 🟡 **Self-completion provenance gap.** After completing the course via the self-completion path, `mdl_course_completions.timecompleted` was set **but `mdl_course_completion_crit_compl` was empty**. This bears on task Question #3 (*does Moodle store WHY, or only the final state?*). Must be re-checked against the **block-driven UI flow** before treating as final — our completion was triggered via API.
- ✅ **The "Self completion" block is disabled on new installs by design.** `blocks/selfcompletion/db/install.php` runs `$DB->set_field('block','visible',0,['name'=>'selfcompletion'])`. So the manual "Complete course" button is hidden until an admin enables the block. Manual self-completion still works; the control is also surfaced by the (enabled-by-default) **Course completion status** block. Governed by `mdl_block.visible`.
- ✅ **Role assignment is context-scoped** (`mdl_role_context_levels`): Teacher/Non-editing teacher/Student are assignable only at Course/Activity context; Manager/Course creator at System/Category. This is why system-level "Assign roles" shows only Manager + Course creator — expected, not a bug. (Relevant to enrolment side of Team 2.)

---

## 11. Draft rules (per task template)

### T2-PRG-001 — Course completes by Manual self completion
- **Completion target:** Course
- **Configuration:** Course completion criterion `SELF` (type 1), aggregation ANY
- **User state:** enrolled Student, tracked
- **Trigger:** student clicks "Complete course" (Self completion block) — or API equivalent
- **Observed transition:** no `course_completions` row → row with `timecompleted` set (after cron)
- **UI evidence:** completion report shows tick + date for that user only
- **Database evidence:** `mdl_course_completions.timecompleted` populated
- **Code evidence:** `completion_criteria_self::complete()` → `completion_completion::mark_complete()`; aggregated by `completion_regular_task`
- **Historical effect:** completion time never changes once set (`mark_complete()` returns early if already set)
- **Integration impact:** app must treat course completion as delayed (cron) and per-user
- **Confidence:** ✅ Confirmed (API path); 🟡 UI-button path still to screenshot

### T2-PRG-002 — Progress % is activity-based, not criteria-based
- **Completion target:** Course (progress display)
- **Configuration:** any
- **Trigger:** completing an activity with a completion condition
- **Observed transition:** `% = completed_tracked_activities / total_tracked_activities`
- **Code evidence:** `core_completion\progress::get_course_progress_percentage()`
- **Integration impact:** to show a meaningful %, our data model needs per-activity completion, not just course state
- **Confidence:** ✅ Confirmed (code)

---

## 12. Task questions — status so far

| Q | Short answer | Confidence |
|---|---|---|
| 1. Settings needed before completion recorded? | site + course `enablecompletion=1`, plus at least one criterion / activity condition | ✅ |
| 2. View vs submit vs grade vs pass differ? | different *activity* conditions; pass records state 2/3 | ✅ (code) 🟡 (UI matrix pending) |
| 3. Stores *why* or only final state? | final state in `course_completions`; per-criterion provenance table came up empty on self path | 🟡 lead |
| 4. Is event history preserved? | logs + completion timestamps; deletion behaviour | ❓ pending P-11/P-13 |
| 9. Recalculates after settings change? | course completion via cron task | ✅ (partial) |
| 10. Reliable 3-year history? | needs snapshot/tombstone before deletion (Hard Case 5) | ❓ pending |

---

## 13. Environment notes (reproducibility)

- Runtime: Homebrew PHP 8.5, MariaDB; served `php -S localhost:8000 -t public`.
- Test student: `student.a` / `Student.a1!`, enrolled in course `hello` (id 2).
- Completion aggregation run manually with:
  `php admin/cli/scheduled_task.php --execute='\core\task\completion_regular_task'`

*Next: capture UI screenshots for P-01–P-08 and re-verify finding #10 through the block-driven flow.*
