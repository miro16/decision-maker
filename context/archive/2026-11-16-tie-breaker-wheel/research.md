---
date: 2026-11-17T21:30:00+01:00
researcher: Cursor agent
git_commit: a86b1df
branch: feat/tie-breaker-wheel
repository: decision-maker
topic: "What the codebase offers for a first-place tie-breaker wheel (FR-012, US-03)"
tags: [research, ranking, tie, react-island, smoke]
status: complete
last_updated: 2026-11-17
last_updated_by: Cursor agent
---

# Research: First-place tie-breaker wheel

## Research Question

What already exists that a wheel of fortune can build on, which words in FR-012 and US-03 leave room for two readings, and what constrains a client-side wheel in this Astro and React setup?

## Summary

`rankOptions()` in `src/lib/weighted-sum.ts` already returns, for every option, `rank`, `total` and `complete`; equal totals share a rank (1, 1, 3), so the first-place group is `rank === 1`. `src/pages/dashboard.astro` computes that ranking server-side and passes it to the view. Nothing in the app is interactive on `/dashboard` today: React islands exist only for the sign-in and sign-up forms (`client:load`). The PRD fixes the wheel as client-side, first place only, fully scored options only, result not stored (`context/foundation/prd.md`, Open Question 11 and the "assumed" text in `change.md`). The open readings were settled with the user on 2026-11-17 (see Open Questions below).

## Detailed Findings

### Ranking data

- `RankedOption` carries `optionId`, `total`, `scored`, `missing`, `complete` and `rank` (`src/lib/weighted-sum.ts:12-25`, this inspected file). `rankOptions` returns `null` when no score exists. Display order inside a tie is input order and has no meaning, so the wheel must not use it as a tiebreak.
- A first-place group can mix complete and incomplete options with the same total, because an incomplete option's total is the sum of the scores it has. This case is the one that FR-012's wording ("fully scored") does not settle on its own.

### View and page

- `src/pages/dashboard.astro` loads options, criteria and scores, computes `ranking` with the names added (`dashboard.astro:103-114`) and passes it to `DecisionDashboard.astro`, which hands it to `DecisionTable.astro`. A tie candidate list can be derived at the same place and passed as one more prop; no query changes.
- Smoke steps already create the shapes a tie needs: two options with equal totals (`ScoreA` and `ScoreB`, Total 7) plus an incomplete third (`scripts/smoke.mjs`, the equal-totals steps). `tableOnly()` slices the table section between `>Decision table<` and `>Manage options and criteria<`; a new section between them needs its own slice helper.

### Client-side constraints

- React 19 islands are used only in `src/pages/auth/signin.astro:14` and `signup.astro:14` (`client:load`). `AGENTS.md`: write `.tsx` only for state, effects or handlers, group by feature, put hooks in `src/components/hooks/`, no `"use client"`. A wheel has state (rotation, winner, spinning) and a click handler, so it is a `.tsx` island in a new `src/components/tie-breaker/` folder with its hook in `src/components/hooks/`.
- Colour roles `chart-1` to `chart-5` exist and are published as `--color-chart-*` (`src/styles/global.css:105-109`), so `fill-chart-N` utilities are available without literals. Their dark values were set in `futuristic-dashboard-ui` and have no measured contrast against label text yet.
- The literal scan covers four view files; the new island files are not scanned yet and must be added.
- Children of non-hydrated React components are wrapped in `<astro-slot>`, but a hydrated island renders its own markup, so the wheel is not affected.
- Fair randomness in the browser: `crypto.getRandomValues` with rejection sampling avoids modulo bias; `Math.random` would also work but is weaker for a decision tool.

### Accessibility

- A spinning wheel needs a real button, a text list of candidates for screen readers, an `aria-live` result, and a reduced-motion path (`prefers-reduced-motion`) where the result shows without the animation. Focus ring comes from existing tokens.

## Code References

- `src/lib/weighted-sum.ts:12-25,81-91` - `RankedOption`, ranks that share a value for equal totals
- `src/pages/dashboard.astro:103-114` - ranking computed with names
- `src/components/dashboard/DecisionDashboard.astro`, `DecisionTable.astro` - where the section lives
- `src/pages/auth/signin.astro:14` - existing island with `client:load`
- `src/styles/global.css:105-109` - `--color-chart-*` roles
- `scripts/smoke.mjs` - `tableOnly`, equal-totals steps; `scripts/scan-dashboard-literals.mjs` - literal scan list

## Architecture Insights

- The eligibility rule is pure (ranking in, candidate ids out), so it belongs in `src/lib` next to `rankOptions` and is exercised by smoke through the rendered page; the random draw is client-only and not stored, so no API or migration is involved and RLS is untouched.
- The result must not look like part of the ranking: it lives in its own section below the table and carries its own "Tie-break draw" label; the ranking and totals are rendered from server data and never change client-side.

## Historical Context (from prior changes)

- `context/changes/weighted-ranking/` - defined ranks, tie marker and incomplete reporting that the wheel reads.
- `context/changes/decision-table-view/` - the table and the `tableOnly` helpers the new section sits next to.
- `context/changes/futuristic-dashboard-ui/` - tokens, chart roles, `Badge`, `Card`, contrast method (`tokens.md`).

## Related Research

- `context/changes/weighted-ranking/research.md` - tie behaviour of the ranking.

## Open Questions

Settled with the user on 2026-11-17:

1. First place mixes complete and incomplete options with the same total: the wheel appears only when every option in the first-place group is fully scored (and there are at least two).
2. After a result the wheel can be spun again; every result is labelled as a draw.
3. The result is not stored; it disappears on reload.
