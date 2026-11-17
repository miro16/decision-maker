# Tie-Breaker Wheel Implementation Plan

## Overview

When two or more options share first place in the ranking and every option in that first-place group is fully scored, `/dashboard` shows a "Tie-breaker" section under the decision table. It holds a wheel of fortune with only those options. The user spins it and the wheel lands on one of them, at random. The result is labelled as a tie-break draw, can be spun again, and is not stored. The ranking, totals and scores never change.

## Current State Analysis

`rankOptions()` in `src/lib/weighted-sum.ts` returns for each option `rank`, `total` and `complete`; equal totals share a rank, so the first-place group is the entries with `rank === 1` (`research.md`). `src/pages/dashboard.astro:103-114` computes that ranking server-side and `DecisionDashboard.astro` renders it through `DecisionTable.astro`. Today nothing on `/dashboard` is interactive; React islands exist only for the sign-in and sign-up forms (`client:load`). `chart-1` to `chart-5` exist as `fill-chart-*` utilities (`src/styles/global.css:105-109`) with no measured contrast against label text. `scripts/smoke.mjs` already creates equal totals and an incomplete option, and `scripts/scan-dashboard-literals.mjs` scans four view files.

## Desired End State

With `ScoreA` and `ScoreB` both at Total 7 and `ScoreC` incomplete and lower, the dashboard shows a "Tie-breaker" section listing and wheeling `ScoreA` and `ScoreB` only. Pressing "Spin the wheel" turns the wheel and stops on one of them; a status block reads `Tie-break draw` with the name, says it was drawn at random from the tied options and that the ranking is unchanged, and "Spin again" is available. With reduced motion the result appears without the animation. When there is no tie, a tie that includes an incomplete option, or a tie below first place, no section appears. A reload clears the result. `/dev/dashboard-states` shows every case, contrast of the wheel labels is measured and recorded, and `AGENTS.md` records the pattern.

### Key Discoveries:

- The wheel's audience is exactly `rank === 1` options, and an incomplete option can tie at the top; the user decided the wheel appears only when the whole first-place group is fully scored (`research.md`, Open Questions).
- The ordering inside a tie is input order and carries no meaning (`src/lib/weighted-sum.ts`), so the draw must not favour the first option; the draw uses unbiased browser randomness.
- No API, migration or RLS change: the draw is client-only and not stored (PRD Open Question 11, assumed and confirmed).

## What We're NOT Doing

- Storing the result, or any endpoint, migration or server-side randomness (user decision: not stored).
- A wheel for ties below first place, or for a first-place group that includes an incomplete option (user decision).
- Changing the ranking, totals, scores, row order or the existing `tie` badge; the wheel only reads them.
- Sound, confetti, animation libraries or web fonts. The animation is one CSS transform transition.
- A no-JavaScript fallback draw; without JavaScript the section still lists the tied options and the button does nothing.
- Editing the sign-in, home or theme tokens beyond measuring contrast for the chart roles (an adjustment of `chart-*` values is allowed only if contrast fails).

## Implementation Approach

Phase 1 adds the eligibility rule and a server-rendered section that lists the tied options, with smoke steps covering the cases. Phase 2 replaces the list with the wheel island. Phase 3 proves states, contrast and narrow screens, takes screenshots and leaves the rule. User decisions: wheel only for a fully scored first-place group of at least two options; "Spin again" allowed with every result labelled as a draw; result not stored; full automation across phases.

## Critical Implementation Details

- **Eligibility rule.** A function in `src/lib/weighted-sum.ts` takes the ranked options and returns the ids of the first-place group when that group has at least two entries and every entry has `complete === true`; otherwise an empty list. A `null` ranking returns an empty list. A group is the entries with `rank === 1`. The page maps ids to names; names come from the owner's own options only.
- **Unbiased draw.** The winner index is chosen before the animation with `crypto.getRandomValues` and rejection sampling (discard values above the largest multiple of the candidate count), never `Math.random() * n` with modulo. The animation then rotates to a whole number of turns plus the offset that puts the chosen slice under the pointer, so the shown result always matches the drawn index.
- **Reduced motion.** When `prefers-reduced-motion: reduce` matches, the wheel jumps to the drawn slice with no transition and the result shows immediately. Otherwise the result shows when the transition ends, with a timeout fallback in case `transitionend` does not fire.
- **Not part of the ranking.** The section sits below the table and above "Manage options and criteria"; it never writes to the table, totals or ranks, and the result block states that the ranking is unchanged.
- **Heading text for smoke.** The section heading is `Tie-breaker`; smoke slices the page from `>Tie-breaker<` to `>Manage options and criteria<`. The word `Tie-breaker` must not appear anywhere when no section is shown.

