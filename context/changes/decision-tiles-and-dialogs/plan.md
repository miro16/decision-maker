# Decision Tiles and Dialogs Implementation Plan

## Overview

On `/dashboard` the decisions become a grid of square tiles with a "+" tile for a new decision, and the editing controls move into native dialogs: new decision, rename and delete decision (with the delete confirmation), manage options, manage criteria. The decision table, the ranking and the tie-breaker wheel stay on the page. No API, database or ranking change.

## Current State Analysis

`DecisionDashboard.astro` shows everything for the current decision at once: a one-column list of full-width buttons, the new-decision form, the rename form and delete link, the table, the wheel, then a Manage section with an edit card per option and per criterion (`research.md`, Charges 1 and 2). There is no dialog component in `src/components/ui` (Charge 3). Writes are HTML forms posting to `/api/*` with redirects that smoke asserts exactly; `scripts/smoke.mjs` finds option and criterion ids after the `>Manage options and criteria<` heading. The literal scan is at 0 on six files.

## Desired End State

`/dashboard` shows, top to bottom: header, a `Your decisions` grid of square tiles (title centred, current one highlighted with `aria-current="page"` and the glow, a dashed `New decision` tile at the end while under the 20 cap), then for the current decision: its title with the buttons `Edit decision`, `Options (n)` and `Criteria (n)`, the table, and the wheel when eligible. Each button opens a dialog; the dialog has a title, a close button, closes on Esc and on a click on the backdrop, and holds the same forms as today. After saving inside the options or criteria dialog the page reloads and the same dialog reopens (unless an error is shown). The delete confirmation is a dialog that opens on load when the URL has `confirm=delete`. `npm run smoke` passes with its helpers re-anchored, `/dev/dashboard-states` shows the new states, and screenshots at 1280 px and 390 px show no horizontal overflow.

### Key Discoveries:

- All writes are plain forms with redirects, so dialogs need no API change (`research.md`, Forms and redirects).
- A shadcn/radix Dialog would hide the forms from the HTML (Astro children are only present while open) and break smoke's id lookup; a native `<dialog>` keeps them in the markup (`research.md`, Dialog technology).
- `confirmDelete` is already decided on the server (`src/pages/dashboard.astro:60`), so the confirmation can stay a server-rendered state shown as an open dialog.

## What We're NOT Doing

- Changing `src/pages/api/*`, queries in `dashboard.astro`, `src/lib/weighted-sum.ts` or the database.
- A React/radix Dialog or `npx shadcn add dialog` (user decision: native `<dialog>`).
- Moving the decision table, the ranking or the tie-breaker wheel into dialogs (user decision).
- Showing counts or other extra information on the tiles (user decision: title only).
- Making dialogs work without JavaScript except the delete confirmation (rendered open when `confirm=delete`).
- Changing theme tokens, the sign-in or home pages.

## Implementation Approach

Phase 1 adds the shared `Modal.astro` primitive and its script, the tile grid, and the dialogs for a new decision and for editing and deleting a decision. Phase 2 moves options and criteria into dialogs, adds the reopen-after-save behaviour and re-anchors the smoke helpers. Phase 3 proves the states, narrow screens and focus, adds the new files to the literal scan, and leaves the rule. User decisions that shaped this plan: square tiles with a "+" tile; popups for new decision, rename and delete, options and criteria; native dialog; stacking on the wheel branch; full automation.

## Critical Implementation Details

