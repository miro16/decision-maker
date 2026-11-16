---
date: 2026-11-08T14:25:58+01:00
researcher: Maciej
git_commit: af6d10a89b3f256b7edbf411a1186b0329c77c69
branch: feat/options-and-weighted-criteria
repository: decision-maker
topic: "Where does scoring and a weighted ranking of one private decision attach?"
tags: [research, codebase, decisions, options, criteria, ranking]
status: complete
last_updated: 2026-11-08
last_updated_by: Maciej
---

# Research: Where does scoring and a weighted ranking of one private decision attach?

**Date**: 2026-11-08T14:25:58+01:00
**Researcher**: Maciej
**Git Commit**: af6d10a89b3f256b7edbf411a1186b0329c77c69
**Branch**: feat/options-and-weighted-criteria
**Repository**: decision-maker

## Research Question

Where does scoring and a weighted ranking of one private decision attach in this repo? Which files own decisions, options, and criteria; which conventions (RLS, validation, form posts, dashboard load) a scores write and a ranking read must follow; and which integration points already exist versus what is absent?

## Summary

On commit `af6d10a89b3f256b7edbf411a1186b0329c77c69`, the feature lives on one page and three POST routes. `src/pages/dashboard.astro` loads the signed-in user's single decision, then that decision's options and criteria. Writes go to `src/pages/api/decisions.ts`, `src/pages/api/options.ts`, and `src/pages/api/criteria.ts`. Two migrations define the tables. A search of `src/**/*.{ts,tsx,astro}`, `supabase/**/*.sql`, and `scripts/**` for `score` or `ranking` returned no matches. On those paths there is no scores table and no ranking query. That search does not by itself cover files outside those globs.

The attachment points for S-03 are a new migration, a new POST route beside the criteria route, and a new block on the same dashboard. The route should resolve the decision by `user_id` from the session, as `src/pages/api/criteria.ts:26-34` does, and should not take `decision_id` from the form. No ranking function was found on the paths searched above. The PRD states the filled-grid rule: a higher result of scores × weights ranks higher (`context/foundation/prd.md:109`). The score scale, a partial grid, ties, and detailed US-01 acceptance criteria are written down as unresolved.

## Detailed Findings

### File map

A search for `.from("decisions")`, `.from("options")`, and `.from("criteria")` in `src/**/*.{ts,tsx,astro}` matched these four files:

- `src/pages/dashboard.astro:17-31` reads them.
- `src/pages/api/decisions.ts:24` inserts a decision.
- `src/pages/api/options.ts` selects the decision at line 26 and writes options at lines 45, 59, and 78.
- `src/pages/api/criteria.ts` selects the decision at line 27 and writes criteria at lines 46, 65, and 85.

Session gate for the page: `src/middleware.ts:4` lists `PROTECTED_ROUTES` as `["/dashboard"]`. Lines 18-21 redirect an unauthenticated request whose path starts with `/dashboard` to `/auth/signin`. The three API files are not in that array. Each API redirects to `/auth/signin` when `context.locals.user` is missing (`src/pages/api/criteria.ts:16-18`, and the same check in `src/pages/api/decisions.ts:8-10` and `src/pages/api/options.ts:15-17`).

Schema files on this commit:

- `supabase/migrations/20261011142249_create_decisions.sql:1-19` — `decisions` with unique `user_id`, select and insert policies, no update policy and no delete policy in this file.
- `supabase/migrations/20261011183800_create_options_and_criteria.sql:1-98` — `options`, including select, insert, update, and delete policies.
- The same migration at lines 100-199 — `criteria`, with the same four operations.

`scripts/smoke.mjs` exercises the decision, option, and criterion HTTP routes. It does not post a score. That absence is the `score|ranking` search of `scripts/**` on this commit, not a line-by-line reading of the whole script.

### Dashboard load

When `supabase` and `user` are both set, `src/pages/dashboard.astro:16-20` selects `id, title` from `decisions` with `.eq("user_id", user.id)` and `maybeSingle`. On that success branch, lines 25-35 load options as `id, name` and criteria as `id, name, weight`, both filtered by `decision_id` and ordered by `position` ascending. The child results' error fields are not read in this file. A null child payload becomes `[]` at lines 34-35.

The same file, lines 36-40: no row and no load error sets `showForm`; a decision load error sets `loadErrorMessage` to `Could not load your decision`. Lines 198-201 render that message. `context/foundation/lessons.md:34-39` still describes a failed read that shows neither title nor error. That sentence is contradicted by the current branch in `dashboard.astro`. The lesson's **Rule** and **Applies to** lines are empty, so it does not add a replacement rule.

