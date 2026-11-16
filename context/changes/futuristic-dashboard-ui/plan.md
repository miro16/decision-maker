# Futuristic Dashboard UI Implementation Plan

## Overview

Give `/dashboard` a dark neon look: a deep navy-black base, cyan as the main accent (buttons, focus, ring), violet as the second accent (current selection, markers), and a subtle glow on cards, the current decision and focus. The look is built in the token layer and shared components, not in literals in the view (`AGENTS.md` UI rules). Dark becomes the default theme app-wide through a `dark` class on `<html>`, so the sign-in, sign-up and home pages inherit the same palette; their views are not edited.

## Current State Analysis

The contract from `dashboard-ui-contract` holds for the view: `node scripts/scan-dashboard-literals.mjs` reports 0 literals in the three view files (`context/changes/futuristic-dashboard-ui/research.md`). The gaps are upstream. Every colour role in `src/styles/global.css` has zero chroma (`global.css:12-31,43-71`), there is no glow role, `src/layouts/Layout.astro:12` renders `<html lang="en">` with no class so the `.dark` block never applies, and `bg-cosmic` carries hex stops (`global.css:114-116`) and is used by `src/pages/auth/signin.astro:9`, `signup.astro:9`, `confirm-email.astro:22` and `src/components/Welcome.astro:5`. The view repeats one panel class string five times and hand-builds markers and alerts (`src/components/dashboard/DecisionDashboard.astro:88-95,147,152,176,216,269,300-310`). `src/components/ui` has `button`, `card`, `input`, `label` and no `badge` or `alert`; `components.json` exists, so `npx shadcn add <name>` is the path.

## Desired End State

Opening `/dashboard` shows a dark navy-black page with a card whose border and glow are cyan-tinted, cyan primary buttons, a violet highlight on the current decision and on the tie and incomplete markers, and error alerts that stay readable. Tab key focus shows a cyan ring with a soft glow on every control. The sign-in, sign-up and home pages show the same palette with no layout change. In `/dev/dashboard-states` every state of the 7-state matrix is shown or marked N/A with a reason, the contrast pairs listed below meet 4.5:1 (text) or 3:1 (ring and borders), and `AGENTS.md` tells the next agent where the tokens, glow role and components live.

### Key Discoveries:

- Dark values only take effect with a `dark` class; the `dark:` utilities in `src/components/ui/button.tsx` and `input.tsx` assume it (`research.md`, "Dark mode is dead code").
- `@theme inline` must reference variables, not raw colours, or the dark toggle breaks (`/10x-ui` Tailwind detail; `AGENTS.md:35`). A new `--shadow-glow` that references `var(--glow)` follows that rule.
- `buttonVariants` is exported from `src/components/ui/button.tsx:50`, so anchor-styled controls can reuse the real variants without a second button.
- The 20-decision list, add, rename and delete controls come from `multiple-decisions` and are covered by the same restyle (`context/changes/multiple-decisions/plan.md`).

## What We're NOT Doing

- A theme toggle or a light-theme redesign. `:root` light values stay as they are; dark is forced by the class on `<html>` (user decision: no toggle).
- Editing the sign-in, sign-up, confirm-email or home views. They inherit tokens and are only screenshotted (user decision).
- Changing behaviour, routes, data or copy. No logic change in `src/pages/dashboard.astro` or any `/api` endpoint.
- Running `shadcn init` or adding a second palette. We extend `global.css` and add two components with `npx shadcn add`.
- A `--destructive-foreground` role or editing `text-white` in `src/components/ui/button.tsx:14` (charge D, deferred; revisited only if the contrast measurement fails).
- A screenshot-test runner. The visual gate is the kitchen-sink page plus manual screenshots (`/10x-ui`: do not install one to satisfy the skill).
- Web fonts or animation libraries. System fonts stay; any motion is a CSS `transition` on existing utilities.

## Implementation Approach

