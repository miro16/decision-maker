---
change_id: multiple-decisions
title: Several decisions per account, titled by the user
status: implementing
created: 2026-11-16
updated: 2026-11-16
archived_at: null
---

## Notes

The user wants to type what they are deciding about themselves ("o czym decydujemy"), and not be stuck with one decision per account. Today the dashboard shows one decision as a bare title (found live on production: an old test decision "pizza" that cannot be renamed, deleted or replaced), and `decisions` has a unique `user_id`.

Scope decided with the user on 2026-11-16 (FR-009 promoted from nice-to-have for this change):

- A list of the account's decisions, a form to add a new one (the title is the user's own words), selecting a decision opens its options, criteria, scores and ranking as today.
- Rename a decision and delete a decision (with confirmation; cascades to options, criteria and scores).
- A clear label for the title ("Decision" / "O czym decydujesz") so it is obvious what the heading is.
- Needs a migration that drops the one-decision-per-user unique constraint (RLS stays owner-scoped), `/api/decisions` create, rename and delete, and a way to pick the current decision (e.g. `?decision=<id>` on `/dashboard`).
- Visual restyle is a separate change: `futuristic-dashboard-ui`, which runs after this one so it also covers the new controls.

Open questions for `/10x-plan`: how the current decision is chosen when none is in the URL (latest created?), ordering of the list, whether delete needs a typed confirmation, how the smoke test covers two decisions plus isolation between accounts.
