# Tie-Breaker Wheel — Plan Brief

> Full plan: `context/changes/tie-breaker-wheel/plan.md`
> Research: `context/changes/tie-breaker-wheel/research.md`

## What & Why

When options tie for first place, the user can spin a wheel of fortune that draws one of them. The ranking says the options are equal; the wheel gives a way to decide without changing any score. PRD: FR-012, US-03.

## Starting Point

`rankOptions()` already returns rank, total and completeness, with equal totals sharing a rank. `/dashboard` is server-rendered and has no interactive pieces; React islands exist only for sign-in and sign-up. Smoke is HTTP-only. `chart-*` colour roles exist but have no measured contrast.

## Desired End State

A "Tie-breaker" section under the table appears only when the whole first-place group (at least two options) is fully scored. A wheel with those options spins to a random winner, shows a "Tie-break draw" result with the unchanged-ranking line, and can be spun again. Nothing is stored and nothing in the ranking changes.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Who is eligible | Whole first-place group fully scored, at least two | A partly scored option could still move, so no draw yet | User, 2026-11-17 |
| Spin again | Allowed; every result labelled as a draw | Keeps the wheel usable and honest | User, 2026-11-17 |
| Persistence | Result not stored; gone on reload | No migration; matches the PRD assumption | User, 2026-11-17 |
| Randomness | `crypto.getRandomValues` with rejection sampling, drawn before the animation | No modulo bias and the result always matches the pointer | Plan |
| Reduced motion | Result shown without the animation | Accessibility | Plan |
| Placement | Own section between the table and Manage; never touches table data | The draw must not look like part of the ranking | Plan |
| Code layout | Rule in `weighted-sum.ts`, island in `components/tie-breaker/`, hook in `components/hooks/` | Follows `AGENTS.md` | Plan |
| Process | Full automation across phases | | User, 2026-11-17 |

## Scope

**In scope:**

- Eligibility rule, section, wheel island and hook, smoke cases, states, contrast, scan and `AGENTS.md` rule

**Out of scope:**

- Storing results, server-side randomness, ties below first place, ties with an incomplete option, sound or animation libraries

## Architecture / Approach

Phase 1 delivers the rule and a server-rendered section with smoke coverage. Phase 2 swaps the list for the wheel island. Phase 3 proves states, contrast and narrow screens and leaves the rule. No API or database change; rollback is a revert.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Eligibility rule and section | `tieBreakCandidates`, the section with the tied options, smoke cases | Wrong group when an incomplete option ties at the top |
| 2. The wheel | Island, hook, unbiased draw, labelled result, spin again | Result not matching the pointer; biased draw |
| 3. States, gate and rule | States, measured contrast, 390 px check, scan, `AGENTS.md` | Chart colours may fail label contrast |

**Prerequisites:** `weighted-ranking` and `decision-table-view` are on `main`.
**Estimated effort:** About 2 sessions across 3 phases.

## Open Risks & Assumptions

- The draw and animation are verified in a browser, not by smoke (HTTP only).
- Twenty slices make small labels; names are shortened on the wheel and listed in full as text.

## Success Criteria (Summary)

- The wheel appears only for a fully scored first-place tie, picks one candidate fairly, and labels the result as a draw.
- Ranking and totals never change, smoke passes with the new cases, and the new files pass the literal scan.
