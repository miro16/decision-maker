# Decision Table View Implementation Plan

## Overview

Show a decision as one table: the first column lists the options, the next columns are the criteria (name and weight, for example `Price (3)`), and the last column is the score of that option (rank, weighted total, and the "incomplete" and "tie" markers). The user types the 1 to 5 scores straight into the cells and saves them one option at a time. The separate Scores and Ranking sections disappear; adding, renaming and deleting options and criteria stays in a "Manage options and criteria" section under the table.

## Current State Analysis

`src/components/dashboard/DecisionDashboard.astro` stacks four sections for the current decision: Options, Criteria, Scores (one form per option) and Ranking (an ordered list), inside a `max-w-2xl` card (`research.md`, "Current layout"). `src/pages/dashboard.astro` already passes options and criteria ordered by `position`, the scores, and the computed `ranking`, and `src/pages/api/scores.ts` already accepts one option's row of `score_<criterionId>` fields, so no query, endpoint or migration changes. Children of a non-hydrated React component are wrapped in `<astro-slot>`, so a shadcn-style `table.tsx` would put an invalid wrapper inside `<table>`. `scripts/smoke.mjs` finds ids and ranking text by position (`rankingOnly()` from `>Ranking<`, `hiddenIdAfter()` after a name), which breaks when sections move.

## Desired End State

On `/dashboard` the current decision shows a table with a header row (`Option`, one column per criterion with its weight, `Score`) and one row per option in the order the options were added. Each criterion cell holds a 1 to 5 number field. The last cell of a row shows the rank (`1.`), `Total N`, `incomplete (N missing)` and `tie` badges where they apply, and a `Save scores` button. With no scores yet, the table shows a dash in the score cells and the note `No scores yet.` The table scrolls sideways on a narrow screen while the option column stays visible. Below it, "Manage options and criteria" holds the same add, rename and delete forms as today. `npm run smoke` passes with its helpers re-anchored, and the screenshots at 1280 px and 390 px show no horizontal overflow of the page.

### Key Discoveries:

- A `<form>` cannot wrap a `<tr>`, but `form="<id>"` on the inputs and the button attaches them to one form placed in a single cell, with no JavaScript (`research.md`, "Forms inside a table").
- `Input` forwards `...props` to the element, so `form` and `aria-label` reach it (`src/components/ui/input.tsx`).
- Ranks skip after a tie (1, 1, 3) and `ranking` is `null` when nothing is scored (`src/lib/weighted-sum.ts`, `src/pages/dashboard.astro:103-114`).
- The contrast pairs a table needs (`foreground`, `muted-foreground`, `ring`, `border` on `background` and `card`) are already measured (`context/changes/futuristic-dashboard-ui/tokens.md`).

## What We're NOT Doing

- Changing `src/pages/api/*`, `src/pages/dashboard.astro` queries, `src/lib/weighted-sum.ts` or the database. The score rules, the ranking rules and RLS stay as they are.
- A shadcn `table.tsx`: `<astro-slot>` would break the table, so the table is plain elements in an `.astro` component (the repo rule also prefers `.astro` when there is no client state).
- Client-side behaviour (no JavaScript, no auto-save, no live recalculation). The page reloads after Save, as today.
- Sorting rows by rank (user decision: rows stay in entry order; the rank is in the last column).
- Editing option or criterion names inside the table (user decision: that stays in the Manage section).
- Pagination or virtualisation: the caps stay at 20 options and 20 criteria, handled by horizontal scroll.
- Changing the theme tokens or the sign-in and home pages.

## Implementation Approach

Phase 1 delivers the working table end to end: the new component, the view wiring (sections replaced, card widened, Manage section), and the smoke helpers moved to the new markup so the automated check keeps proving the same behaviour. Phase 2 proves the states and the narrow-screen behaviour, takes the screenshots, adds the new file to the literal scan and leaves a rule for the next agent. User decisions that shaped this plan: editable cells with one Save per row; the last column holds rank, total and markers; rows in entry order; Scores and Ranking sections replaced by the table; wider card with horizontal scroll; Save button in the last cell; sticky first column.

## Critical Implementation Details

