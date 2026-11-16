# Multiple Decisions — Plan Brief

> Full plan: `context/changes/multiple-decisions/plan.md`

## What & Why

A signed-in user can keep up to 20 decisions, type what each one is about, rename a decision and delete it after a confirmation step. Today an account has exactly one decision and the dashboard has no way to change it. Production holds an old test decision ("pizza") that the owner cannot rename, delete or replace.

## Starting Point

`decisions.user_id` is unique, `decisions` has only select and insert policies, and four places (`dashboard.astro`, `/api/options`, `/api/criteria`, `/api/scores`) find the decision from the session. The title is a bare paragraph. Children already cascade on delete.

## Desired End State

`/dashboard` lists the owner's decisions with the current one highlighted, has a "What are you deciding?" form, and for the current decision a rename field and a delete action that first shows what will be removed. Opening another decision shows its own options, criteria, scores and ranking. Another account sees none of it, and a 21st decision is refused.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope | Several decisions, rename, delete | The user wants to type what they decide and not be stuck with one | User, 2026-11-16 |
| Current decision | `?decision=<id>`, default newest created | Links and refresh work, and the server keeps no state | User, 2026-11-16 |
| Delete confirmation | Separate server-rendered step with "Delete permanently" and "Cancel" | Works without JavaScript and a GET never deletes | User, 2026-11-16 |
| Navigation | List above the current decision plus the add form | Everything stays on `/dashboard` | User, 2026-11-16 |
| Limit | 20 decisions, enforced in the API | Protects the database; a trigger is not added (known gap) | User, 2026-11-16 |
| Titles | Duplicates allowed, list ordered by creation | Free text needs no uniqueness rule | Plan |
| Data change | Drop `unique(user_id)`, add update and delete policies, index on `(user_id, created_at desc)` | Smallest change that keeps RLS owner-scoped | Plan |
| Phase 1 dashboard | Still shows one (newest) decision but posts `decision_id` | The app keeps working between phases | Plan |

## Scope

**In scope:**

- Migration, `/api/decisions` create/rename/delete, explicit `decision_id` in options, criteria and scores
- Decision list, add form, rename, delete confirmation, `?decision=` selection, state-sink examples, smoke steps

**Out of scope:**

- Sharing, admin, archive, duplicate, reorder, title uniqueness, a cookie for the last opened decision
- The visual restyle (S-07), the tie wheel (S-05) and model suggestions (S-04)

## Architecture / Approach

Phase 1 names the decision explicitly everywhere on the server side and keeps the UI single-decision. Phase 2 adds the list and the controls. Ids are validated with zod and always filtered by `user_id`, so a foreign id finds nothing.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data and API | Migration, create/rename/delete, `decision_id` in child endpoints, smoke | Missing the migration on production leaves the unique constraint in place |
| 2. Decision list, add, rename, delete confirmation | List, add form, rename, confirmation step, selection, states, smoke | A GET deleting anything, or an unknown id producing an empty page |

**Prerequisites:** Local Supabase and the S-03 migrations. The hosted project already has them (applied 2026-11-16).
**Estimated effort:** About 2 sessions across 2 phases.

## Open Risks & Assumptions

- The Worker deploy does not apply migrations; `npx supabase db push` must run before this code goes live.
- The cap of 20 is enforced only in the API, so direct database access could exceed it.
- The destructive cascade removes scores as well; the confirmation panel has to say so.

## Success Criteria (Summary)

- The owner can type, switch, rename and delete decisions, and sees only their own.
- A delete is never done by a GET and always shows what it removes first.
