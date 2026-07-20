# Team 2 — People & Enrolment

Four Days Inside Moodle · HTU · 2026-07-20 → 2026-07-23

**Area:** how a person gets into a course, and what they're allowed to do once they're there.
**Target under investigation:** Moodle 5.2.1+ (build 20260714)
**Stack:** FastAPI (Python) + React (TypeScript). No PHP. Moodle is read, never modified.

---

## The one-sentence version

> *(Fill in Thursday: what did you actually learn? One sentence, no jargon.)*

## The centrepiece

`can(user, action, course) -> allowed + why` — reimplementing the permission resolution, with
the reasoning exposed rather than hidden. If only one thing works on Thursday, it's this.

---

## Deliverables

| File | What it is | Status |
|---|---|---|
| [my-design.md](my-design.md) | Monday design from scratch + Wednesday comparison | 🟡 Part 1 in progress |
| [rules-catalogue.md](rules-catalogue.md) | The rules, each with evidence | 🔴 0 / 50 |
| [classification.md](classification.md) | Each rule: essential / accidental / obsolete | ⚪ not started |
| [how-moodle-works.md](how-moodle-works.md) | The model, written so an outsider could build from it | ⚪ not started |
| [schema.sql](schema.sql) | The tables that matter, annotated | ⚪ not started |
| [extraction.md](extraction.md) | How we found things — method, dead ends, what we'd redo | ⚪ not started |
| [what-didnt-survive.md](what-didnt-survive.md) | What we couldn't extract, and honestly why | ⚪ not started |
| [open-questions.md](open-questions.md) | Unknowns, tagged by who can answer | 🟢 seeded, 2 blockers |
| `api.yaml` | OpenAPI spec — generated free by FastAPI, don't hand-write | ⚪ not started |
| `backend/` | FastAPI | ⚪ not started |
| `frontend/` | React | ⚪ not started |
| `tests/hard-cases/` | The 5 hard cases as runnable tests | ⚪ not started |
| `evidence/` | Screenshots and query output backing the catalogue | ⚪ empty |

## Scorecard — where the marks are

| Weight | Criterion |
|---|---|
| 30% | App works on real Moodle data **and** connects to Teams 1 & 3 |
| 25% | Rules catalogue — depth and real evidence |
| 20% | `extraction.md` + `what-didnt-survive.md` — honesty and completeness |
| 15% | The model — could an outsider build from it? |
| 10% | Monday design vs. what was learned |
| **0%** | Presentation. No slides. |

70% of this is writing. Budget accordingly.

## Plan

| Day | Target |
|---|---|
| **Mon** | 90-min paper design first, untouched until Wed · Moodle running · ≥15 rules |
| **Tue** | ≥50 rules · DB map · all 5 hard cases run |
| **Wed** | Classify · compare to Monday design · **freeze interfaces with Teams 1 & 3** · app runs |
| **Thu** | AM build + real connection · early PM stop building, polish docs · late PM demo |

## The traps

- Paper design **before** opening Moodle. Once you've seen their design you can't un-see it.
- Use the **messy** course. Clean test data hides the problems and breaks Thursday. ⚠️ *We don't have it yet — see [open-questions.md](open-questions.md) Q1.*
- Connect to other teams **Wednesday**. Even hardcoded counts. Thursday morning is too late.
- One thing working completely > five half-working. Don't polish CSS.
- Broken by Thursday lunch? Write down *why*, honestly. Worth more than a demo that dodges the hard case.

## Setup

> Not yet — no Moodle is configured. See [open-questions.md](open-questions.md) Q1 before installing anything.