## Phase 1: Eligibility rule and section

### Overview

Decide who is eligible, show the section with the tied options as text, and prove the cases through the existing smoke entry.

### Changes Required:

#### 1. Eligibility rule

**File**: `src/lib/weighted-sum.ts`

**Intent**: One place that decides whether a wheel is offered and for whom.

**Contract**: Export `tieBreakCandidates(ranked)` taking `RankedOption[] | null` and returning `string[]` of option ids: the entries with `rank === 1` when there are at least two of them and all are `complete`, else `[]`. No other function in the file changes.

#### 2. Page and view wiring

**Files**: `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Carry the candidates to the view and show the section.

**Contract**: `dashboard.astro` derives `tieCandidates` (`id`, `name`, in table order) and the shared total from the ranking and passes both to `DecisionDashboard.astro` as props with defaults for an empty list. When there are candidates, the view renders a section with heading `Tie-breaker` between the decision table section and "Manage options and criteria": a sentence that N options share first place with `Total X` and a list of their names, and a line saying that spinning does not change the ranking (the control itself comes in Phase 2). With no candidates nothing is rendered. Tokens and shared components only.

#### 3. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Prove each eligibility case through HTTP.

**Contract**: Add a helper `tieBreakerOnly(page)` that slices from `>Tie-breaker<` to `>Manage options and criteria<`. Add steps: no tie (the complete grid with Total 20 and Total 4) shows no `Tie-breaker`; the partial grid shows none; a first-place tie that includes an incomplete option (ScoreA and ScoreB at Total 6 each, ScoreC with a Price score only, also Total 6) shows the existing `tie` badge but no `Tie-breaker`; the equal-totals state (ScoreA and ScoreB at Total 7, ScoreC incomplete lower) shows the section with `ScoreA` and `ScoreB` and not `ScoreC`; the second account sees no `Tie-breaker`. The new tie-with-incomplete scenario clears ScoreC's score afterwards so the later steps keep their expectations. All existing steps stay.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- With two options tied at first place and fully scored, `/dashboard` shows the Tie-breaker section listing exactly those options; with an incomplete option in the tie, or no tie, it does not.

**Implementation Note**: Full automation (user decision): after the automated checks and the browser check pass, commit and continue without pausing.

---

## Phase 2: The wheel

### Overview

Replace the list with a spinning wheel and a clearly labelled result.

### Changes Required:

#### 1. Spin logic

**File**: `src/components/hooks/useWheelSpin.ts` (new)

**Intent**: Keep draw and animation state out of the component markup.

**Contract**: A hook taking the number of candidates and returning `rotation` (degrees), `spinning`, `winnerIndex` (null before the first draw) and `spin()`. `spin()` ignores calls while spinning, picks the winner index with unbiased `crypto.getRandomValues` (rejection sampling), sets a rotation of several whole turns plus the offset that puts that slice under the pointer, and sets `winnerIndex` when the transition ends (or at once under reduced motion, or after a timeout fallback). Spinning again continues from the current rotation and a new draw replaces the previous result.

#### 2. Wheel island

**Files**: `src/components/tie-breaker/TieBreakerWheel.tsx` (new)

**Intent**: The wheel, the control and the labelled result.

**Contract**: Props `candidates` (`id`, `name`) and an optional `previewWinnerId` used only by the state sink. Renders an SVG wheel with one slice per candidate (colours from `fill-chart-*` utilities, no two adjacent slices the same colour, the label shortened with an ellipsis and the full name in a `<title>`), a fixed pointer at the top, a "Spin the wheel" button (shows "Spin again" after a result, disabled while spinning), a visible text list of the candidates for screen readers, and a `role="status"` block that after a draw shows a `Badge` `Tie-break draw`, the winner's name, the line "Drawn at random from N tied options. The ranking and totals above are unchanged." and nothing before the first draw. The wheel turns with a single CSS transform transition and none under reduced motion. Hooks live in `src/components/hooks/`, no `"use client"`, classes merged with `cn()`.

#### 3. Mount

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Show the wheel in the section.

**Contract**: Inside the `Tie-breaker` section, keep the sentence about the shared first place and render `<TieBreakerWheel candidates=... client:load />` instead of the plain list. The server-rendered HTML still contains the candidate names (the island renders them on the server), so the Phase 1 smoke steps stay valid without change.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- Pressing the button turns the wheel and stops with the pointer on the slice named in the result block; the block shows `Tie-break draw`, the name and the unchanged-ranking line; "Spin again" draws again.
- With reduced motion emulated, 300 draws on a two- or three-candidate wheel give every candidate roughly an equal share, and the table, totals and ranks never change.

**Implementation Note**: Full automation: after the automated checks and the browser check pass, commit and continue without pausing.

---

## Phase 3: States, gate and rule

### Overview

Show every state, measure contrast, check narrow screens, scan the new files and leave a rule.

### Changes Required:

#### 1. States

**Files**: `src/pages/dev/dashboard-states.astro`, `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Every wheel state visible in the state sink.