- **One primitive, one script.** `src/components/ui/Modal.astro` renders `<dialog id="<id>">` with a header (title `<h2>`, a close button with `aria-label="Close"`) and a slot. One delegated script (inside the component, so Astro bundles it once) handles: click on `[data-dialog-open="<id>"]` calls `showModal()`; click on `[data-dialog-close]` closes the enclosing dialog; a click whose target is the `<dialog>` itself (the backdrop) closes it; dialogs with `data-auto-open` call `showModal()` on load. Props: `id`, `title`, `autoOpen`, `keepOpen`, `preview`.
- **Reopen after save.** A dialog with `keepOpen` carries `data-keep-open`. On `submit` of any form inside it the script stores the dialog id in `sessionStorage`; on load, if a stored id exists and the URL has no `error` parameter, that dialog opens and the key is cleared (the key is cleared in every case). Only the options and criteria dialogs use it.
- **Delete confirmation without script.** When `confirmDelete` is true the confirmation dialog is rendered with the `open` attribute (so it shows even with no JavaScript) and `data-auto-open`; the script upgrades it with `showModal()` on load. Without the parameter the dialog is not rendered at all (smoke asserts `Delete permanently` is absent). The `Delete decision` control in the edit dialog stays an anchor to `?decision=<id>&confirm=delete`; `Cancel` is an anchor to the decision.
- **Preview mode for the state sink.** `Modal` with `preview` renders `open`, `static` and without script behaviour, and `DecisionDashboard` takes an optional `previewDialogs` prop that sets it on all dialogs; used only by `/dev/dashboard-states`.
- **HTML order matters for smoke.** Inside the decision block the order is: tiles, decision header with buttons, `Decision table` section, tie-breaker section, then the dialogs: edit decision, delete confirmation, options (title `Manage options`), criteria (title `Manage criteria`). The new-decision dialog sits with the tiles, before the decision block. `MANAGE_HEADING` in smoke becomes `>Manage options<`; the edit dialog (which holds a `name="id"` for the decision) comes before it, so id lookups are unaffected.
- **No literals.** Tile and dialog classes use role tokens (`bg-card`, `bg-accent`, `border-border`, `text-foreground`, `text-muted-foreground`, `shadow-glow`, `backdrop:bg-background/80`), `focus-visible:ring-3` rather than `ring-[3px]`, no arbitrary px/rem. The scroll lock uses a rule in `global.css` (`html:has(dialog[open])`) written with tokens only or none.
- **Text that must survive.** `Your decisions`, `What are you deciding?`, `Add decision`, `Delete decision`, `Delete permanently`, `Cancel`, option and criterion names (`Price (3)` in the table header), `Add option`, `Add criterion`.

## Phase 1: Modal primitive, tiles and decision dialogs

### Overview

The tile grid replaces the list, and new-decision, edit-decision and delete-confirmation move into dialogs.

### Changes Required:

#### 1. Modal primitive

**File**: `src/components/ui/Modal.astro` (new)

**Intent**: The one place that renders a dialog and handles opening and closing.

**Contract**: Props `id`, `title`, `autoOpen?`, `keepOpen?`, `preview?`, default slot. Markup and behaviour as in Critical Implementation Details. Tokens only; `max-w-lg w-full`, scrollable content on small screens (`max-h-svh overflow-y-auto`).

#### 2. Tiles

**File**: `src/components/dashboard/DecisionTiles.astro` (new)

**Intent**: The square tile grid.

**Contract**: Props `decisions`, `decisionId`, `showForm`. Renders `<h2>Your decisions</h2>` and a grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) of anchors to `/dashboard?decision=<id>`, each `aspect-square`, centred wrapped title (`line-clamp`, `break-words`), the current one with `aria-current="page"`, `bg-accent` and `shadow-glow`; when `showForm`, a final dashed button `New decision` with `data-dialog-open="dialog-new-decision"`. Hover and `focus-visible` states use tokens.

#### 3. Decision dialogs

**File**: `src/components/dashboard/DecisionDialogs.astro` (new)

**Intent**: The dialogs for a decision.

**Contract**: Renders three `Modal`s: `dialog-new-decision` (title `New decision`, the existing create form), `dialog-edit-decision` (title `Edit decision`, the rename form and the `Delete decision` anchor), and, only when `confirmDelete`, `dialog-confirm-delete` (the existing confirmation text, `Delete permanently` form and `Cancel` anchor). Props mirror what the forms need (`decisionId`, `decisionTitle`, `confirmDelete`, `decisionHref`, `deleteHref`, `optionCount`, `criterionCount`, `showForm`, `preview`).

#### 4. View wiring

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Use the tiles and the decision dialogs.

**Contract**: Replace the list, the new-decision form, the rename form, the delete link and confirmation by `DecisionTiles` and `DecisionDialogs`. Under the tiles, the current decision shows its title with the `Edit decision` button (`data-dialog-open="dialog-edit-decision"`). Empty state: with no decisions, show a short line and the tiles grid with only the `New decision` tile. Manage section stays as is in this phase.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- Decisions show as square tiles; the current one is highlighted; clicking another tile loads it; `New decision` opens a dialog that creates a decision.
- `Edit decision` opens a dialog with rename and `Delete decision`; the confirmation opens as a dialog on `?confirm=delete`, `Cancel` closes it, Esc and the backdrop close the other dialogs.

**Implementation Note**: Full automation: after the automated checks and the browser check pass, commit and continue without pausing.

---

## Phase 2: Options and criteria dialogs

### Overview

The Manage section becomes two dialogs that reopen after saving; smoke is re-anchored.

### Changes Required:

#### 1. Manage dialogs

**File**: `src/components/dashboard/DecisionDialogs.astro`

**Intent**: Options and criteria editing in dialogs.

