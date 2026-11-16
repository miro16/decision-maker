# Dashboard design-system contract Implementation Plan

## Overview

Wire `/dashboard` to the token roles and shared components already in this repo. The starter's neutral values in `src/styles/global.css` stay as they are. This change does not pick a new theme. The screen stops being a blue-purple sign-in panel of unlabeled editors.

## Current State Analysis

`src/styles/global.css` holds role values in `:root` and `.dark` and publishes them through `@theme inline`. `src/components/ui` contains `button.tsx` and `LibBadge.astro`. `components.json` already points shadcn at that CSS file and at `@/components/ui`. `@astrojs/react` is installed. Nothing in `src` applies the `.dark` class.

`src/pages/dashboard.astro` does not import those components. A palette scan of that file returns 71 matches, including `bg-cosmic`, `from-blue-200`, `to-purple-200`, and `bg-red-900/30`. The same glass panel class is copied on the auth pages. Save and Delete share one class string and have no `focus-visible` ring.

A logged-out request, including a missing Supabase env, redirects to `/auth/signin` before the template runs. A signed-in account with no decision sees a Title field under the sentence "This page is only for authenticated users." A decision with empty lists sees unlabeled add forms. A failed option or criterion read is stored as `[]` and looks like those empty forms. The decision load error already renders "Could not load your decision".

`scripts/smoke.mjs` requires the dashboard HTML to contain the contiguous text `Price (3)` before `Battery (1)`, to include `name="title"` only on the create-title screen, and to resolve an option id with `hiddenIdAfter(body, marker)`.

## Desired End State

A signed-in person sees the decision on the repo's `Card`, with Options and Criteria headings, inputs and labels from `src/components/ui`, and buttons from `Button`. Delete uses the destructive variant. Errors use the destructive role. An account with no decision, and a decision with no rows, each get an empty-state sentence. A failed option or criterion read shows "Could not load your decision" and does not show the editors. A logged-out visit still redirects to sign-in.

Verify by reading the dashboard markup against the role classes, by running the palette scan on the view files, and by opening `/dashboard` plus `/dev/dashboard-states`.

### Key Discoveries:

- Role classes in `src` are concentrated in `src/components/ui/button.tsx:8-19` and the base layer at `src/styles/global.css:119-122`. The dashboard is outside that set (`context/changes/dashboard-ui-contract/research.md`).
- `Button` already implements `focus-visible:ring-ring/50` and a destructive variant (`src/components/ui/button.tsx:8`, `src/components/ui/button.tsx:13`).
- `scripts/smoke.mjs:132` and `scripts/smoke.mjs:142` assert the literal `Price (3)`. `scripts/smoke.mjs:42-46` finds the option id in the HTML after the option's name.
- `PROTECTED_ROUTES` is only `["/dashboard"]` (`src/middleware.ts:4`). A path that does not start with `/dashboard` renders without a session.
- Ranking markup is absent from `src/pages/dashboard.astro`. `context/changes/weighted-ranking/` owns scores and order.

## What We're NOT Doing

- Choosing a motif, or writing the cosmic hex values into `--primary`, `--background`, or `@theme inline`.
- Removing `@utility bg-cosmic`, or restyling Welcome, sign-in, sign-up, confirm-email, Topbar, the auth form components, LibBadge, or the purple `className` on `SubmitButton`.
- Running `shadcn init`, adding a second component library, or adding an ESLint plugin or Playwright.
- Drawing a ranking or score fields. That stays charge 5's deferred line in `research.md`.
- Turning the 20-row cap into a disabled button. The add form stays omitted at 20 rows.
- Adding a field name to `?error=` redirects, or adding a dark-mode toggle.
- Editing the block between the `@przeprogramowani/10x-cli` markers in `CLAUDE.md`.

## Implementation Approach