When `supabase` is null, the `if` at line 15 is skipped. This file then shows neither `loadErrorMessage` nor the create form. That is this file's null-client branch, not a claim about other pages.

### Write conventions a scores route would be joining

On the criteria route, which is the closest mutable child:

- The body is form data, not JSON. `intent` is `create`, `update`, or `delete` (`src/pages/api/criteria.ts:36-38`).
- The decision id comes from the session lookup at lines 26-34. A missing row redirects to `/dashboard?error=` with `Create a decision first`.
- Validation is zod. Weight is `z.coerce.number().int().min(1).max(5)` at line 7. The database check is `weight between 1 and 5` (`supabase/migrations/20261011183800_create_options_and_criteria.sql:108`).
- Success redirects to `/dashboard`. Failures use `/dashboard?error=` plus `encodeURIComponent` (`src/pages/api/criteria.ts` save messages at lines 9-12).
- The dashboard prints that query param as text (`src/pages/dashboard.astro:7`, `54-56`).

`AGENTS.md` says every new table in `supabase/migrations/` enables RLS with a policy per operation scoped to `auth.uid()`, and that migration names look like `YYYYMMDDHHmmss_short_description.sql`. The same file says zod is not installed yet. That sentence is contradicted by the existing import at `src/pages/api/criteria.ts:2` on this commit. The install rule is stale; the import is present.

Option and criterion ownership policies use `exists` against `decisions.user_id = auth.uid()` (`supabase/migrations/20261011183800_create_options_and_criteria.sql:44-54` for option select; criteria select starts at line 145). Inserts set `decision_id` from the looked-up row (`src/pages/api/criteria.ts:65-69`).

Caps of 20 and case-insensitive unique names are properties of options and criteria (`supabase/migrations/20261011183800_create_options_and_criteria.sql:28-29`, `129-130`, `11-12`, `112-113`). They are not a scores rule. Nothing in the inspected SQL sets a cap on a score cell.

### What is already settled, and what is not

Settled for this slice, and not reopened here:

- One decision per account: `user_id` is unique (`supabase/migrations/20261011142249_create_decisions.sql:3`). A second title is out of scope in `context/changes/options-and-weighted-criteria/plan.md:27`.
- Weights stored for ranking are integers 1–5. That is the S-02 plan (`context/changes/options-and-weighted-criteria/plan-brief.md:21`) and the check constraint cited above. `context/foundation/roadmap.md:87-88` still asks whether weights are 1–5 or 1–10. That roadmap sentence is stale relative to the migration and the plan; the code and the S-02 plan are the later artifacts.
- Filled grid, from `context/foundation/prd.md:105` and `:109`: when scores and weights are filled, the user sees one ranking without a separate manual recalculation, and a higher weighted result (scores × weights) ranks higher. US-01's Given assumes the scores are already there (`context/foundation/prd.md:67-69`).
- S-02 stores lists and refuses scores and ranking (`context/changes/options-and-weighted-criteria/plan.md:5` and `:26`). Change status in `context/changes/options-and-weighted-criteria/change.md` is `implementing`. S-01 status in `context/changes/s01/change.md` is `impl_reviewed`.

Unresolved in the source documents. This research does not pick an answer:

- Partial scores. `context/foundation/roadmap.md:100-101` asks whether a ranking still appears when some cells are empty, or waits for every cell. Owner: user. The PRD states the filled case and does not state the missing-cell case.
- Score scale. `context/changes/options-and-weighted-criteria/plan-brief.md:63` says S-03 will consume weights 1–5 and that the S-02 plan does not define the score scale.
- US-01 detailed acceptance criteria. `context/foundation/prd.md:71` and `:140`. `context/foundation/roadmap.md:120` assigns that gap to S-03.
- Equal weighted results. `context/foundation/prd.md:109` says a higher result ranks higher. It does not say how two equal results are ordered. Option `position` is an insertion order for the lists (`context/changes/options-and-weighted-criteria/plan-brief.md:26`). That list order is not a written tie-break for the ranking.

### External formula notes already fetched

These are not codebase findings. They were fetched in this session so a later plan can cite them instead of an unstated library.

Exa returned three technical candidates, not a "best library" list: scikit-criteria's weighted sum, the npm package `weighted-sum`, and `georank`. Context7 resolved scikit-criteria as `/quatrope/scikit-criteria` and returned the current `skcriteria.agg.simple` page. That page defines