**Contract**: Add sections for: two candidates, three candidates, 20 candidates with long names, a drawn result (through an optional `tieWinnerId` prop on the view that the island receives as `previewWinnerId`), a first-place tie that includes an incomplete option (no section), and a tie below first place (no section). Existing sections stay; `loading` and `logged out` stay N/A.

#### 2. Contrast

**Files**: `src/styles/global.css` (only if a pair fails), `context/changes/tie-breaker-wheel/tokens.md` (new)

**Intent**: The wheel is readable.

**Contract**: Measure each slice fill (`chart-1` to `chart-5`) against the label colour used on it, and the pointer against the card, using the same method as `futuristic-dashboard-ui/tokens.md`. Text pairs need 4.5:1 or better, the pointer 3:1. Record the table in `tokens.md`; adjust the `chart-*` values or the label colour only if a pair fails.

#### 3. Narrow screens

**File**: `src/components/tie-breaker/TieBreakerWheel.tsx`

**Intent**: Usable at 390 px.

**Contract**: The wheel scales with its container (no fixed pixel size), stays square, and the button and result block stay inside the card; the page has no horizontal overflow.

#### 4. Literal scan

**File**: `scripts/scan-dashboard-literals.mjs`

**Intent**: The new files obey the same token rules.

**Contract**: Add `src/components/tie-breaker/TieBreakerWheel.tsx` and `src/components/hooks/useWheelSpin.ts` to the scanned list; both report 0 hits.

#### 5. Rule for the next agent

**File**: `AGENTS.md`

**Intent**: Keep later interactive pieces on the same pattern.

**Contract**: In `## UI`, add that the tie-breaker lives in `src/components/tie-breaker/TieBreakerWheel.tsx` with its hook in `src/components/hooks/useWheelSpin.ts`, that the eligibility rule is `tieBreakCandidates` in `src/lib/weighted-sum.ts`, that the draw is client-only, unbiased and not stored, and that the wheel never changes ranking data. Also mention the two new scanned files. Existing rules stay.

#### 6. Screenshots

**Files**: none (evidence in the PR description)

**Intent**: The visual gate.

**Contract**: Screenshots at 1280 px and 390 px of `/dashboard` with the wheel before and after a draw, and of `/dev/dashboard-states` (wheel sections), with no horizontal page overflow.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `/dev/dashboard-states` shows the wheel with two, three and 20 candidates, a drawn result, and the two no-wheel cases, with `loading` and `logged out` marked N/A.
- The measured contrast for the wheel labels and pointer meets 4.5:1 and 3:1 and is recorded in `tokens.md`.
- At 390 px the wheel, button and result fit the card, with no horizontal page overflow.
- Tab key focus shows the cyan ring on the spin button, and the result is announced (the status block has `role="status"`).
- `AGENTS.md` names the wheel files, `tieBreakCandidates` and the client-only, not-stored rule.

