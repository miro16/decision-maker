# Options and Weighted Criteria — Plan Brief

> Full plan: `context/changes/options-and-weighted-criteria/plan.md`

## What & Why

A signed-in user can add options and weighted criteria to the one private decision they already created. S-03 will multiply scores by those weights; this slice only stores and edits the lists. Without them the ranking has nothing to multiply.

## Starting Point

S-01 stores one title per account in `public.decisions`, with select and insert row-level security only. The dashboard shows that title and hides the title form. There are no option rows, no criterion rows, and no weight field.

## Desired End State

Under `Which laptop?`, the owner sees `MacBook`, then `Price (3)` above a later `Battery (1)`, and can rename, change a weight, or delete a row. A second account does not see those names. A blank name, `macbook` after `MacBook`, a weight outside 1–5, and a 21st option are rejected.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Weight | Integers 1–5 | The later ranking multiplies a score by this weight, and a small scale is enough. |
| After save | Add, rename, change weight, and delete | A typo or a wrong weight should not be stuck for the life of the decision. |
| How many | 0–20 options and 0–20 criteria, no minimum | The user builds the lists one row at a time; S-03 decides when a ranking can appear. |
| Fields | Option is a name; criterion is a name and a weight | FR-004 and FR-005 ask for options and weighted criteria, not notes. |
| Duplicate names | Rejected per decision, ignoring case after trim | Two labels that read the same would be indistinguishable on the later ranking. |
| Order | Insertion order | The list stays in add order without a reorder control. |
| Name length | 1–200 characters after trim | The same limit already used for the decision title. |
| Screen | `/dashboard`, under the title | The user already lands there after sign-in; this slice does not add a second page. |

## Scope

**In scope:**

- `options` and `criteria` tables under the existing decision, with owner select, insert, update, and delete
- Dashboard lists and plain HTML forms to add, rename, reweight, and delete
- Smoke proof of the happy path, privacy, duplicate name, bad weight, and the 21st option

**Out of scope:**

- Scores and the weighted ranking
- A second decision, sharing, or an admin panel
- Notes, drag-and-drop order, and weights that must sum to 100
- Editing or deleting the decision title

## Architecture / Approach

Two child tables reference `decisions.id`. Policies allow only the parent decision's owner through, and `decisions` itself stays select-and-insert only. The dashboard reads both lists by `position`. Forms post to `/api/options` and `/api/criteria`, which load the decision from the session. The database assigns `position`, caps each table at 20 rows, and rejects a case-insensitive duplicate name.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Option and criterion tables | Schema, caps, uniqueness, and owner policies | A cap trigger that cannot see existing rows would allow a 21st insert |
| 2. Dashboard lists | Forms, endpoints, and smoke for add, edit, delete, and privacy | The current dashboard hides `?error=` once a title exists |

**Prerequisites:** S-01 is in place: one private decision, the dashboard title, and local Supabase for `db reset` and smoke.
**Estimated effort:** About two sessions, one per phase.

## Open Risks & Assumptions

- Case-insensitive uniqueness depends on an expression index. A plain unique column would store both `Dell` and `dell`.
- Hosted Supabase does not get these tables until a human applies the migration. A Worker deploy alone does not create them.
- S-03 will consume `position` order, names, and integer weights 1–5. This plan does not define the score scale.

## Success Criteria (Summary)

- The owner of a decision can add up to 20 options and 20 criteria, see criterion weights as `Price (3)`, and rename, reweight, or delete those rows.
- Another account cannot see those names.
- A blank name, a case-insensitive duplicate, a weight outside 1–5, and a 21st row are rejected and not stored.
