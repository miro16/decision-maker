# Weighted Ranking Implementation Plan

## Overview

A signed-in user scores each option against each criterion of their one private decision with integers 1–5 and sees the options ordered by the weighted sum. The ranking appears as soon as at least one score exists. An option with missing scores is shown with a visible "incomplete" marker instead of being hidden. Options with equal totals share a rank and are labelled as a tie. The sum is computed in this app from the weights and scores already stored. No ranking library is added.

## Current State Analysis

On `af6d10a89b3f256b7edbf411a1186b0329c77c69`, the dashboard loads one decision by `user_id`, then options and criteria ordered by `position` (`src/pages/dashboard.astro:16-47`). Writes are form posts to `/api/decisions`, `/api/options`, and `/api/criteria`. Criteria weights are integers 1–5 (`src/pages/api/criteria.ts:7`, `supabase/migrations/20261011183800_create_options_and_criteria.sql:108`). A search of `src`, `supabase`, and `scripts` found no score column and no ranking function (`context/changes/weighted-ranking/research.md`). The view markup now lives in `src/components/dashboard/DecisionDashboard.astro`, which `dashboard.astro` renders (change `dashboard-ui-contract`); its UI rules are in `AGENTS.md` (tokens only, no literal colours).

S-02 left scores, the ranking, and the score scale undone (`context/changes/options-and-weighted-criteria/plan.md:26`, `plan-brief.md:63`).

## Desired End State

The owner of `Which laptop?` with options `MacBook` and `ThinkPad` and criteria `Price (3)` and `Battery (1)` enters scores on `/dashboard`. Once any score exists, the dashboard lists the options by \(\sum w_j a_{ij}\) over the scores that exist, a higher total above a lower one (`context/foundation/prd.md:105`, `context/foundation/prd.md:109`). An option with at least one missing score shows an "incomplete" marker and how many scores are missing. Two options with the same total show the same rank number and a "tie" marker. Another account does not see that ranking (`context/foundation/prd.md:69`).

The tie marker is where this slice stops: picking a winner among tied options with a wheel is slice S-05 `tie-breaker-wheel`.

### Key Discoveries:

- The decision id is loaded from `user_id`, not from the form (`src/pages/api/criteria.ts:26-34`). The inspected dashboard forms do not post `decision_id` (`context/changes/weighted-ranking/research.md`).
- Child-list errors on the dashboard success branch were not read when the research ran. A ranking must not treat a failed read as an empty list.
- `decisions` has select and insert policies only (`supabase/migrations/20261011142249_create_decisions.sql:11-19`). `criteria` has select, insert, update, and delete (`supabase/migrations/20261011183800_create_options_and_criteria.sql:145-199`). A score is edited, so it follows the criteria policy set.
- Option and criterion rows reference `decisions` with `on delete cascade`. Their existing delete routes (`src/pages/api/options.ts:45`, `src/pages/api/criteria.ts:46`) must keep succeeding after score rows exist.
- Context7 library `/quatrope/scikit-criteria`, page `skcriteria.agg.simple`, documents `wsm(matrix, weights)` as \(\sum w_j a_{ij}\) with no normalization inside that call. Source: https://scikit-criteria.quatrope.org/en/stable/api/agg/simple.html

## What We're NOT Doing