- **Row forms without wrapping the row.** For each option, render in the last cell one `<form id="scores-<optionId>" method="POST" action="/api/scores">` containing the hidden `decision_id` and `option_id` and the `Save scores` submit button. Each criterion cell's `Input` carries `form="scores-<optionId>"`, `name="score_<criterionId>"`, `type="number"`, `min=1`, `max=5`, the saved value or empty, and `aria-label="<option name>, <criterion name>"`. The submit button is inside the form; the inputs are outside it and attach through `form`.
- **Plain table markup, one home for classes.** `src/components/dashboard/DecisionTable.astro` renders `<div class="overflow-x-auto ...">` around `<table class="w-full ...">`, `<thead>`, `<tbody>`, `<th scope="col">` and `<th scope="row">` (option name) cells. Classes use role tokens only (`border-border`, `bg-card`, `text-foreground`, `text-muted-foreground`); borders on rows and cells use `border-b border-border`. No colour literals, no arbitrary px/rem values.
- **Sticky option column.** The first column cells use `sticky left-0 bg-card` so the names stay visible while the criteria scroll; if the sticky cell hides the glow or the background wrongly in the screenshots, drop `sticky` and keep plain scrolling.
- **Text that must survive for the smoke checks.** Header cells read `<name> (<weight>)`. The rank renders as its own element with the visible text `1.` (so `>1.<` matches), the total as `Total 20`, the markers through `Badge` with `incomplete (2 missing)` and `tie`. The no-score note reads `No scores yet.` and appears only when `ranking` is `null`; `Total ` must not appear then.
- **Smoke re-anchoring.** Add a helper `manageOnly(page)` that slices the body from the Manage heading, and make `hiddenIdAfter` calls for option and criterion ids run on that slice. Replace `rankingOnly()` by `tableOnly(page)` (the text between `<table` and `</table>`) and add `rowOf(page, name)` returning the `<tr>` that contains an option name. Order assertions become per-row assertions (ScoreA row has `Total 20` and `1.`, ScoreB row has `Total 4` and `2.`, ScoreC row has `incomplete (2 missing)` and `3.`). Every existing numeric and marker expectation stays; none is deleted.
- **Heading text.** The table section heading is `Decision table`. The word `Ranking` must not appear anywhere on the page when there is no table (the smoke steps for other accounts and for deleted options assert its absence).

## Phase 1: Table in the view

### Overview

Replace the Scores and Ranking sections with the table, move Options and Criteria under "Manage options and criteria", widen the card, and keep `npm run smoke` proving the same behaviour on the new markup.

### Changes Required:

#### 1. Table component

**File**: `src/components/dashboard/DecisionTable.astro` (new)

**Intent**: One place that renders the options-by-criteria table.

**Contract**: Props `decisionId`, `options` (`id`, `name`), `criteria` (`id`, `name`, `weight`), `scores` (`option_id`, `criterion_id`, `value`), `ranking` (rows with `optionId`, `total`, `missing`, `rank`, or `null`). Renders the table as described in Critical Implementation Details: header `Option`, one header per criterion as `<name> (<weight>)`, `Score`; one row per option in the order given; criterion cells with the numeric inputs attached to the row form; the last cell with rank, `Total N`, `incomplete (N missing)` and `tie` badges (a tie is a rank shared by more than one row, same rule as today), the `Save scores` button, and a dash when `ranking` is `null`. When there is no ranking the component also renders the line `No scores yet.` under the table. Markers and text use the existing `Badge` and role tokens. No client script.

#### 2. View wiring

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Use the table, drop the replaced sections, widen the card.

**Contract**: When `canScore`, render the section `Decision table` containing `DecisionTable`; when options or criteria are missing, render one muted line asking for at least one option and one criterion instead. Remove the Scores and Ranking sections (and the now unused `rankCounts` and `scoreValues` logic if the component owns them). Group the existing Options and Criteria sections under a heading `Manage options and criteria`, with their forms, fields and hidden inputs unchanged. Change the card width from `max-w-2xl` to `max-w-5xl`. The decision list, add form, rename form and delete confirmation are untouched.

#### 3. Smoke helpers

**File**: `scripts/smoke.mjs`

**Intent**: Prove the same behaviour on the new markup.

**Contract**: Implement `tableOnly`, `rowOf` and `manageOnly` as described; route `scoreIds()` and the option-delete steps through `manageOnly`; rewrite the ranking-order assertions as per-row assertions; keep all other steps and expected strings. Add one step: the table's score input for a criterion has `form="scores-<optionId>"` for each option row (proves the row form wiring in the HTML). `npm run smoke` passes on the existing step count plus the new step.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `/dashboard` shows the table: option names in the first column, one column per criterion with its weight, the score summary in the last column, and saving a row updates the total and rank.
- Add, rename and delete of options and criteria still work from the Manage section.

**Implementation Note**: The user chose full automation for this change: after the automated checks pass and the browser check confirms the manual points, commit and continue without pausing.

---

## Phase 2: States, responsiveness, gate and rule

### Overview

Show the table in its states, check narrow screens, take the screenshots, add the new file to the literal scan and leave a rule.

### Changes Required:

#### 1. States

**File**: `src/pages/dev/dashboard-states.astro`

**Intent**: Every table state visible in the state sink.

**Contract**: Keep the existing sections (they now render the table). Add or adjust: the table without scores (dashes and `No scores yet.`), with a tie, with an incomplete option, one option and criterion missing (the hint line), and a large case with 20 options, many criteria and long names to prove scrolling and wrapping. `loading` and `logged out` stay marked N/A with their reasons.

#### 2. Narrow screens

**File**: `src/components/dashboard/DecisionTable.astro`