Four phases, in this order. Phase 1 adds the missing shadcn components through the existing `components.json` and leaves the token values untouched. Phase 2 copies those existing values into the change folder and names their source. Phase 3 rebuilds only the dashboard from those roles and components, and moves the markup into one Astro component the page and the sink both render. Phase 4 renders the seven states on a fixture route and records the contract in `AGENTS.md`.

React UI components on this view render as static HTML. They do not get `client:load`. The forms stay ordinary POST forms to the current API routes.

## Critical Implementation Details

- **shadcn and the token file.** `npx shadcn add card input label` runs against the existing `components.json`. If that command rewrites `:root`, `.dark`, or `@theme inline`, restore those blocks before the phase ends. Phase 2 copies whatever is in the file after that restore. A rewritten palette would become the deposited "existing" theme.
- **Smoke strings.** Each criterion still renders the contiguous text `{name} ({weight})`, in `position` order, so `Price (3)` stays before `Battery (1)`. The create-title screen still has `name="title"`. Once a title exists, that control is absent. `hiddenIdAfter` searches forward from the first occurrence of the option name for `name="id"`. The option name must appear before an `name="id"` whose value is that option's id. The update and delete forms for a row post the same id they post today.
- **Static controls.** `Card`, `Input`, `Label`, and `Button` are imported into the Astro markup with no client directive. `Input` and `Button` must forward `name`, `type`, `value`, `min`, `max`, `maxlength`, and `disabled` so the posted fields stay `title`, `intent`, `id`, `name`, and `weight`.

## Phase 1: Environment and library

### Overview

Add the shared components this view is missing. Do not install a design system, and do not change token values.

### Changes Required:

#### 1. Card, Input, and Label

**File**: `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`

**Intent**: Give the dashboard a repo-owned card, input, and label. `Button` is already in `src/components/ui/button.tsx` and stays.