- Installing scikit-criteria, `weighted-sum`, or `georank`. The first is Python. The npm package requires weights to sum to 1 (https://www.npmjs.com/package/weighted-sum). `georank` min-max normalizes each criterion to 0–100 before weighting (https://github.com/stoffis-git/georank-engine). S-02 already refused weights that must sum to 100 (`context/changes/options-and-weighted-criteria/plan.md:31`).
- A second decision, sharing, or an admin panel (`context/foundation/prd.md:129-131`).
- Renaming or deleting the decision title. `decisions` still has no update or delete policy.
- A minimize/cost flag on a criterion. The PRD ranks a higher weighted result higher (`context/foundation/prd.md:109`).
- A stored total. The ranking is the sum of the current weights and scores at read time.
- Treating a missing score as 0, or averaging, or scaling a partial total up to look complete. A partial total is the sum of the scores that exist, and the option is marked incomplete.
- Picking a winner among tied options (wheel): slice S-05 `tie-breaker-wheel`.
- Model-suggested criteria (FR-011, S-04 `ai-criteria-suggestions`). A suggestion is not read by the ranking. It becomes a `criteria` row only after the owner adds it with a stored weight 1–5.
- A unit-test framework. `AGENTS.md` says the automated check is `scripts/smoke.mjs`.

## Implementation Approach

Phase 1 adds a pure function that ranks a possibly partial score set. Phase 2 stores one cell per option-criterion pair and renders the function's result on `/dashboard`. The user answered Open Questions 1–3 (see below), so Phase 2 is no longer gated. The function never invents a number for a missing score: it reports how many are missing.

The formula reference is `wsm(matrix, weights)` from the scikit-criteria page cited above. The implementation is local TypeScript because this app is Astro on Cloudflare Workers (`AGENTS.md`), and the fetched page is a Python API.

## Critical Implementation Details

- **Failed child reads.** `src/pages/dashboard.astro:25-35` keeps option and criterion rows when their errors are unset in the destructure, and turns a null payload into `[]`. A ranking built on that branch would order an empty list after a failed read. The ranking load has to surface a failure with the existing load-error text path (`Could not load your decision`), not with an empty ranking.
- **Deletes.** Score rows reference `options` and `criteria` with `on delete cascade`. The delete handlers already remove the parent row and do not know about scores. `ON DELETE RESTRICT` would make those handlers fail.
- **A score may only join an option and a criterion of the same decision.** Row-level security checks the owner through the option's decision and checks that the criterion belongs to that same decision. A policy that checks only one side would let a forged id pair cells across decisions.
- **Partial totals are not comparable to complete ones.** An incomplete option can look worse only because scores are missing. The marker is the guard; the ordering is still by total, as the user chose.

## Phase 1: Weighted sum for a partial or complete score set

### Overview

Add a helper that totals and ranks options from the scores that exist. No table, no route, and no dashboard markup in this phase.

### Changes Required:

#### 1. Weighted-sum helper

**File**: `src/lib/weighted-sum.ts`

**Intent**: Give later phases one definition of the ranking so the dashboard does not re-derive the sum.

**Contract**: Input is the owner's options, the owner's criteria (each with its stored weight), and the stored scores as option-criterion pairs with an integer value. For each option the output carries: the total \(\sum w_j a_{ij}\) over the pairs that have a score; the number of criteria scored; the number missing; and `complete`, true only when none is missing. Options come back ordered so a higher total comes first (`context/foundation/prd.md:109`). Each option also gets a `rank`: equal totals share the same rank, and the next distinct total takes the rank after the tied group (1, 1, 3). Display order inside a tie is the input order and carries no meaning. Weights are the stored integers. Do not divide by the sum of weights. Do not min-max normalize scores. Do not treat a missing score as 0; a missing pair adds nothing and is counted as missing. With zero scores in the whole set, return no ranking, so the dashboard can show "no scores yet". Worked example, not a decision about the scale: weights 1 and 3, option P scores 2 and 4, option Q scores 5 and 1. Totals are \(2\cdot1+4\cdot3=14\) and \(5\cdot1+1\cdot3=8\). P ranks above Q, both complete. Worked partial example: with Q's second score missing, Q's total is 5, Q is incomplete with one missing, and P still ranks first.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- Weights 1 and 3 with scores (2, 4) and (5, 1) produce totals 14 and 8, and 14 ranks above 8
- Two options with the same total share a rank, and the next option's rank skips accordingly
- An option with one missing score is reported incomplete with one missing and a total from the scores that exist, not from a 0

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Score cells and the dashboard ranking

### Overview

Store score cells (integers 1–5) and show the Phase 1 ranking on `/dashboard`, with incomplete and tie markers.

### Changes Required:

#### 1. Scores table

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_scores.sql` (timestamp chosen when the migration is written)

**Intent**: Persist the \(a_{ij}\) values the sum multiplies, under the same owner boundary as criteria.

**Contract**: Table `public.scores` with `id` (uuid, primary key), `option_id` and `criterion_id` (uuid, not null, references `options` and `criteria` with `on delete cascade`), `value` (integer, not null, check between 1 and 5), and `created_at` (timestamptz, not null, default now). Unique on `(option_id, criterion_id)`, because the documented sum has one \(a_{ij}\) per alternative and criterion. Enable row-level security. Four policies, select, insert, update, and delete, each allowing the action only when the option's decision has `user_id = auth.uid()` and the criterion belongs to that same decision. Do not add policies on `decisions`.

#### 2. Score endpoint

**File**: `src/pages/api/scores.ts`

**Intent**: Let the owner set or clear the scores of one option without sending a decision id the server would trust from the browser.

**Contract**: `POST` form data with `option_id` and one field per criterion named `score_<criterion id>`. A blank field clears that cell; a value must be an integer from 1 to 5 or the whole request is rejected. Missing `locals.user` redirects to `/auth/signin`. A null Supabase client redirects to `/dashboard?error=` with `Supabase is not configured`. Load the decision with `.eq("user_id", user.id).maybeSingle()`, and if that row is missing redirect with `Create a decision first` (`src/pages/api/criteria.ts:16-34`). Reject an option id or criterion id that is not on that decision. Validate with zod. Success redirects to `/dashboard`; any failure redirects to `/dashboard?error=` with a short message. Do not add `/api/scores` to `PROTECTED_ROUTES`; existing write routes check `locals.user` themselves.

#### 3. Dashboard ranking and score forms

**File**: `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Show the ranking and let the owner enter scores, and fail visibly when the lists or the cells cannot be read.

**Contract**: Stay on `/dashboard`. Read score cells for the loaded decision. If the option query, the criterion query, or the score query returns an error, show the load failure and do not render a ranking. Render a "Scores" block: one plain HTML form per option, with a number input (min 1, max 5) per criterion prefilled with the stored score, posting to `/api/scores`. Render a "Ranking" block from the Phase 1 helper: each option with its rank, name, and total, ordered by total. An option with missing scores shows an "incomplete" marker with its missing count. Options sharing a rank show a "tie" marker. With no scores stored, show "No scores yet". With no options or no criteria, show the existing empty-list text and no ranking. Use role tokens and the shared `ui` components only: no literal colours and no arbitrary px/rem values. The forms do not include `decision_id`.

#### 4. State sink and literal scan

**File**: `src/pages/dev/dashboard-states.astro`

**Intent**: Keep every state of the new view visible for the screenshot gate.

**Contract**: Add rendered examples for: ranking with a tie, ranking with an incomplete option, "No scores yet", and a score save error. `node scripts/scan-dashboard-literals.mjs` stays at `total: 0`.

#### 5. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Prove the ranking, privacy, partial grid, and tie behavior through the same HTTP entry the other slices use.

**Contract**: Extend the existing smoke flow after a decision, options, and criteria exist. Save a complete grid and assert the higher total appears above the lower one. Save a partial grid and assert the incomplete marker for that option. Save two options with equal totals and assert the tie marker. Assert that a score of `0`, `6`, or `abc` is rejected with an error redirect and not stored. Assert a second account does not see those scores or the ranking. Do not encode 0 for a missing score, and do not use `position` to order a tie.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes
- `node scripts/scan-dashboard-literals.mjs` reports `total: 0`
- `npm run smoke` passes and covers a complete grid, a partial grid with the incomplete marker, a tie marker, rejected out-of-range scores, and a second account that sees none of it

#### Manual Verification:

- On a complete grid, the owner sees the higher weighted sum above the lower one, with weights left as stored integers 1–5 and with no normalization
- With one score missing, that option is marked incomplete and its total is the sum of the scores that exist
- Two equal totals show the same rank and a tie marker
- Another account does not see those scores or that order
- Deleting an option or a criterion that has scores still works and the ranking updates
- `/dev/dashboard-states` shows the new states in light and dark, at desktop and mobile width

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Decisions Recorded (2026-11-16)

These were Open Questions 1–3. The user answered them in conversation on 2026-11-16; nothing here was a default picked by the agent.

1. **Score scale:** integers 1–5, the same scale as weights.
2. **Partial grid:** a ranking shows with missing scores marked. A partial total is the sum of the scores that exist, and the option is flagged incomplete.
3. **Ties:** equal totals share a rank and show a tie marker. The user wants a wheel of fortune that picks one of the tied options at random. That is slice S-05 `tie-breaker-wheel`, not this slice.

## Open Questions

Still open, and not decided in code:

4. **US-01 acceptance detail.** Given/When/Then exists at `context/foundation/prd.md:67-69`. Detailed acceptance criteria were not listed. Owner: user. Does not block.
5. **Empty lists.** With no options or no criteria the plan reuses the existing empty-list text and shows no ranking. Confirm that is acceptable. Owner: user. Does not block.
6. **Ordering of an incomplete option.** The ranking orders by total as the user chose, so an option with missing scores can sit below a complete option only because of the gaps. The marker is the guard. Say so if a different order is wanted. Owner: user. Does not block.

## Testing Strategy

### Unit Tests:

No unit-test runner is added. `AGENTS.md` names `scripts/smoke.mjs` as the automated check. The Phase 1 arithmetic examples are manual for that reason.

### Integration Tests:

`npm run smoke` against a running server, extended in Phase 2.

### Manual Testing Steps:

1. Rank the worked example (totals 14 and 8) with the Phase 1 helper, then the partial example.
2. Rank two equal totals and confirm they share a rank.
3. Sign in, enter a complete grid, and confirm the higher total is above the lower one on `/dashboard`.
4. Clear one score and confirm the incomplete marker and the total from the remaining scores.
5. Enter two equal totals and confirm the tie marker.
6. Sign in as a second account and confirm the first account's scores and order are absent.

## Performance Considerations

No latency or volume budget for this ranking is stated in `context/foundation/prd.md` or `context/foundation/roadmap.md`. At most 20 options × 20 criteria = 400 cells. The sum runs on the dashboard request that already loads the lists. This plan adds no cache and no background job.

## Migration Notes

There are no score rows on this commit, so there is nothing to backfill. S-02 recorded that a Worker deploy does not apply Supabase migrations (`context/changes/options-and-weighted-criteria/plan-brief.md:62`). A human still applies the scores migration before the new table exists on a hosted project.

S-02's manual rows 2.5, 2.6, and 2.7 are tracked in `context/changes/options-and-weighted-criteria/plan.md`. Phase 2 builds on those lists.

## References

- Research: `context/changes/weighted-ranking/research.md`
- Filled-grid rule: `context/foundation/prd.md:105`, `context/foundation/prd.md:109`
- Session decision lookup: `src/pages/api/criteria.ts:26-34`
- Criteria RLS: `supabase/migrations/20261011183800_create_options_and_criteria.sql:145-199`
- Tie wheel: `context/changes/tie-breaker-wheel/`
- Weighted sum API: https://scikit-criteria.quatrope.org/en/stable/api/agg/simple.html (Context7 id `/quatrope/scikit-criteria`)
- Rejected npm package: https://www.npmjs.com/package/weighted-sum
- Rejected normalizer: https://github.com/stoffis-git/georank-engine

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Weighted sum for a partial or complete score set

#### Automated

- [x] 1.1 `npm run lint` passes — e93fb98
- [x] 1.2 `npx astro check` passes — e93fb98
- [x] 1.3 `npm run build` passes — e93fb98

#### Manual

- [x] 1.4 Weights 1 and 3 with scores (2, 4) and (5, 1) produce totals 14 and 8, and 14 ranks above 8 — e93fb98
- [x] 1.5 Two options with the same total share a rank, and the next option's rank skips accordingly — e93fb98
- [x] 1.6 An option with one missing score is reported incomplete with one missing and a total from the scores that exist, not from a 0 — e93fb98

### Phase 2: Score cells and the dashboard ranking

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npx astro check` passes
- [x] 2.3 `npm run build` passes
- [x] 2.4 `node scripts/scan-dashboard-literals.mjs` reports `total: 0`
- [x] 2.5 `npm run smoke` passes and covers a complete grid, a partial grid with the incomplete marker, a tie marker, rejected out-of-range scores, and a second account that sees none of it

#### Manual

- [x] 2.6 On a complete grid, the owner sees the higher weighted sum above the lower one, with weights left as stored integers 1–5 and with no normalization
- [x] 2.7 With one score missing, that option is marked incomplete and its total is the sum of the scores that exist
- [x] 2.8 Two equal totals show the same rank and a tie marker
- [x] 2.9 Another account does not see those scores or that order
- [x] 2.10 Deleting an option or a criterion that has scores still works and the ranking updates
- [x] 2.11 `/dev/dashboard-states` shows the new states in light and dark, at desktop and mobile width