**Intent**: The table is usable at 390 px.

**Contract**: The wrapper scrolls horizontally, the option column stays visible (`sticky`), score fields stay at least wide enough for one digit with a visible focus ring, and the page itself has no horizontal overflow (`scrollWidth` equals `innerWidth`). If `sticky` misbehaves, remove it and keep plain scrolling.

#### 3. Literal scan

**File**: `scripts/scan-dashboard-literals.mjs`

**Intent**: The new view file obeys the same token rules.

**Contract**: Add `src/components/dashboard/DecisionTable.astro` to the scanned list; the scan reports 0 hits for it.

#### 4. Rule for the next agent

**File**: `AGENTS.md`

**Intent**: Keep later table work on the same pattern.

**Contract**: In `## UI`, add that the decision table lives in `src/components/dashboard/DecisionTable.astro`, is built from plain `<table>` elements in an `.astro` file because React children are wrapped in `<astro-slot>`, and that row forms use the `form` attribute. Also mention the new file in the literal-scan sentence. Existing rules stay.

#### 5. Screenshots

**Files**: none (evidence in the PR description)

**Intent**: The visual gate.

**Contract**: Screenshots at 1280 px and 390 px of `/dashboard` with a scored decision (including a tie and an incomplete option) and of `/dev/dashboard-states` (table sections), with no horizontal page overflow.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `/dev/dashboard-states` shows the table states listed above, including the 20-option case, with `loading` and `logged out` marked N/A.
- At 390 px the table scrolls inside its container, the option column stays visible, and the page has no horizontal overflow.
- Tab key focus shows the cyan ring on score fields and the `Save scores` button.
- `AGENTS.md` names `DecisionTable.astro`, the `<astro-slot>` reason and the `form` attribute.

**Implementation Note**: Full automation: after the automated checks and the browser check pass, commit, write the epilogue and open the pull request without pausing.

---

## Testing Strategy

### Unit Tests:

- None. There is no unit-test framework (`AGENTS.md`); `scripts/smoke.mjs` is the automated check.

### Integration Tests:

- `npm run smoke` after each phase: all previous expectations about scores, totals, ties, incomplete markers, validation errors, isolation between accounts and cascade deletes stay, now checked against the table markup and per row.
- `node scripts/scan-dashboard-literals.mjs` after Phase 2 proves no literal enters the new file.

### Manual Testing Steps:

1. Create a decision with three options and two criteria; fill the table; save one row and confirm the totals, ranks and markers.
2. Make two options tie and one incomplete and confirm `tie` and `incomplete (N missing)`.
3. Add 20 options and check scrolling; open the page at 390 px.
4. Tab through the table and check the focus ring.

## Performance Considerations

Server-rendered HTML only; no new runtime JavaScript. At most 20 by 20 cells plus 20 row forms, which is small.

## Migration Notes

No data or database change. Rollback is reverting the change; the Scores and Ranking sections come back with it.

## References

- Research: `context/changes/decision-table-view/research.md`
- Change: `context/changes/decision-table-view/change.md`; roadmap slice S-08 in `context/foundation/roadmap.md`
- `src/components/dashboard/DecisionDashboard.astro`, `src/pages/api/scores.ts`, `src/lib/weighted-sum.ts`, `scripts/smoke.mjs`, `scripts/scan-dashboard-literals.mjs`
- UI rules: `AGENTS.md` (`## UI`); tokens and measured contrast: `context/changes/futuristic-dashboard-ui/tokens.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Table in the view

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — PENDINGSHA
- [x] 1.2 Type check passes with 0 errors: `npx astro check` — PENDINGSHA
- [x] 1.3 Build passes: `npm run build` — PENDINGSHA
- [x] 1.4 Smoke passes: `npm run smoke` — PENDINGSHA

#### Manual

- [x] 1.5 `/dashboard` shows the table: option names in the first column, one column per criterion with its weight, the score summary in the last column, and saving a row updates the total and rank. — PENDINGSHA
- [x] 1.6 Add, rename and delete of options and criteria still work from the Manage section. — PENDINGSHA

### Phase 2: States, responsiveness, gate and rule

#### Automated

- [ ] 2.1 Linting passes: `npm run lint`
- [ ] 2.2 Type check passes with 0 errors: `npx astro check`
- [ ] 2.3 Build passes: `npm run build`
- [ ] 2.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- [ ] 2.5 Smoke passes: `npm run smoke`

#### Manual

- [ ] 2.6 `/dev/dashboard-states` shows the table states listed above, including the 20-option case, with `loading` and `logged out` marked N/A.
- [ ] 2.7 At 390 px the table scrolls inside its container, the option column stays visible, and the page has no horizontal overflow.
- [ ] 2.8 Tab key focus shows the cyan ring on score fields and the `Save scores` button.
- [ ] 2.9 `AGENTS.md` names `DecisionTable.astro`, the `<astro-slot>` reason and the `form` attribute.