**Contract**: Add `dialog-options` (title `Manage options`, `keepOpen`) and `dialog-criteria` (title `Manage criteria`, `keepOpen`) holding the current option and criterion cards and add forms unchanged (same fields, names, hidden inputs and caps of 20). Order in the HTML: after the edit and delete dialogs.

#### 2. View wiring

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Remove the Manage section and add its buttons.

**Contract**: Remove the `Manage options and criteria` section. Next to `Edit decision` add `Options (n)` and `Criteria (n)` buttons that open the two dialogs, shown only when a decision is selected. The page now reads: tiles, decision header with buttons, table, wheel.

#### 3. Smoke helpers

**File**: `scripts/smoke.mjs`

**Intent**: Prove the same behaviour on the new markup.

**Contract**: `MANAGE_HEADING` becomes `>Manage options<`; `hiddenIdAfter`, `tableOnly` and `tieBreakerOnly` keep working from it. Add steps: the tiles section lists decision titles as links with `aria-current` on the current one; the dashboard HTML has the dialogs `dialog-new-decision`, `dialog-edit-decision`, `dialog-options` and `dialog-criteria` and no `dialog-confirm-delete` without the parameter; with `confirm=delete` it has `dialog-confirm-delete`. All existing expectations stay.

#### 4. Reopen behaviour

**File**: `src/components/ui/Modal.astro`

**Intent**: Adding several options in a row does not need reopening by hand.

**Contract**: Implement the `keepOpen` behaviour from Critical Implementation Details.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `Options (n)` and `Criteria (n)` open their dialogs; adding an option reloads the page and the options dialog is open again with the new option; a failed save shows the error on the page and does not reopen the dialog.
- The page without dialogs open is short: tiles, header, table, wheel.

**Implementation Note**: Full automation: after the automated checks and the browser check pass, commit and continue without pausing.

---

## Phase 3: States, gate and rule

### Overview

Show every state, check narrow screens and keyboard, record contrast, and leave a rule.

### Changes Required:

#### 1. States

**Files**: `src/pages/dev/dashboard-states.astro`, `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Every tile and dialog state visible in the state sink.

**Contract**: `previewDialogs` prop on the view. Add sections: tile grid with one decision, with 20 decisions and long titles (the `New decision` tile absent at the cap), the new-decision dialog open, the edit dialog open, the delete confirmation open, the options dialog open with 20 options, the criteria dialog open. Hover, focus-visible, disabled, error and empty stay shown by the existing sections; `loading` and `logged out` stay N/A.

#### 2. Contrast and focus

**Files**: `context/changes/decision-tiles-and-dialogs/tokens.md` (new), `src/styles/global.css` (only if a pair fails)

**Intent**: Dialog and tile text and borders are readable.

**Contract**: Measure `foreground` and `muted-foreground` on `card` (dialog surface), the tile border on `background`, the active tile `accent-foreground` on `accent`, and the dialog border on the backdrop-dimmed page; record in `tokens.md`. Check that the first field or button in each dialog is focused on open and focus returns to the opening button on close.

#### 3. Literal scan

**File**: `scripts/scan-dashboard-literals.mjs`

**Contract**: Add `src/components/ui/Modal.astro`, `src/components/dashboard/DecisionTiles.astro`, `src/components/dashboard/DecisionDialogs.astro`; all report 0.

#### 4. Rule for the next agent

**File**: `AGENTS.md`

**Contract**: In `## UI`, add: decisions are square tiles in `DecisionTiles.astro`; popups use `src/components/ui/Modal.astro` (native `<dialog>`, opened by `data-dialog-open="<id>"`), not a React dialog; forms stay plain POST forms inside the dialogs; `keepOpen` reopens a dialog after a save; the delete confirmation is server-rendered from `confirm=delete`; options and criteria editing lives in `DecisionDialogs.astro`; mention the new scanned files and the state sink `previewDialogs`.

#### 5. Screenshots

**Files**: none (evidence in the PR description)

**Contract**: Screenshots at 1280 px and 390 px of `/dashboard` with tiles, an open dialog (options) and the delete confirmation, and of `/dev/dashboard-states` (tile and dialog sections), with no horizontal page overflow.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `/dev/dashboard-states` shows the tile grid, the five dialogs open and the existing states, with `loading` and `logged out` marked N/A.
- The measured contrast is recorded in `tokens.md` (text 4.5:1, border and ring 3:1).
- At 390 px tiles and dialogs fit with no horizontal page overflow, and a long dialog scrolls inside the viewport.
- Tab reaches tiles and buttons with the cyan ring; Esc closes a dialog and focus returns to its button.
- `AGENTS.md` names the new components, the `data-dialog-open` pattern and the no-React-dialog rule.