Phase 1 fixes the environment and token values so the whole app can render the palette. Phase 2 moves the view onto shared components so the palette reaches every element through one place. Phase 3 proves every state, measures contrast, takes the screenshots and leaves the rule behind. The palette direction was chosen by the user: cyan primary, violet secondary, subtle glow.

Target values (to be deposited in `context/changes/futuristic-dashboard-ui/tokens.md`, with the source line "design choice of this change, 2026-11-17"): background about `oklch(0.14 0.03 265)`, card `oklch(0.18 0.035 265)`, foreground `oklch(0.96 0.01 250)`, primary `oklch(0.82 0.14 205)` (cyan) with a dark `primary-foreground`, accent `oklch(0.28 0.09 295)` (violet) with a light `accent-foreground`, muted-foreground `oklch(0.72 0.03 255)`, destructive `oklch(0.72 0.19 22)`, border and input as cyan with low alpha, ring equal to primary, and `--glow` as cyan at about 35% alpha. These are starting values; Phase 3 adjusts them until the contrast pairs pass, and the adjusted values are what `tokens.md` records.

## Critical Implementation Details

- **Where the glow lives.** `--glow` is a role value in `:root` and `.dark`; `@theme inline` publishes `--shadow-glow` that references it (for example a one-pixel ring in `var(--border)` plus a soft blur in `var(--glow)`), which makes the `shadow-glow` utility exist. No raw colour goes into `@theme inline`.
- **`bg-cosmic` without hex.** The utility keeps its name (four files use it) and is rebuilt from `var(--background)` and `var(--card)` or a `color-mix()` of role variables, so it follows the theme.
- **Shared Layout.** Adding `class="dark"` to `<html>` in `src/layouts/Layout.astro` affects every page; the Phase 1 manual check includes the sign-in, sign-up and home pages.

## Phase 1: Environment and tokens

### Overview

Make the dark values take effect, give them the neon palette and a glow role, and remove the hex from `bg-cosmic`.

### Changes Required:

#### 1. Dark by default

**File**: `src/layouts/Layout.astro`

**Intent**: Apply the `.dark` token block to every page.

**Contract**: The `<html>` element gets `class="dark"`; nothing else in the layout changes.

#### 2. Neon token values and glow role

**File**: `src/styles/global.css`

**Intent**: Replace the achromatic `.dark` values with the navy-black, cyan and violet palette and add the glow role.

**Contract**: Update every role in `.dark` (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart and sidebar roles stay consistent with the new hues). Add `--glow` to `:root` and `.dark`. In `@theme inline`, add `--shadow-glow` referencing `var(--border)` and `var(--glow)`. Existing role names and the `@theme inline` mapping do not change. `:root` light values stay.

#### 3. `bg-cosmic` from tokens

**File**: `src/styles/global.css`

**Intent**: Stop writing hex literals in the shared background utility.

**Contract**: `@utility bg-cosmic` keeps its name and produces a vertical gradient built only from role variables (`var(--background)`, `var(--card)` or a `color-mix()` of them). No `#`, `rgb(`, `hsl(` or `oklch(` literal inside the utility.

#### 4. Raw values deposited in the change folder

**File**: `context/changes/futuristic-dashboard-ui/tokens.md`

**Intent**: Keep the values outside the chat so the next session does not invent new ones.

**Contract**: The final `:root` additions and `.dark` block as CSS, plus a line naming the source (design choice of this change, 2026-11-17) and the date, in the same style as `context/changes/dashboard-ui-contract/tokens.md`.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the three dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- No hex colour left in `global.css`: `rg -n "#[0-9a-fA-F]{3,8}\b" src/styles/global.css` returns no match

#### Manual Verification:

- `/dashboard` renders dark with cyan and violet accents at desktop and one mobile width, with no layout change.
- `/auth/signin`, `/auth/signup` and `/` stay readable with the new palette (inherit it, no view edits).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Dashboard view on shared components

### Overview

Move the repeated panels, markers, alerts and link-buttons onto shared components so the palette and glow reach them through one place.

### Changes Required:

#### 1. Add the missing shared components

**Files**: `src/components/ui/badge.tsx`, `src/components/ui/alert.tsx` (created by the CLI)

