# First private decision — Plan Brief

> Full plan: `context/changes/s01/plan.md`

## What & Why

A signed-in user needs one private decision they can see on their own account. Registration and sign-in already work. This slice stores a single title for that user and shows it on the dashboard, so later slices have a private decision to attach options and scores to.

## Starting Point

The app has Supabase email/password auth, a session loaded in middleware, and a protected `/dashboard` that shows the user's email and a sign-out form. There is no decision table, no decision API, and no decision UI.

## Desired End State

The user submits `Which laptop?` on the dashboard and then sees that title, with the create form gone. A later submit of `Which city?` does not replace it. Another account does not see `Which laptop?`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Slice boundary | Create and show one private title; leave ranking to later slices | S-01 is the first saved decision, not the weighted ranking | Roadmap |
| Fields | Title only, required, trimmed, 1–200 characters | The roadmap asked for the minimum beyond a title, and nothing in this slice uses a note | Plan |
| One decision | Keep the first title; do not offer, store, rename, or delete a second | Submitting `Which city?` after `Which laptop?` must still show only `Which laptop?` | Plan |
| Screen | Existing `/dashboard`, plain HTML form post | The page is already protected and the form has no client state | Plan |
| Privacy | Select and insert policies on `auth.uid()`, plus a unique `user_id` | Hiding the form is not enough; another account and a direct second post must both fail | Roadmap |

## Scope

**In scope:**

- `decisions` table with one title per account
- Dashboard form that disappears after the title is saved
- Smoke proof that a second account does not see `Which laptop?` and that `Which city?` is not stored

**Out of scope:**

- A second decision, rename, or delete
- A note or description
- Options, criteria, scores, and the ranking
- Sharing, admin tools, and changes to sign-in

## Architecture / Approach

One owner-scoped table. The dashboard reads that user's row and either posts `title` to `/api/decisions` or renders the stored title. The API copies `user_id` from the session. Row-level security and a unique owner column enforce privacy and the one-title rule even if the form is skipped.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Owner-scoped decision table | One title per account, select and insert only | An update or delete policy would allow the rename and delete this slice refused |
| 2. Dashboard create and show | The user sees `Which laptop?`; smoke checks the other account and the rejected `Which city?` | `/api/decisions` is not covered by `PROTECTED_ROUTES`, so the handler must reject an anonymous caller itself |

**Prerequisites:** Working Supabase auth from the baseline, Docker for local `supabase db reset`, and the existing CI smoke job.
**Estimated effort:** About two sessions across two phases.

## Open Risks & Assumptions

- Applying the migration to hosted Supabase is a separate human approval. Local reset does not update production.
- Rolling back the Worker does not remove the table.
- Middleware is assumed to set `context.locals.user` on API routes, as it does for pages. The handler still redirects when that user is missing.

## Success Criteria (Summary)

- The owner sees `Which laptop?` on the dashboard and no longer sees the create form.
- `Which city?` is not stored or shown after that.
- A second account does not see `Which laptop?`.