\[
A_i^{\text{WSM-score}} = \sum_{j=1}^{n} w_j a_{ij}
\]

and `wsm(matrix, weights)` as that sum with no validation. It says the model applies when every value is in the same unit; otherwise a normalization step is required. It raises `ValueError` if an objective is for minimization. Source: https://scikit-criteria.quatrope.org/en/stable/api/agg/simple.html

The npm package requires the weights to sum to 1 (https://www.npmjs.com/package/weighted-sum). `georank`'s `rank(items, criteria)` min-max normalizes each criterion to 0–100 before weighting (https://github.com/stoffis-git/georank-engine). Neither package is installed in this repo. `package.json` name on this commit is `10x-astro-starter`; the ranking dependency is not in the inspected dependency list because no ranking code exists.

The PRD formula matches the weighted sum above for a filled matrix of benefit scores. This repo's stack is Astro on Cloudflare Workers (`AGENTS.md`), not Python, so scikit-criteria is a formula reference, not a dependency to add.

## Code References

- `src/pages/dashboard.astro:15-40` — decision load, child lists, load-error branch
- `src/pages/dashboard.astro:117-196` — criterion forms posting to `/api/criteria`
- `src/pages/api/criteria.ts:7` — weight schema, integers 1–5
- `src/pages/api/criteria.ts:26-34` — decision id from `user_id`, not from the form
- `src/middleware.ts:4-21` — only `/dashboard` is route-gated
- `supabase/migrations/20261011142249_create_decisions.sql:3-19` — one row per user; select and insert RLS
- `supabase/migrations/20261011183800_create_options_and_criteria.sql:100-108` — criterion columns and weight check
- `context/foundation/prd.md:105-111` — filled-grid ranking rule
- `context/foundation/roadmap.md:92-103` — S-03 outcome and the partial-score unknown

## Architecture Insights

Child rows hang off `decisions.id`. In the dashboard forms inspected for this research, the posted fields are the decision title, or an option/criterion `intent`, `id`, `name`, and `weight`. Those forms do not include `decision_id`. A scores write joins this pattern by loading the owner's decision, then checking that the option and the criterion belong to it. A ranking read joins the dashboard success branch: same decision, options and criteria ordered by `position`, then the score cells. The weighted total is not stored anywhere on this commit. The PRD asks for the ranking as soon as the scores and weights are filled (`context/foundation/prd.md:105`), which is a read of current weights and scores, not a stored total.

`src/lib/` is where this repo keeps helpers (`AGENTS.md`). There is no ranking helper there today. The inspected API routes do not import one.

## Historical Context (from prior changes)

- `context/changes/s01/plan-brief.md:19-25` — one private title on `/dashboard`; select and insert policies. Status of that change is `impl_reviewed`. Supported by the decisions migration cited above.
- `context/changes/options-and-weighted-criteria/plan.md:5` — scores and ranking stay in S-03. Supported: no score code in the paths searched above.
- `context/changes/options-and-weighted-criteria/plan.md:31` — refuses weights outside 1–5 and refuses weights that must sum to 100. Supported by `criteria.ts:7` and the SQL check. Contradicted as a still-open roadmap question at `context/foundation/roadmap.md:87-88`; the plan and the migration are the artifacts that record the choice.
- `context/changes/options-and-weighted-criteria/plan-brief.md:23` — "S-03 decides when a ranking can appear." That sentence delegates the partial-grid question. It does not answer it.
- `context/foundation/lessons.md:34-39` — load-failure claim. Contradicted by `src/pages/dashboard.astro:38-40` and `:198-201`.

## Related Research

Not applicable to this question. `context/**/research.md` matches 7 files (CLI and toolkit change-ids under `context/changes` and `context/archive`). None of them is about decisions, options, criteria, or ranking, and they were not used as evidence here.

## Open Questions

Left open on purpose. No answer is inferred.

1. Partial score grid — show a ranking or wait for every cell. `context/foundation/roadmap.md:100-101`. Owner: user.
2. Score scale. `context/changes/options-and-weighted-criteria/plan-brief.md:63`. Owner: user.
3. Order of two options with the same weighted sum. Not stated in `context/foundation/prd.md:109`. Owner: user.
4. Detailed US-01 acceptance criteria beyond the Given/When/Then at `context/foundation/prd.md:67-69`. `context/foundation/prd.md:140`, `context/foundation/roadmap.md:120`. Owner: user. Block: S-03.
5. What the dashboard shows when the option list or the criterion list is empty. US-01's Given assumes both exist (`context/foundation/prd.md:67`). Owner: user.
