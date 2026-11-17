---
date: 2026-11-17T20:30:00+01:00
researcher: Cursor agent
git_commit: c60f9f4
branch: feat/decision-table-view
repository: decision-maker
topic: "What it takes to show a decision as a table of options by criteria with a score column"
tags: [research, ui, dashboard, table, astro, smoke]
status: complete
last_updated: 2026-11-17
last_updated_by: Cursor agent
---

# Research: Decision as a table of options by criteria

## Research Question

How does `/dashboard` show a decision today, which parts of the code and tests depend on that layout, and what constrains a table with options as rows, criteria as columns and a score in the last column?

## Summary

Today the decision is a stack of sections inside one `max-w-2xl` card: Options (a card per option with rename and delete forms), Criteria (the same), Scores (one form per option with one field per criterion) and Ranking (an ordered list). All of it is one file, `src/components/dashboard/DecisionDashboard.astro`; the page `src/pages/dashboard.astro` already supplies everything a table needs (options and criteria ordered by `position`, scores, and the computed ranking), so no query, API or database change is required. The real constraints are three: Astro wraps the children of a non-hydrated React component in `<astro-slot>`, which would break a `<table>` built from `.tsx` parts; a table row cannot sit inside a `<form>`; and `scripts/smoke.mjs` finds ids and ranking text by position in the HTML, so moving sections breaks several of its helpers.

## Detailed Findings

### Current layout (view)

- The decision body is `DecisionDashboard.astro`: Options section, Criteria section, Scores section (`canScore` only), Ranking section (`canScore` only). The page card is `max-w-2xl` (`DecisionDashboard.astro:81`, this inspected file). A table with up to 20 criteria cannot fit that width.
- Scores are written by `src/pages/api/scores.ts`: it takes `decision_id`, `option_id` and one `score_<criterionId>` field per criterion, validates every cell (1 to 5, blank clears) before writing, so a row-per-option form maps one to one onto the existing endpoint.
- `src/pages/dashboard.astro` orders options and criteria by `position` ascending (`dashboard.astro:66,71`) and passes `ranking` (null when there are no scores; otherwise rank, total, missing per option). Ranks skip after a tie (rank 1, 1, 3), computed in `src/lib/weighted-sum.ts`.

### Shared components and the `astro-slot` quirk

- `src/components/ui` has `alert`, `badge`, `button`, `card`, `input`, `label`; there is no `table`. The earlier change `futuristic-dashboard-ui` found that children of a non-hydrated React component are wrapped in `<astro-slot>` (its Phase 2 notes). Inside `<table>`/`<tr>` that wrapper is invalid HTML, and the parser may move it out of the table. A shadcn `table.tsx` built from `TableRow` and `TableCell` would therefore break the layout. A plain `<table>` in an `.astro` file avoids the problem. `AGENTS.md` says to write `.tsx` only for state, effects or handlers, so a plain-element table in an `.astro` component also follows the repo rule.
- `Input` and `Button` can sit inside cells: `Input` has no children; `Button` wraps its label in `<astro-slot>`, which is inline-safe (`display: contents`).

### Forms inside a table

- A `<form>` cannot wrap a `<tr>` (invalid HTML). The HTML `form="<id>"` attribute lets inputs and the submit button in different cells belong to one form that sits in a single cell, with no JavaScript. The `Input` component forwards `...props`, so `form` reaches the element.
- One form per option row posts to `/api/scores` with hidden `decision_id` and `option_id`; the cell inputs are named `score_<criterionId>` exactly as today, so the API and its validation stay unchanged.

### Smoke test coupling (`scripts/smoke.mjs`)

- `rankingOnly()` slices the body from `>Ranking<` onward (`smoke.mjs:55`); every ranking assertion (`Total 20`, `>1.<`, `>tie<`, `incomplete (N missing)`, `No scores yet`) goes through it.
- `hiddenIdAfter(body, marker)` returns the first `name="id"` value after the first occurrence of the marker (`smoke.mjs:47-51`). `scoreIds()` uses it with the option names (`ScoreA`..`ScoreC`) and the criterion labels (`Price (3)`, `Battery (1)`), and the option deletes at `smoke.mjs:404-413` do the same. With the names now appearing first in the table (which has no `name="id"` field), the next `name="id"` would belong to a different option or criterion: the helpers would silently return wrong ids. They must anchor on the manage section instead.
- Order assertions (`bodyOrder: ScoreA before ScoreB before ScoreC`) prove ranking order today. With rows fixed in entry order they would pass trivially, so ranking must be asserted per row (the row of ScoreA contains `Total 20` and `1.`), which is a stronger check.
- The text markers `Total N`, `>1.<`, `>tie<`, `incomplete (N missing)`, `No scores yet`, `Price (3)` can stay in the table if the cells render them as the same visible strings.

### Rules that apply to the view

- `scripts/scan-dashboard-literals.mjs` scans three files and fails on literal colours and arbitrary px/rem values (`-[12px]`). A new `src/components/dashboard/DecisionTable.astro` is not in the list; it must follow the same rules and should be added to the scan (the scan is how `AGENTS.md` keeps the view on tokens).
- `AGENTS.md` UI rules: role tokens only, `shadow-glow` for glow, `Badge` for markers, `Alert` for errors, `cn()` for class merging.
- Contrast is already measured for `foreground`, `muted-foreground`, `ring` and `border` on `background` and `card` (`context/changes/futuristic-dashboard-ui/tokens.md`, "Measured contrast"); a table that uses only those pairs needs no new measurement.

## Code References

- `src/components/dashboard/DecisionDashboard.astro` - the whole dashboard view; Options, Criteria, Scores, Ranking sections; page card `max-w-2xl`
- `src/pages/dashboard.astro:66,71,103-114` - ordering by `position`, ranking computed and named
- `src/pages/api/scores.ts` - per-option score form handling, unchanged
- `src/lib/weighted-sum.ts` - `rankOptions`, ranks that skip after ties
- `scripts/smoke.mjs:47-58,92-118,300-420` - positional helpers and ranking assertions
- `scripts/scan-dashboard-literals.mjs` - three-file literal scan
- `src/pages/dev/dashboard-states.astro` - state sink for the view

## Architecture Insights

- The data flow already delivers a matrix: `scores` keyed by `option_id` and `criterion_id` (`scoreValues` map in the view). The change is presentation plus the shape of the score form.
- Making the table its own `.astro` component keeps `DecisionDashboard.astro` from growing and gives the table classes one home, in line with the `futuristic-dashboard-ui` lesson (repeated class strings drift).
- The change is safe for data: no migration, no endpoint, RLS untouched.

## Historical Context (from prior changes)

- `context/changes/weighted-ranking/` - introduced the Scores and Ranking sections and the smoke assertions this change moves.
- `context/changes/futuristic-dashboard-ui/` - the tokens, glow, `Badge`, `Alert`, `buttonVariants`, the `astro-slot` finding and the state sink conventions.
- `context/changes/multiple-decisions/` - the decision list and the `?decision=` selection the table lives under.

## Related Research

- `context/changes/futuristic-dashboard-ui/research.md` - audit of the same view for the theme.

## Open Questions

1. Where the row's "Save" button sits (last column under the score summary, or in the first column under the option name) is a layout call for the plan; the plan puts it in the last cell and checks it in screenshots.
2. Whether the first column should stay visible while the table scrolls sideways on a phone (sticky column) is a polish decision; the plan includes it with a fallback of dropping it if it breaks the glow or background.