**Implementation Note**: Full automation: after the automated checks and the browser check pass, commit, write the epilogue and open the pull request without pausing.

---

## Testing Strategy

### Unit Tests:

- None. There is no unit-test framework (`AGENTS.md`); `scripts/smoke.mjs` is the automated check and covers the eligibility rule through the rendered page.

### Integration Tests:

- `npm run smoke` after each phase: no tie, partial grid, tie with an incomplete option, tie of two fully scored options, and a second account that sees no section.
- The randomness and the animation are checked in the browser (Phase 2 manual criterion), because smoke is HTTP only.

### Manual Testing Steps:

1. Set equal totals for two fully scored options; open `/dashboard`; spin and read the result.
2. Make a third option tie at first place with a missing score; confirm the section disappears.
3. Emulate reduced motion and spin repeatedly; confirm the distribution is roughly even and the ranking is unchanged.
4. Open `/dashboard` at 390 px and Tab to the button.

## Performance Considerations

One small React island (`client:load`) and CSS transforms; no new runtime dependency. At most 20 slices.

## Migration Notes

No data or database change. Rollback is reverting the change; nothing is stored.

## References

- Research: `context/changes/tie-breaker-wheel/research.md`
- Change: `context/changes/tie-breaker-wheel/change.md`; roadmap slice S-05 in `context/foundation/roadmap.md`
- PRD: FR-012, US-03, Open Question 11 in `context/foundation/prd.md`
- `src/lib/weighted-sum.ts`, `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`, `scripts/smoke.mjs`, `scripts/scan-dashboard-literals.mjs`
- Tokens and contrast method: `context/changes/futuristic-dashboard-ui/tokens.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Eligibility rule and section

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — PENDINGSHA
- [x] 1.2 Type check passes with 0 errors: `npx astro check` — PENDINGSHA
- [x] 1.3 Build passes: `npm run build` — PENDINGSHA
- [x] 1.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs` — PENDINGSHA
- [x] 1.5 Smoke passes: `npm run smoke` — PENDINGSHA

#### Manual

- [x] 1.6 With two options tied at first place and fully scored, `/dashboard` shows the Tie-breaker section listing exactly those options; with an incomplete option in the tie, or no tie, it does not. — PENDINGSHA

### Phase 2: The wheel

#### Automated

- [ ] 2.1 Linting passes: `npm run lint`
- [ ] 2.2 Type check passes with 0 errors: `npx astro check`
- [ ] 2.3 Build passes: `npm run build`
- [ ] 2.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- [ ] 2.5 Smoke passes: `npm run smoke`

#### Manual

- [ ] 2.6 Pressing the button turns the wheel and stops with the pointer on the slice named in the result block; the block shows `Tie-break draw`, the name and the unchanged-ranking line; "Spin again" draws again.
- [ ] 2.7 With reduced motion emulated, 300 draws on a two- or three-candidate wheel give every candidate roughly an equal share, and the table, totals and ranks never change.

### Phase 3: States, gate and rule

#### Automated

- [ ] 3.1 Linting passes: `npm run lint`
- [ ] 3.2 Type check passes with 0 errors: `npx astro check`
- [ ] 3.3 Build passes: `npm run build`
- [ ] 3.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- [ ] 3.5 Smoke passes: `npm run smoke`

#### Manual

- [ ] 3.6 `/dev/dashboard-states` shows the wheel with two, three and 20 candidates, a drawn result, and the two no-wheel cases, with `loading` and `logged out` marked N/A.
- [ ] 3.7 The measured contrast for the wheel labels and pointer meets 4.5:1 and 3:1 and is recorded in `tokens.md`.
- [ ] 3.8 At 390 px the wheel, button and result fit the card, with no horizontal page overflow.
- [ ] 3.9 Tab key focus shows the cyan ring on the spin button, and the result is announced (the status block has `role="status"`).
- [ ] 3.10 `AGENTS.md` names the wheel files, `tieBreakCandidates` and the client-only, not-stored rule.