**Contract**: Run `npx shadcn add card input label` using the current `components.json`. Do not run `shadcn init`. The three files land under `src/components/ui` and export the shadcn components (`Card`, `Input`, `Label`, plus the card's header and content parts). `Input` and `Label` forward the native attributes a POST form needs. No new UI library and no new runtime dependency beyond what that CLI adds for these three components. `src/components/ui/button.tsx` stays the existing `Button`.

#### 2. Token block left intact

**File**: `src/styles/global.css`

**Intent**: The library phase must not replace the starter palette with a second one.

**Contract**: After the add command, `:root`, `.dark`, and `@theme inline` match the pre-command role values. Restore them if the CLI rewrote them. Do not edit `bg-cosmic` in this phase.

### Success Criteria:

#### Automated Verification:

- `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, and `src/components/ui/label.tsx` exist and export the shadcn components
- `:root` and `.dark` in `src/styles/global.css` still hold the pre-add role values
- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- `/dashboard` still shows the current cosmic screen, because this phase does not restyle it

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Token values

### Overview

Record the role values that already exist. Do not choose new ones. The dashboard consumes them in the next phase.

### Changes Required:

#### 1. Deposit the current roles

**File**: `context/changes/dashboard-ui-contract/tokens.md`

**Intent**: The next session can see the exact values this change adopted, and where they came from, without inventing a palette.

**Contract**: The file copies the current `:root` and `.dark` custom properties from `src/styles/global.css` after Phase 1's restore. The first line names that file as the source and states that this change did not replace those values. Do not add cosmic hex, and do not add roles that are not already in the source.

#### 2. Point at the deposit from the source

**File**: `src/styles/global.css`

**Intent**: The token block itself says where the adopted copy lives.

**Contract**: One comment directly above `:root` names `context/changes/dashboard-ui-contract/tokens.md` as the copy of these starter values. The custom properties and `@theme inline` mappings stay numerically unchanged. `bg-cosmic` stays for the pages this change does not own.

### Success Criteria:

#### Automated Verification:

- `context/changes/dashboard-ui-contract/tokens.md` records the `:root` and `.dark` blocks and names `src/styles/global.css` as their source
- The deposited role values match the current `:root` and `.dark` values in `src/styles/global.css`
- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- `/dashboard` colours are unchanged from the end of Phase 1

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Dashboard view

### Overview

Rebuild only `/dashboard` from the deposited roles and the repo components. Other routes keep their current classes.

### Changes Required:

#### 1. One presentation component

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: The page and the later state sink render the same markup, so the sink cannot drift into a second dashboard.

**Contract**: An Astro component, with no client directive and no `client:load` on its React leaves. Props are `email`, `error`, `loadErrorMessage`, `showForm`, `decisionTitle`, `options` (`{ id, name }[]`), and `criteria` (`{ id, name, weight }[]`). It imports `Card` from `@/components/ui/card`, `Button` from `@/components/ui/button`, `Input` from `@/components/ui/input`, and `Label` from `@/components/ui/label`. Visible colour comes from role classes: `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `text-muted-foreground`, `border-border`, `bg-destructive`, `text-destructive`. No `bg-cosmic`, no palette colour utilities, no hex, and no `className` that overrides `Button` or `Input` with a palette class.

The tree order is: the word Dashboard, the welcome line with the email, the query error when `error` is set, then either the load-failure sentence, or the create-title form when `showForm` is set, or the decision title plus an Options section plus a Criteria section. Sign out is last. When `loadErrorMessage` is set, the create form and both sections are absent.

Copy, in English: no-decision empty state "Name the decision you want to make."; empty options "No options yet."; empty criteria "No criteria yet."; load failure "Could not load your decision". Section headings are "Options" and "Criteria". The authenticated-only sentence is absent. Each criterion still shows the text `{name} ({weight})` in list order. Delete is `Button` `variant="destructive"` with the label Delete. Save, Add option, Add criterion, Create, and Sign out keep those labels. Save and Sign out use `variant="outline"`. Create, Add option, and Add criterion use the default variant. The workspace is a `Card` wider than the sign-in panel's `max-w-sm`. Query `error` text is shown in a destructive-role message, not in `border-red-500` or `bg-red-900`.

Form contracts stay: create title `POST /api/decisions` with `name="title"`; option create, update, and delete `POST /api/options` with hidden `intent` and, for update and delete, hidden `id`; criterion forms `POST /api/criteria` the same way, including `weight`. Sign out stays `POST /api/auth/signout`. The add form for a list is omitted when that list has 20 rows. The option name appears in the document before an `name="id"` for that same option id.

#### 2. Page owns the data branches

**File**: `src/pages/dashboard.astro`

**Intent**: The route keeps its loader and hands display data to the component. A failed child read becomes the load-failure sentence instead of an empty editor.

**Contract**: The page still uses `Layout`, `createClient`, and the decision query. It reads the `error` field of both the options query and the criteria query. If either error is set, it passes `loadErrorMessage` "Could not load your decision" and does not pass those rows through as an empty list. If an error is unset and the payload is null, the list is still `[]`. `showForm` remains the no-row, no-load-error branch. The page renders `DecisionDashboard` and does not keep a second copy of the form markup. Logged-out behavior stays in `src/middleware.ts` and is not reimplemented here.

### Success Criteria:

#### Automated Verification:

- The hardcoded-value scan on `src/pages/dashboard.astro` and `src/components/dashboard/DecisionDashboard.astro` returns no matches
- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- A signed-in account with no decision sees "Name the decision you want to make." and a Title field, and does not see "This page is only for authenticated users."
- A signed-in decision shows the headings Options and Criteria, a destructive Delete, and an outline Save
- `?error=` and "Could not load your decision" use the destructive role
- A failed option or criterion read shows "Could not load your decision" and does not show the add forms
- A logged-out `GET /dashboard` still redirects to `/auth/signin`
- The smoke body still contains `Price (3)` before `Battery (1)`, and rename and delete still post that option's id
- `/dashboard` is checked at desktop width and at one mobile width

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: States

### Overview

Show the seven states for this view on one fixture page, and leave a rule so the next edit keeps using the tokens and components.

### Changes Required:

#### 1. Kitchen sink

**File**: `src/pages/dev/dashboard-states.astro`

**Intent**: One unauthenticated page shows every state of `DecisionDashboard` with fixture props, so review does not depend on a live decision.

**Contract**: The route is `/dev/dashboard-states`. It is not added to `PROTECTED_ROUTES`. It imports `DecisionDashboard` and renders fixture cells for default, hover, focus-visible, disabled, error, and empty. It does not call Supabase. Default shows a decision with one option and one criterion. Hover and focus-visible cells contain the same controls so a person can point and tab. Disabled renders a `Button` with `disabled` set and does not change the 20-row rule on the real page. Error passes `error` "Could not save the option". Empty includes the no-decision fixture and the empty-lists fixture. Loading is a labeled N/A cell whose reason is that the dashboard HTML is rendered after the server read, with no client loading interval. A labeled N/A cell states that a logged-out `/dashboard` redirects in middleware and this template does not render for that request. The sink is not linked from the dashboard. Its markup uses the same role classes as the component. No Playwright install and no screenshot baseline file.

#### 2. Agent rule

**File**: `AGENTS.md`

**Intent**: The next agent has one place that names the token source, the component directory, and the ban on palette classes for this view.

**Contract**: Add a short UI block to `AGENTS.md`. Do not create a second rules file, and do not edit the `@przeprogramowani/10x-cli` block in `CLAUDE.md`. The block states that role values live in `src/styles/global.css` (`:root`, `.dark`, published by `@theme inline`), that shared components live in `src/components/ui`, that a missing one is added with `npx shadcn add <name>`, that `src/pages/dashboard.astro` and `src/components/dashboard/DecisionDashboard.astro` use those tokens and components, and that the state sink is `/dev/dashboard-states`. It forbids hex colours, palette colour utilities, and arbitrary pixel values in those view files. Do not add an ESLint plugin for the scan.

### Success Criteria:

#### Automated Verification:

- `src/pages/dev/dashboard-states.astro` exists and its route is outside `PROTECTED_ROUTES`
- The hardcoded-value scan on `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`, and `src/pages/dev/dashboard-states.astro` returns no matches
- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- `/dev/dashboard-states` shows default, hover, focus-visible, disabled, error, and empty
- The sink marks loading N/A because the dashboard HTML is rendered after the server read
- The sink marks a logged-out dashboard N/A because middleware redirects before the template renders
- `AGENTS.md` names `src/styles/global.css` and `src/components/ui` and forbids palette colours on this view
- The sink is reviewed at desktop width and at one mobile width

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- There is no unit test framework. Do not add one for this change.

### Integration Tests:

- `npm run lint`, `npx astro check`, and `npm run build` after every phase.
- The hardcoded-value scan, from Phase 3 onward, on the view files named in that phase. The pattern is the audit pattern: hex, `rgb`/`hsl`/`oklch`, arbitrary `px`/`rem`, and Tailwind palette colour utilities. A count above zero fails the phase.
- `npm run smoke` against a running server remains the auth and dashboard proof. It is listed under manual verification because it needs the local Supabase stack and a server. Phase 3 does not pass while `Price (3)` or the option id lookup would fail.

### Manual Testing Steps:

1. Open `/dashboard` signed out and confirm the redirect to `/auth/signin`.
2. Sign in with no decision. Confirm the empty-state sentence and the title form. Confirm the old authenticated-only sentence is gone.
3. Create a decision, add an option and a criterion, and confirm the headings, the destructive Delete, and the text `Price (3)` when the criterion is Price at weight 3.
4. Force a save error and a decision load error. Confirm both messages use the destructive role.
5. Open `/dev/dashboard-states`. Tab to a field and a button. Confirm the ring is visible. Hover a button. Confirm the disabled cell looks disabled. Check one mobile width.

## Performance Considerations

The dashboard stays a server-rendered page with the same decision, option, and criterion reads. The sink uses fixture props and does not add a query. No new client bundle is required for the forms, because the UI components render as static HTML.

## Migration Notes

No schema change and no data migration. Existing decisions, options, and criteria render through the new markup with the same POST bodies.

## References

- Related research: `context/changes/dashboard-ui-contract/research.md`
- Token source: `src/styles/global.css:6-111`
- Existing button: `src/components/ui/button.tsx:8`
- Smoke strings: `scripts/smoke.mjs:42-46`, `scripts/smoke.mjs:132`, `scripts/smoke.mjs:142`
- Logged-out redirect: `src/middleware.ts:4`, `src/middleware.ts:18-21`
- Child-read failure this plan shares with the ranking plan: `context/changes/weighted-ranking/plan.md:45`
- shadcn config: `components.json`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Environment and library

#### Automated

- [x] 1.1 `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, and `src/components/ui/label.tsx` exist and export the shadcn components
- [x] 1.2 `:root` and `.dark` in `src/styles/global.css` still hold the pre-add role values
- [x] 1.3 `npm run lint` passes
- [x] 1.4 `npx astro check` passes
- [x] 1.5 `npm run build` passes

#### Manual

- [ ] 1.6 `/dashboard` still shows the current cosmic screen, because this phase does not restyle it

### Phase 2: Token values

#### Automated

- [x] 2.1 `context/changes/dashboard-ui-contract/tokens.md` records the `:root` and `.dark` blocks and names `src/styles/global.css` as their source
- [x] 2.2 The deposited role values match the current `:root` and `.dark` values in `src/styles/global.css`
- [x] 2.3 `npm run lint` passes
- [x] 2.4 `npx astro check` passes
- [x] 2.5 `npm run build` passes

#### Manual

- [ ] 2.6 `/dashboard` colours are unchanged from the end of Phase 1

### Phase 3: Dashboard view

#### Automated

- [x] 3.1 The hardcoded-value scan on `src/pages/dashboard.astro` and `src/components/dashboard/DecisionDashboard.astro` returns no matches
- [x] 3.2 `npm run lint` passes
- [x] 3.3 `npx astro check` passes
- [x] 3.4 `npm run build` passes

#### Manual

- [ ] 3.5 A signed-in account with no decision sees "Name the decision you want to make." and a Title field, and does not see "This page is only for authenticated users."
- [ ] 3.6 A signed-in decision shows the headings Options and Criteria, a destructive Delete, and an outline Save
- [ ] 3.7 `?error=` and "Could not load your decision" use the destructive role
- [ ] 3.8 A failed option or criterion read shows "Could not load your decision" and does not show the add forms
- [ ] 3.9 A logged-out `GET /dashboard` still redirects to `/auth/signin`
- [ ] 3.10 The smoke body still contains `Price (3)` before `Battery (1)`, and rename and delete still post that option's id
- [ ] 3.11 `/dashboard` is checked at desktop width and at one mobile width

### Phase 4: States

#### Automated

- [x] 4.1 `src/pages/dev/dashboard-states.astro` exists and its route is outside `PROTECTED_ROUTES`
- [x] 4.2 The hardcoded-value scan on `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`, and `src/pages/dev/dashboard-states.astro` returns no matches
- [x] 4.3 `npm run lint` passes
- [x] 4.4 `npx astro check` passes
- [x] 4.5 `npm run build` passes

#### Manual

- [ ] 4.6 `/dev/dashboard-states` shows default, hover, focus-visible, disabled, error, and empty
- [ ] 4.7 The sink marks loading N/A because the dashboard HTML is rendered after the server read
- [ ] 4.8 The sink marks a logged-out dashboard N/A because middleware redirects before the template renders
- [ ] 4.9 `AGENTS.md` names `src/styles/global.css` and `src/components/ui` and forbids palette colours on this view
- [ ] 4.10 The sink is reviewed at desktop width and at one mobile width
