# The 5 Hard Cases

Each becomes a runnable test asserting the behaviour we *observed in Moodle* — not the
behaviour we think is correct. If our app disagrees with Moodle, the test documents the gap
rather than hiding it.

| # | Case | Probes | Status |
|---|---|---|---|
| 1 | Manual + auto-sync enrolment, sync then removed — still enrolled? | Do methods touch each other's rows? What happens to the role the method granted? | ⚪ |
| 2 | Drops week 10, re-enrols week 12 — what happened to the work between? | Suspend vs. unenrol vs. delete; does data survive a gap? | ⚪ |
| 3 | TA can mark group A, not B, can't see C | Capability × group mode × membership × accessallgroups | ⚪ |
| 4 | Student in two groups, activity set to separate groups | What does each side see when membership isn't clean? | ⚪ |
| 5 | 3 years of progress, all courses, including deleted ones | What survives deletion? Feeds `what-didnt-survive.md` | ⚪ |

Case 3 is the messiest — it's the intersection of all three systems. Case 5 is the one most
likely to end up in `what-didnt-survive.md`, which is fine and expected.