**Intent**: Give markers and alerts a shared home instead of hand-built classes.

**Contract**: Run `npx shadcn add badge alert` (the repo's `components.json` path). Review the generated files so they use role tokens only; adjust variant classes through tokens, not literals. No second `shadcn init`.

#### 2. One panel pattern

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Replace the repeated `rounded-lg border border-border p-3` string with the shared `Card` building blocks.

**Contract**: Option cards, criterion cards, score forms, ranking rows and the delete confirmation use `Card` (with `CardContent`) and spacing overrides through `cn()`/`class`. The delete confirmation keeps its destructive border through the token (`border-destructive`). The `shadow-glow` utility applies to the page card and the current decision item; panels inside stay flat.

#### 3. Markers and alerts

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Use the new components for the "incomplete" and "tie" markers and the error and load-error messages.

**Contract**: "incomplete (N missing)" and "tie" render through `Badge` (violet-leaning variant via the `secondary` or `accent` roles); the URL error and the load error render through `Alert` with the destructive variant and `role="alert"` kept. The visible text of every marker and message does not change (smoke asserts it).

#### 4. Link-buttons on real variants

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Stop styling anchors by hand.

**Contract**: "Delete decision" and "Cancel" are anchors using `buttonVariants` from `src/components/ui/button.tsx` (destructive/link and outline variants); the decision list items are anchors using `buttonVariants` with the ghost or outline variant plus an `aria-current` highlight through `bg-accent`. The anchor href values and `aria-current` attributes are unchanged.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the three dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes with unchanged text assertions: `npm run smoke`

#### Manual Verification:

- Markers look like badges and error messages look like alerts, all from the shared components; the page card and the current decision show the glow.
- Tab key focus shows a visible cyan ring on every control, including the anchor controls.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: States, contrast, gate and rule

### Overview

Prove the 7-state matrix, measure contrast, run the visual gate and leave a rule that keeps the next agent on the contract.

### Changes Required:

#### 1. 7-state matrix in the state sink

**File**: `src/pages/dev/dashboard-states.astro`

**Intent**: Show every state of the view in one page, in the new theme.

**Contract**: The page shows default, hover (a forced-state example or a documented hover target), focus-visible, disabled, error, empty, and load error for the view; `loading` is marked N/A with the reason "the page is server-rendered and has no client fetching". Existing sections stay.

#### 2. Contrast measurement and adjustment

**File**: `src/styles/global.css`, `context/changes/futuristic-dashboard-ui/tokens.md`

**Intent**: Make sure the neon values stay readable.

**Contract**: Measure these pairs on the final values and adjust the tokens until they pass, then record the measured ratios in `tokens.md`: foreground on background, foreground on card, muted-foreground on background and on card, primary-foreground on primary, `text-destructive` on the `Alert` destructive background over card (this replaces the carried 3.97:1 figure), and the ring and border against the background. Text pairs target 4.5:1 or better, ring and border 3:1 or better.

#### 3. Rule for the next agent

**File**: `AGENTS.md`

**Intent**: Keep later views on the tokens and components.

**Contract**: Extend the `## UI` section (outside the 10x CLI block in `CLAUDE.md`) with: dark is the default via `class="dark"` in `src/layouts/Layout.astro`; where the palette and the `--glow` role live; `shadow-glow` is the glow utility; `badge` and `alert` exist in `src/components/ui`; anchor controls use `buttonVariants`. The existing "no literal colours" rules stay.

#### 4. Screenshots

**Files**: none (evidence in the PR description)

**Intent**: The visual gate: one view, every state visible.

**Contract**: Screenshots of `/dev/dashboard-states`, `/dashboard` with two decisions and the delete confirmation, and the sign-in page, at desktop and one mobile width (about 390 px), with no horizontal overflow.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the three dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `/dev/dashboard-states` shows default, hover, focus-visible, disabled, error, empty and load error, with `loading` marked N/A with a reason.
- The measured contrast ratios for the listed pairs meet the targets and are recorded in `tokens.md`.
- Screenshots at desktop and mobile width show no horizontal overflow for `/dashboard`, `/dev/dashboard-states` and `/auth/signin`.
- `AGENTS.md` names the token and glow locations, the default dark class and the new components.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before closing the plan.

---

## Testing Strategy

### Unit Tests:

- None. There is no unit-test framework (`AGENTS.md`); `scripts/smoke.mjs` stays the automated check and its text assertions must not change.

### Integration Tests:

- `npm run smoke` after Phases 2 and 3 proves the restyle did not change behaviour or visible text.
- `node scripts/scan-dashboard-literals.mjs` after every phase proves no literal entered the view.

### Manual Testing Steps:

1. Open `/dashboard` with two decisions and check the list, the current highlight, the markers and the delete confirmation.
2. Tab through the page and check the focus ring on every control.
3. Open `/dev/dashboard-states`, `/auth/signin`, `/auth/signup` and `/` at desktop and mobile width.

## Performance Considerations

CSS-only: no new runtime JavaScript, fonts or images. The glow is a `box-shadow`.

## Migration Notes

No data or database change. The only global effect is `class="dark"` on `<html>`, which changes the look of every page that uses `Layout.astro`; rollback is removing that one attribute.

## References

- Research and charges: `context/changes/futuristic-dashboard-ui/research.md`
- Change: `context/changes/futuristic-dashboard-ui/change.md`; roadmap slice S-07 in `context/foundation/roadmap.md`
- Token source of the previous change: `context/changes/dashboard-ui-contract/tokens.md`
- UI rules: `AGENTS.md:32-38`; skill: `.claude/skills/10x-ui/SKILL.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Environment and tokens

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — 56e0a0a
- [x] 1.2 Type check passes with 0 errors: `npx astro check` — 56e0a0a
- [x] 1.3 Build passes: `npm run build` — 56e0a0a
- [x] 1.4 No literals in the three dashboard view files: `node scripts/scan-dashboard-literals.mjs` — 56e0a0a
- [x] 1.5 No hex colour left in `global.css`: `rg -n "#[0-9a-fA-F]{3,8}\b" src/styles/global.css` returns no match — 56e0a0a
#### Manual

- [x] 1.6 `/dashboard` renders dark with cyan and violet accents at desktop and one mobile width, with no layout change. — 56e0a0a
- [x] 1.7 `/auth/signin`, `/auth/signup` and `/` stay readable with the new palette (inherit it, no view edits). — 56e0a0a
### Phase 2: Dashboard view on shared components

#### Automated

- [x] 2.1 Linting passes: `npm run lint`
- [x] 2.2 Type check passes with 0 errors: `npx astro check`
- [x] 2.3 Build passes: `npm run build`
- [x] 2.4 No literals in the three dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- [x] 2.5 Smoke passes with unchanged text assertions: `npm run smoke`

#### Manual

- [x] 2.6 Markers look like badges and error messages look like alerts, all from the shared components; the page card and the current decision show the glow.
- [x] 2.7 Tab key focus shows a visible cyan ring on every control, including the anchor controls.

### Phase 3: States, contrast, gate and rule

#### Automated

- [ ] 3.1 Linting passes: `npm run lint`
- [ ] 3.2 Type check passes with 0 errors: `npx astro check`
- [ ] 3.3 Build passes: `npm run build`
- [ ] 3.4 No literals in the three dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- [ ] 3.5 Smoke passes: `npm run smoke`

#### Manual

- [ ] 3.6 `/dev/dashboard-states` shows default, hover, focus-visible, disabled, error, empty and load error, with `loading` marked N/A with a reason.
- [ ] 3.7 The measured contrast ratios for the listed pairs meet the targets and are recorded in `tokens.md`.
- [ ] 3.8 Screenshots at desktop and mobile width show no horizontal overflow for `/dashboard`, `/dev/dashboard-states` and `/auth/signin`.
- [ ] 3.9 `AGENTS.md` names the token and glow locations, the default dark class and the new components.
