# Decision Table View — Plan Brief

> Full plan: `context/changes/decision-table-view/plan.md`
> Research: `context/changes/decision-table-view/research.md`

## What & Why

The decision is shown as one table: options as rows, criteria (with weights) as columns, and a last column with the option's score (rank, weighted total, markers). The user asked for it so the whole decision reads at a glance. Scores are typed in the cells.

## Starting Point

The dashboard stacks Options, Criteria, Scores and Ranking sections in a narrow card. The page already supplies ordered options and criteria, scores and the ranking, and `/api/scores` already takes one option's row of scores, so nothing server-side changes. Astro wraps React children in `<astro-slot>`, which would break a table built from `.tsx` parts, and the smoke script finds ids by position in the HTML.

## Desired End State

A `Decision table` section with editable 1 to 5 cells, one `Save scores` per row, and a last column with rank, `Total N` and the `incomplete` and `tie` badges. Options and criteria forms live under `Manage options and criteria`. The card is wider and the table scrolls sideways on a phone with the option column kept visible.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Cells | Editable in the table, one Save per row | Uses the existing endpoint with no JavaScript | User, 2026-11-17 |
| Last column | Rank, weighted total, markers | Keeps today's ranking information | User, 2026-11-17 |
| Row order | Entry order, not sorted by rank | Rows do not jump while typing | User, 2026-11-17 |
| Old sections | Scores and Ranking removed; Manage section stays | The table replaces them; names are still edited as before | User, 2026-11-17 |
| Width | Card to `max-w-5xl`, horizontal scroll on mobile | A table needs room | User, 2026-11-17 |
| Save button | In the last cell | Next to the total it affects | User, 2026-11-17 |
| First column | Sticky on mobile | Names stay visible while scrolling | User, 2026-11-17 |
| Markup | Plain `<table>` in `DecisionTable.astro`, `form=` attribute for row forms | `<astro-slot>` breaks React table parts; a form cannot wrap a row | Research |
| Smoke | Re-anchored helpers, per-row ranking assertions | Position-based helpers would silently return wrong ids | Research |
| Process | Full automation, no pauses per phase | | User, 2026-11-17 |

## Scope

**In scope:**

- `DecisionTable.astro`, the view wiring, the Manage section, smoke helpers
- State sink additions, narrow-screen behaviour, scan and `AGENTS.md` rule, screenshots

**Out of scope:**

- API, database, ranking rules, rank sorting, name editing inside the table, client JavaScript, theme changes

## Architecture / Approach

Phase 1 delivers the working table and keeps the smoke check meaningful on the new markup. Phase 2 proves states and narrow screens, adds the file to the literal scan and leaves the rule. Rollback is a revert; no data changes.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Table in the view | `DecisionTable.astro`, sections replaced, wider card, smoke re-anchored | Smoke helpers returning wrong ids after sections move |
| 2. States, responsiveness, gate and rule | New states, 390 px behaviour, scan entry, `AGENTS.md` rule, screenshots | Sticky column and wide tables on a phone |

**Prerequisites:** `futuristic-dashboard-ui` is on `main` (deployed 2026-11-17).
**Estimated effort:** About 1 to 2 sessions across 2 phases.

## Open Risks & Assumptions

- Twenty criteria make a very wide table; horizontal scroll is the accepted answer.
- The sticky first column may need dropping if it clashes with the glow or background.

## Success Criteria (Summary)

- The decision reads as a table, scores can be typed and saved per row, and totals, ranks and markers match today's rules.
- Smoke passes with per-row ranking checks, the new file passes the literal scan, and no horizontal page overflow at 390 px.
