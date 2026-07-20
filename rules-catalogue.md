# Rules Catalogue — People & Enrolment

**Team 2** · Moodle 5.2.1+ (build 20260714) · investigated 2026-07-20 → 2026-07-23

Targets: **≥15 by Monday night · ≥50 by Tuesday night.**

---

## What counts as a rule

A decision the system makes that affects a real person and was never written down.

Not a rule: "there is a table called X." That's schema, it goes in `schema.sql`.
A rule: "when A and B disagree, B wins" — a *behaviour* someone could be surprised by.

## What counts as evidence

Every rule needs **one** of these three, and it must be specific enough that someone else
could reproduce it:

| Type | What it looks like | Good | Bad |
|---|---|---|---|
| **DB** | A query and its actual output | `SELECT status FROM {prefix}user_enrolments WHERE userid=7` → returned `1` for both rows | "the enrolments table shows it" |
| **UI** | A screen, a specific state, ideally a screenshot in `evidence/` | Participants page shows user greyed with "Suspended" badge — `evidence/03-suspended.png` | "the admin screen says so" |
| **Observed** | A thing you did, and what changed | Set method to Disabled → refreshed → user vanished from Participants, but their `user_enrolments` row still had `status=0` | "I think it disables them" |

**"I read the PHP and it looks like…" is not evidence.** Code-reading tells you where to look;
it doesn't tell you what happens. Run it. If you genuinely can't run it, file the rule as
`UNVERIFIED` and say why — an honest unverified rule beats a confident wrong one.

---

## Rule ID namespaces

The team has split this area by owner (see [tasks/](tasks/)). Each owner gets a prefix so
everyone can add rules here concurrently without ID collisions:

| Prefix | Area | Owner | Source |
|---|---|---|---|
| `T2-GRP-XXX` | Groups, groupings, visibility, TA scope | Mahmoud | [tasks/03_mahmoud_groups_testing.md](tasks/03_mahmoud_groups_testing.md) |
| `T2-ENR-XXX` | Enrolment methods | TBD | not yet received |
| `T2-ROL-XXX` | Roles & capabilities / permission engine | TBD (likely Yaman, as anchor reviewer) | not yet received |
| `T2-PRG-XXX` | Progress & completion | TBD | not yet received |

Generic `R-000`-style entries below predate this split — fine to keep, but new rules should use
the prefixed scheme once you know which file you're working from.

## Entry format

Copy this block for each rule.

```
### R-000 — One-sentence statement of the rule

**Area:** enrolment | roles | groups | progress
**Confidence:** confirmed | probable | UNVERIFIED
**Surprising?** yes/no — and to whom

**Evidence** (DB / UI / observed):

**How to reproduce:**
1.
2.

**Who this hurts:** the human consequence — who gets locked out, loses work, or sees the wrong thing.
**Related:** R-000, hard case #0
```

The **Who this hurts** field is the one that separates a real rules catalogue from a list of
trivia. If you can't name a person it affects, it's probably schema, not a rule.

---

## Index

| ID | Rule | Area | Confidence |
|---|---|---|---|
| | | | |

---

## Rules

<!--
FORMAT EXAMPLE ONLY — this is not a finding. Delete this block once you have R-001.
The point is the shape: a claim, then something that actually happened.

### R-000 — [example of the format, not a real rule]

**Area:** enrolment
**Confidence:** confirmed
**Surprising?** yes — to an admin who assumed removing a method removes the person

**Evidence (observed):** [what you did, what you saw, what the query returned]

**How to reproduce:**
1. [exact clicks]
2. [exact query]

**Who this hurts:** [the actual human]
**Related:** hard case #1
-->

<!-- R-001 starts here -->
