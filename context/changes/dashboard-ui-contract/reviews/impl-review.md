<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Dashboard design-system contract

- **Plan**: context/changes/dashboard-ui-contract/plan.md
- **Scope**: Full plan. Manual Progress rows are still open in every phase, so a fully-checked-phase gate would have reviewed none. This review covers the implemented work in phases 1–4 because the close-out asked for the diff.
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-11-08
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 2 observations

## Checks requested

- The view stays inside `change.md`: one route, `/dashboard`, wired to the existing role tokens. Ranking, other pages, and the cosmic utility were left alone.
- View files have no raw colour values. `node scripts/scan-dashboard-literals.mjs` returned 0 on `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`, and `src/pages/dev/dashboard-states.astro`. New `card.tsx`, `input.tsx`, and `label.tsx` have no colour hits. `input.tsx` has `ring-[3px]` and `card.tsx` has grid track templates; those are shadcn sizes, not colours. `button.tsx` still has `text-white` on the destructive variant and was not part of this diff.
- Every declared state has a representation in `src/pages/dev/dashboard-states.astro`: default, hover, focus-visible, disabled, error, empty (no decision and empty lists), loading N/A, logged-out N/A.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Manual progress rows are still open

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/dashboard-ui-contract/plan.md
- **Detail**: Automated checks passed on 2026-11-08: `npm run lint`, `npx astro check` (0 errors), `npm run build`, and the literal scan (0). Fourteen manual rows are still `- [ ]`. Rows 1.6 and 2.6 ask for the cosmic dashboard from before phase 3, so they cannot be re-observed. They were not marked done. Signed-in empty state, smoke, and the live mobile pass are still for you to confirm.
- **Fix**: Leave 1.6 and 2.6 unchecked. Confirm the remaining manual rows before any commit. Do not check them from this review.
- **Decision**: FIXED — rows 1.6 and 2.6 were already `- [ ]` and stay that way. No other manual row was checked.

### F2 — Lesson close-out sits outside the plan's file list

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: .husky/pre-commit
- **Detail**: The plan said not to add an ESLint plugin and not to add a screenshot baseline. The close-out added `scripts/scan-dashboard-literals.mjs` on the existing pre-commit hook, `literal-scan.md` (71 before, 0 after), `.playwright-cli/` in `.gitignore`, evidence screenshots in the change folder, and the playwright-cli skill under `.agents/`. No ESLint plugin and no `@playwright/test` dependency were added. `CLAUDE.md` and `context/foundation/roadmap.md` are dirty from other work and are not part of this change.
- **Fix**: Keep the hook, the scan record, and the screenshots. They are the lesson close-out, not a second product surface.
- **Decision**: FIXED — hook, literal-scan.md, and the evidence screenshots stay.

### F3 — Hover and focus-visible cells use different controls

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/dev/dashboard-states.astro:26
- **Detail**: The plan asked the hover and focus-visible cells to contain the same controls. Hover renders one primary Save button. Focus-visible renders an input named `focus-name` and an outline Save button. Both states are represented. The default cell still renders the full dashboard.
- **Fix**: Copy the focus-visible input and outline Save into the hover cell if those two cells should hold the same controls.
- **Decision**: FIXED — the hover cell now has a text input (`name="hover-name"`) and an outline Save, matching the focus-visible cell. The focus input keeps `name="focus-name"`.

### F4 — Null child payload is assigned without a fallback

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/dashboard.astro:39
- **Detail**: The plan said a child payload that is null and has no error stays `[]`. The else branch assigns `optionRows` and `criterionRows` directly. `npx astro check` accepts that assignment onto array props, and `?? []` fails `@typescript-eslint/no-unnecessary-condition` because the narrowed type is already an array. The error branch still sets "Could not load your decision" and does not render the editors.
- **Fix**: Leave the direct assignment. Restoring `?? []` fails the lint rule the plan also requires to pass.
- **Decision**: FIXED — `src/pages/dashboard.astro` still assigns `optionRows` and `criterionRows` directly.
