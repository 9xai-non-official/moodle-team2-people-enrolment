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

### 🔴 Q4 — Version mismatch with the brief

The tree on disk is **Moodle 5.2.1+**, which is current, not the twenty-year-old system the
brief describes. The archaeology is *inside* the code — old decisions preserved for backwards
compatibility — rather than in the version number. Worth checking whether the shared instance
(if there is one) runs the same version; if it's older, our findings may not transfer.

### 🟡 Q5 — What is the table prefix?

Unknown until a Moodle is actually configured — no `config.php` exists yet, only the untouched
`config-dist.php`. Every query we write in this repo should use a placeholder until confirmed,
because the prefix is a per-install choice, not a constant.

---

## Answered

<!-- move things here with the answer and the date, don't delete them -->