**Implementation Note**: Full automation: after the automated checks and the browser check pass, commit, write the epilogue and open the pull request (based on `feat/tie-breaker-wheel`) without pausing.

---

## Testing Strategy

### Unit Tests:

- None. There is no unit-test framework (`AGENTS.md`); `scripts/smoke.mjs` is the automated check.

### Integration Tests:

- `npm run smoke` after each phase; it reads the HTML, so closed dialogs still prove that the forms and ids are rendered. Opening, closing, reopening and focus are checked in the browser because smoke is HTTP only.

### Manual Testing Steps:

1. Open `/dashboard` with several decisions; click tiles; add a decision from the `+` tile.
2. Rename and delete a decision through `Edit decision`; confirm the delete dialog opens on `?confirm=delete`.
3. Add three options in a row from the options dialog without reopening it.
4. Trigger an error (a blank name); confirm the error shows on the page and no dialog is left open.
5. Repeat at 390 px and with the keyboard only.

## Performance Considerations

One small inline script; no new dependency. The dialogs are in the HTML, so a decision with 20 options and 20 criteria renders their forms once, as today.

## Migration Notes

No data or database change. Rollback is reverting the change.

## References

- Research: `context/changes/decision-tiles-and-dialogs/research.md`
- Change: `context/changes/decision-tiles-and-dialogs/change.md`
- `src/components/dashboard/DecisionDashboard.astro`, `src/pages/dashboard.astro`, `src/pages/dev/dashboard-states.astro`, `scripts/smoke.mjs`, `scripts/scan-dashboard-literals.mjs`
- Tokens and contrast method: `context/changes/futuristic-dashboard-ui/tokens.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Modal primitive, tiles and decision dialogs

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — 41c6f3b
- [x] 1.2 Type check passes with 0 errors: `npx astro check` — 41c6f3b
- [x] 1.3 Build passes: `npm run build` — 41c6f3b
- [x] 1.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs` — 41c6f3b
- [x] 1.5 Smoke passes: `npm run smoke` — 41c6f3b

#### Manual

- [x] 1.6 Decisions show as square tiles; the current one is highlighted; clicking another tile loads it; `New decision` opens a dialog that creates a decision. — 41c6f3b
- [x] 1.7 `Edit decision` opens a dialog with rename and `Delete decision`; the confirmation opens as a dialog on `?confirm=delete`, `Cancel` closes it, Esc and the backdrop close the other dialogs. — 41c6f3b

### Phase 2: Options and criteria dialogs

#### Automated

- [x] 2.1 Linting passes: `npm run lint` — 344eefc
- [x] 2.2 Type check passes with 0 errors: `npx astro check` — 344eefc
- [x] 2.3 Build passes: `npm run build` — 344eefc
- [x] 2.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs` — 344eefc
- [x] 2.5 Smoke passes: `npm run smoke` — 344eefc

#### Manual

- [x] 2.6 `Options (n)` and `Criteria (n)` open their dialogs; adding an option reloads the page and the options dialog is open again with the new option; a failed save shows the error on the page and does not reopen the dialog. — 344eefc
- [x] 2.7 The page without dialogs open is short: tiles, header, table, wheel. — 344eefc

### Phase 3: States, gate and rule

#### Automated

- [x] 3.1 Linting passes: `npm run lint` — PENDINGSHA
- [x] 3.2 Type check passes with 0 errors: `npx astro check` — PENDINGSHA
- [x] 3.3 Build passes: `npm run build` — PENDINGSHA
- [x] 3.4 No literals in the scanned view files: `node scripts/scan-dashboard-literals.mjs` — PENDINGSHA
- [x] 3.5 Smoke passes: `npm run smoke` — PENDINGSHA

#### Manual

- [x] 3.6 `/dev/dashboard-states` shows the tile grid, the five dialogs open and the existing states, with `loading` and `logged out` marked N/A. — PENDINGSHA
- [x] 3.7 The measured contrast is recorded in `tokens.md` (text 4.5:1, border and ring 3:1). — PENDINGSHA
- [x] 3.8 At 390 px tiles and dialogs fit with no horizontal page overflow, and a long dialog scrolls inside the viewport. — PENDINGSHA
- [x] 3.9 Tab reaches tiles and buttons with the cyan ring; Esc closes a dialog and focus returns to its button. — PENDINGSHA
- [x] 3.10 `AGENTS.md` names the new components, the `data-dialog-open` pattern and the no-React-dialog rule. — PENDINGSHA
