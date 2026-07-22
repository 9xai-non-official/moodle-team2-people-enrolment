# Team 2 — Task Documents

Four phases, in the order they happened. Each folder is one phase; the number in a
filename is the owner's slot, stable across phases where possible.

| Phase | Folder | What it is | Added |
|---|---|---|---|
| 1 | [day1-testing/](day1-testing/) | Testing assignments — test cases against live Moodle, one area per owner | 2026-07-20 |
| 2 | [day2-investigation/](day2-investigation/) | Individual Moodle investigation guides — source reading + DB inspection | 2026-07-21 |
| 3 | [day2-build-assignments/](day2-build-assignments/) | Build assignments for the replica app on `staging` — the actual implementation briefs | 2026-07-21 |
| 4 | [day3-work-packages/](day3-work-packages/) | Work packages converting the parity audit into implementation plans (`team2/parity-fixes`) | 2026-07-22 |

Phases 2 and 3 both landed on day 2 and both carry the `day2-` prefix; they are
different artefacts, so they stay in separate folders. Phase 3 has its own
[README](day2-build-assignments/README.md) with the binding ground rules.

Work package 01 was further split into per-engineer slices later on day 3 — see
[day3-work-packages/01-yaman-enrolment-engineers/](day3-work-packages/01-yaman-enrolment-engineers/).
Only that one package is split so far; the other four are still single documents.

## Who owns what

| Owner | day1-testing | day2-investigation | day2-build-assignments | day3-work-packages |
|---|---|---|---|---|
| Yaman | anchor reviewer | anchor reviewer | 01 enrolment | 01 enrolment |
| Mahdi | 04 progress | 05 progress & completion | 02 progress | 02 progress |
| Issa / Essa | 01 enrolment | 02 enrolment & lifecycle | 03 database · 06 frontend | 03 database |
| Khaled | 02 roles & permissions | 03 roles, permissions & contexts | 04 roles | 04 roles |
| Mahmoud | 03 groups (+ task guide) | 04 groups & groupings | 05 groups | 05 groups |

Two things that look like mistakes but are not:

- **Yaman has no day1/day2 file.** He was the anchor reviewer for those phases, not an
  investigator — which is why `day2-investigation/` starts at `02`.
- **"Issa" and "Essa" are the same person.** The day-3 work package spells it *Essa*;
  every earlier document spells it *Issa*. Filenames preserve whatever their own
  document uses, so search both.

Enrolment moved from Issa (phases 1–2) to Yaman (phases 3–4) when Issa took the
database bootstrap and then the frontend full-time — see
[day2-build-assignments/03-issa-database.md](day2-build-assignments/03-issa-database.md).

## Conventions

Filenames are `NN-owner-domain.md`, lowercase, hyphen-separated. `NN` is the owner slot
within that phase.

## Moved in the 2026-07-22 reorganisation

Old links to these paths will be dead:

| Was | Now |
|---|---|
| `tasks/day1/0N_owner_area_testing.md` | `tasks/day1-testing/0N-owner-area.md` |
| `tasks/day2/0N-Owner-Area.md` | `tasks/day2-investigation/0N-owner-area.md` |
| `tasks/day3/0N-Owner-Area.md` | `tasks/day3-work-packages/0N-owner-area.md` |
| `tasks/assignments/` | `tasks/day2-build-assignments/` |
| `tasks/mahmoud-groups-groupings-task-guide.md` | `tasks/day1-testing/03-mahmoud-groups-task-guide.md` |
| `tasks/05-mahmoud-groups.md` | deleted — byte-identical copy of `day2-build-assignments/05-mahmoud-groups.md` |

References in `docs/TEAM2-MASTER-REFERENCE.md`, `rules-catalogue.md` and
`moodle-replica/backend/app/services/enrolment.py` were updated in the same change.
