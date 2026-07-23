# my-design.md — People & Enrolment, designed from scratch

**Author:** Mahmoud Sadder · Team 2 — People & Enrolment
**Written:** Monday 2026-07-20, before investigating Moodle
**Rule:** Do not edit Part 1 after Monday. Part 2 gets filled in Wednesday.

---

## ⚠️ Honesty note — read before you start

Two disclosures that belong in this file, because the brief scores honesty:

1. **I have not opened Moodle yet.** (If that stops being true before you finish Part 1, say so here.)
2. **Partial contamination.** Before starting this document I was given a verbal sketch of how Moodle
   models this area — enrolment rows vs. role assignments as separate things, a nesting context
   hierarchy, capability values including a "prohibit that beats everything", and group modes.
   So Part 1 is *not* a clean-room design. Where an idea below came from that sketch rather than
   from my own reasoning, it is tagged **[contaminated]**.

Being straight about this is worth more than pretending. The Wednesday comparison is more
interesting when you can see which of your instincts were yours.

---

## How to use the next 90 minutes

Answer in prose, not bullets — prose forces you to commit to a position. Where you don't know,
write "I don't know, and here's my guess" rather than skipping. A guess you can be wrong about
is worth more on Wednesday than a blank.

Suggested clock:

| Minutes | Section |
|---|---|
| 0–20 | Part 1.1 — Entities |
| 20–40 | Part 1.2 — Getting in |
| 40–65 | Part 1.3 — What you're allowed to do |
| 65–80 | Part 1.4 — Visibility |
| 80–90 | Part 1.5 — Predictions |

Set a timer. When it ends, commit and close the file.

---

# Part 1 — My design (Monday, frozen)

## 1.1 Entities

What are the nouns in this area? For each: what does it exist to represent, what does it own,
and what would break if you deleted it?

> Prompt: You almost certainly want something like *person* and *course*. The interesting question
> is what sits **between** them, and whether that in-between thing is one concept or several.
> Resist writing "user has a role in a course" until you've asked whether "being in the course"
> and "being allowed to do things" are actually the same fact.

_Your answer:_

<!-- write here -->

## 1.2 Getting in — how does a person become part of a course?

_Prompt questions:_

- How many *ways* in should exist? (Added by hand? Self-signup? Automatic, by some property of the person?)
- Can a person be in a course by more than one route **at the same time**? If yes — is that one
  membership with two reasons, or two memberships? Commit to one.
- What states can a membership be in, besides "in" and "not in"? Does time matter (starts, ends)?
- **The disagreement question:** person is in via route A and route B. Route B is switched off.
  What happens? Now: route A says active, route B says suspended. What is the person's state?
  Write the rule you would implement, in one sentence.
- What happens to their work — submissions, grades, posts — when they leave? Does "leave" have
  more than one meaning?

_Your answer:_

<!-- write here -->

## 1.3 Permission — how do you answer "can this person do this thing here?"

This is the centrepiece of your app, so spend the most time here.

_Prompt questions:_

- Is permission attached to the person, to their membership, or to something else entirely?
- Is a permission a flat list, or does it need to be resolved by walking something?
- Does permission granted somewhere broad apply somewhere narrow? What if they conflict —
  who wins, the more specific or the more permissive? **[contaminated — you've been told Moodle's
  answer; write what *you* think is right and note where you disagree with what you were told]**
- Do you need a way to say "definitely not, and no override can save you"? Why would a system
  ever need that, as opposed to just "no"?
- Sketch the function signature. `can(person, action, where) -> ?` — does it return a boolean?
  Something richer? The brief wants "and **why**" — what does the *why* look like as a data structure?

_Your answer:_

<!-- write here -->

## 1.4 Visibility — who can see whom?

_Prompt questions:_

- Is "which people can I see" the same question as "what am I allowed to do"? Argue it either way,
  then pick.
- If people are partitioned inside a course, can a person be in two partitions at once?
  What does that do to the "who can I see" answer? Is that a bug or a feature?
- Should this be a per-course setting, or a per-activity setting, or both?
- Who is allowed to ignore the partitioning entirely, and how is that expressed —
  a flag on the person, or just another permission?

_Your answer:_

<!-- write here -->

## 1.5 Predictions — commit before you look

Write your best guess at the answer to each hard case. **Being wrong here is fine and expected.**
Wednesday's comparison is worth 10% and it only works if you actually committed.

| # | Hard case | My prediction (Monday) | Confidence |
|---|---|---|---|
| 1 | Enrolled manually **and** by auto-sync; sync removed. Still enrolled? | | |
| 2 | Drops week 10, re-enrols week 12. What happened to the work in between? | | |
| 3 | TA can mark group A, not B, can't see C. What combination produces that? | | |
| 4 | Student in two groups; activity set to separate groups. Who sees what? | | |
| 5 | 3 years of progress across all courses, including deleted ones. What survives? | | |

Also predict, in one line each:

- Roughly how many tables do you think this area needs? _____
- What's the single thing you expect Moodle got **wrong**? _____
- What's the single thing you expect Moodle got **right** that you wouldn't have thought of? _____

---

# Part 2 — What I got wrong (Wednesday only)

> **Do not write here before Wednesday.** Filling this in early defeats the exercise.

For each: what I assumed → what's actually true → why the difference exists → who was right.

That last column matters. Sometimes Moodle is right and your design was naive. Sometimes your
design is genuinely better and Moodle is carrying twenty years of backwards compatibility.
Say which, and defend it — "Moodle is more complex, therefore worse" is not an argument.

## 2.1 Entities

## 2.2 Getting in

## 2.3 Permission

## 2.4 Visibility

## 2.5 Prediction scorecard

| # | Predicted | Actual | Right? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

## 2.6 What I'd keep from my design

The honest version of this section names at least one thing where your Monday design was
better, and at least one where it was worse.
