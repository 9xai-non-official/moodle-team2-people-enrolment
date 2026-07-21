# Open Questions

Things we don't know, tagged by who can answer them. Keep this alive all four days —
the brief scores honesty, and a well-kept list of unknowns is evidence of rigour, not sloppiness.

Status: 🔴 blocking · 🟡 needed soon · 🟢 curiosity

---

## For the organiser — ask today

### 🔴 Q1 — Where is the messy course?

The brief says to use the messy course provided, and warns explicitly that inventing clean test
data hides the exact problems the hard cases are about, and breaks Thursday's cross-team demo.

**We cannot find it.** Searched `moodle-project/`, `hackathon-files/`, and inside
`hackathon-files.zip`: no `.sql`, `.sql.gz`, `.dump`, or `.mbz`. The only `.mbz` files on the
machine are Moodle's own PHPUnit fixtures.

**Now confirmed from the live database** (2026-07-20, local instance):

| courses | real users | enrol rows | user_enrolments | role assigns | groups | group members |
|---|---|---|---|---|---|---|
| 2 | 1 | 6 | 2 | 2 | **0** | **0** |

The site is a blank demo install. Concretely, this means:

- **Hard cases 3 and 4 cannot be run at all** — both are about group visibility, and there are
  zero groups and zero group members.
- **Hard case 1 cannot be run** — it needs manual *plus* an auto-sync method, but only `manual`,
  `guest`, and `self` plugins have instances here. No cohort sync exists.
- **Hard case 5 cannot be run** — it needs three years of history across deleted courses.
  There is one real user and two courses.

So this is not a nice-to-have. Four of the five hard cases are blocked on getting their data.

Ask specifically:
- Is there a **shared Moodle instance** all three teams point at? (URL + admin credentials)
- Or a **database dump / course backup** we're meant to restore locally?
- If local: which **DB engine** — so all three teams match, since schema and Thursday's
  integration depend on it.

*Why this is blocking:* a fresh install gives us an empty site. Every one of the 5 hard cases
needs pre-existing messy data — a student who dropped in week 10, a TA with tangled group access,
three years of history, deleted courses. We cannot manufacture that convincingly, and if we try,
our data won't match Team 1's or Team 3's on Thursday.

### 🟡 Q2 — Which brief is live?

`hackathon-files/` is the reference pack for a **different** brief that was sitting inside it:
`Course-Production-OS_Hackathon-Brief.pdf` (HTU Digital Learning Center — 6-phase workflow,
12 roles, AI/QM scoring). Its section 10 reference pack maps exactly onto the folder contents
(ID & media production spec, production Excel sheets, QM rubric, Rise + outline templates).

Working assumption: **the Moodle sprint is live.** Every date in the Course Production OS brief
is an unfilled `[INSERT]` placeholder and its footer says those are for organisers to complete
before distribution — it reads as undistributed. The Moodle brief has real Mon–Thu dates.

Worth one message to confirm, because the two briefs share almost nothing: different stack rules,
different deliverables, different scorecard (Moodle: 0% presentation; CPO: demo video required).

### 🟡 Q3 — Interface contract with Teams 1 and 3

Needs answering **Wednesday, not Thursday** — the brief says leaving the connection to Thursday
morning is what kills teams.

- What does Team 1 / Team 3 need *from* us? Best guess: "is this person allowed to do X in
  this course" and "who is enrolled here".
- What do we need *from* them?
- Agree on user and course **identifiers** early. If they key on Moodle's internal ids and we
  key on something else, nothing connects.

---

## For the code — answer by investigating

Move these into `rules-catalogue.md` once answered with evidence.

### 🟡 Q4 — We are investigating a pre-release build. Does it matter?

**Decision made 2026-07-20:** we are running **Moodle 5.3dev (Build 20260605), `MATURITY_ALPHA`**,
installed via `Moodle4Mac-503.dmg`. Moodle 5.3 does not reach general release until 2026-10-05.

This was not the original plan — we had also downloaded the 5.2.1 stable source
(build 20260714, i.e. *newer* than this alpha snapshot). Recording the reasoning honestly:

- **Risk:** we are documenting behaviour from unreleased alpha code. Anything we catalogue could
  change before 5.3 ships, and it may not match what Teams 1 and 3 see if they run stable.
- **Mitigation:** we read source from the *same tree we run* (`/Applications/MAMP/htdocs2/moodle503/public`),
  not from the separate 5.2.1 download. So any disagreement between code and observed behaviour
  is a genuine finding, not version drift.
- **Why it's probably tolerable:** enrolment, roles/capabilities, and groups are the oldest and
  most stable subsystems in Moodle. Alpha churn lands on new features, not `lib/accesslib.php`.

**Open:** if Teams 1/3 or the shared instance run 5.2 or older, re-check any rule that looks
version-sensitive. MAMP's `htdocs2/` can host a second site, so standing up 5.2.1 alongside for
differential testing is ~15 minutes if it becomes necessary — and any behavioural difference
between the two would itself be a catalogue entry.

### 🟢 Q6 — Why did MySQL 8.0.35 install cleanly?

Moodle 5.2.1's `admin/environment.xml` states a minimum of **MySQL 8.4**, and Moodle's own
download page warns MAMP's MySQL doesn't meet 5.x requirements. Yet this install runs on the
bundled **MySQL 8.0.35** without complaint. Either 5.3 relaxed the requirement or the installer
let it through. Low priority, but if we hit strange SQL behaviour, look here first.

---

## Answered

### ✅ Q5 — What is the table prefix? → `mdl_` (2026-07-20)

Confirmed from `/Applications/MAMP/htdocs2/moodle503/config.php`. Still a per-install choice, so
if we ever point at the organiser's shared instance, re-check it before trusting any query.

### ✅ Q7 — How do we get at the database? → `./db.sh` (2026-07-20)

MAMP puts MySQL on a non-standard port and buries the client. Recorded so nobody re-derives it:

| | |
|---|---|
| Site | http://localhost:8888/moodle503 |
| MySQL port | **8889** (not 3306) |
| mysql client | `/Applications/MAMP/Library/bin/mysql80/bin/mysql` |
| DB / user | `moodle503` / `moodle` |
| Source tree | `/Applications/MAMP/htdocs2/moodle503/public` |
| moodledata | `/Applications/MAMP/data/moodle503` |

`./db.sh "SELECT ..."` wraps all of it and reads credentials from `config.php` at runtime,
so no password is committed to this repo.

**Baseline for later comparison** — the permission surface is **757 rows in `mdl_capabilities`**,
and 8 roles ship by default (manager, coursecreator, editingteacher, teacher, student, guest,
user, frontpage).
