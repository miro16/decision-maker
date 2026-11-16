# Weighted Ranking — Plan Brief

> Full plan: `context/changes/weighted-ranking/plan.md`
> Research: `context/changes/weighted-ranking/research.md`

## What & Why

A signed-in user scores the options of their one private decision with integers 1–5 and sees those options ordered by the weighted sum. The PRD asks for that order from scores × weights, without a separate manual calculation. S-02 stored the lists and left the scores and the scale undefined; the user has now answered those questions.

## Starting Point

One decision per account, plus options and criteria with integer weights 1–5, edited on `/dashboard` through form posts. Nothing in `src`, `supabase`, or `scripts` stores a score or computes a ranking. The decision id is taken from the session, not from the form. The dashboard view lives in `src/components/dashboard/DecisionDashboard.astro` under the design-token rules in `AGENTS.md`.

## Desired End State

Once any score exists the owner sees the options ordered by weighted total. An option with missing scores is marked incomplete and its total is the sum of the scores that exist. Equal totals share a rank and are marked as a tie. Another account sees none of it. Choosing a winner among tied options is a separate slice, `tie-breaker-wheel`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Score scale | Integers 1–5 | Same scale as weights; chosen by the user | User, 2026-11-16 |
| Partial grid | Show a ranking with missing scores marked | The user wants to see a ranking before every cell is filled | User, 2026-11-16 |
| Missing score | Contributes nothing and is counted as missing; never treated as 0 | A 0 would be an invented number, and the marker says what is missing | Plan |
| Ties | Equal totals share a rank and show a tie marker; the wheel is a separate slice | The user asked for a wheel that picks one tied option | User, 2026-11-16 |
| Formula | Sum of stored weight × score; higher total ranks higher | That is the rule in the PRD, and `wsm(matrix, weights)` is that sum with no extra scaling | `context/foundation/prd.md:109`; scikit-criteria docs |
| Library | None | scikit-criteria is Python; `weighted-sum` forces weights to sum to 1; `georank` min-max normalizes scores | Research external notes |
| Persistence | Store cells, compute the total on read | The ranking has to follow the weights currently stored | `context/foundation/prd.md:105` |
| Cell identity | One row per option and criterion; RLS checks owner and that both belong to the same decision | A forged id pair must not join two decisions | Plan |
| Delete | Cascade from the option and the criterion | Existing delete routes already succeed and do not mention scores | `src/pages/api/options.ts:45`; `src/pages/api/criteria.ts:46` |
| Screen | Existing `/dashboard`, plain HTML score forms per option | S-02 already kept lists on that page; no client state is needed | S-02 plan-brief |

## Scope

**In scope:**

- A weighted sum with rank, incomplete, and tie reporting in `src/lib/weighted-sum.ts`
- A `scores` table, `/api/scores`, score forms and ranking on the dashboard, state-sink examples, and smoke

**Out of scope:**

- The tie wheel (`tie-breaker-wheel`) and model-suggested criteria (`ai-criteria-suggestions`)
- A ranking library, weight normalization, or min-max normalization of scores
- A second decision, sharing, admin tools, or a stored total

## Architecture / Approach

Phase 1 is a pure function over the scores that exist. Phase 2 writes cells the way criteria are written: form post, decision loaded by `user_id`, RLS through the owning decision. The dashboard calls the function and shows a load error if the option, criterion, or score read fails.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Weighted sum for a partial or complete score set | Totals, ranks, incomplete counts, tie ranks | A helper that fills a missing score with 0 would hide gaps |
| 2. Score cells and the dashboard ranking | Table, endpoint, forms, ranking, markers, smoke | A score policy that checks only one side could join cells across decisions |

**Prerequisites:** Options and criteria from S-02 are on this branch. S-02's manual rows 2.5–2.7 are being closed out.
**Estimated effort:** Not estimated. The roadmap does not give S-03 a duration.

## Open Questions

1. Detailed US-01 acceptance criteria — owned by the user, does not block.
2. Empty option or criterion list — the plan reuses the existing empty text and shows no ranking; confirm.
3. Incomplete options can sit lower only because of missing scores; the marker is the guard.

## Open Risks & Assumptions

- A hosted database does not gain the scores table from a Worker deploy. A human applies the migration.
- `context/foundation/roadmap.md` asked whether weights are 1–5 or 1–10. The criterion check and the S-02 plan already fixed 1–5; scores use the same scale.

## Success Criteria (Summary)

- For any score set, a higher sum of weight × score ranks above a lower one, with no ranking library and no normalization.
- Missing scores are visible, equal totals are marked as a tie, and another account never sees the ranking.
