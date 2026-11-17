---
date: 2026-11-17T22:30:00+01:00
researcher: Cursor agent
git_commit: ff77446
branch: feat/decision-tiles-and-dialogs
repository: decision-maker
topic: "Audit of /dashboard for square decision tiles and dialogs"
tags: [research, ui, dashboard, dialog, tiles, smoke]
status: complete
last_updated: 2026-11-17
last_updated_by: Cursor agent
---

# Research: Decision tiles and dialogs on /dashboard

## Research Question

What makes `/dashboard` long today, which parts of the code, the smoke script and the state sink depend on that layout, and what constrains a switch to square tiles and dialogs?

## Summary

The view is one file, `src/components/dashboard/DecisionDashboard.astro`, and everything for the current decision is always visible: decision list, new-decision form, rename form, delete link and confirmation, table, tie-breaker, then a Manage section with one card per option and per criterion, each with its own edit and delete forms. The page card is `max-w-5xl`. Every write is a plain HTML form posting to `/api/*` and redirecting back, so dialogs can hold the same forms with no API change. The literal scan reports 0 hits on all six scanned files (tokens are not the problem). The problems are layout and architecture.

## Charges

1. **Accidental architecture: everything for the decision is always on screen.** `DecisionDashboard.astro:126-132` (new-decision form), `:141-185` (rename form, delete link and confirmation) and `:213-331` (Manage section: one edit card per option and criterion plus add forms). With 20 options and 20 criteria the page is several screens of forms below the table. Effect: the user has to scroll past editing controls to reach the ranking and the wheel. Fix: move these into dialogs opened from buttons.
2. **Accidental architecture: the decision list is a single column of full-width buttons.** `DecisionDashboard.astro:103-124`. Effect: with up to 20 decisions the list is a tall column that pushes the table down and does not read as a set of things to pick. Fix: a grid of square tiles, with a "+" tile for a new decision.
3. **Missing shared component: there is no dialog.** `src/components/ui` has `alert`, `badge`, `button`, `card`, `input`, `label` and no dialog or modal. Effect: any popup would be hand-written per place. Fix: add one `Modal.astro` primitive in `src/components/ui` (native `<dialog>`; not `npx shadcn add dialog`, see Architecture Insights).
4. **Missing tokens: none.** Scan: 0 hits in `src/pages/dashboard.astro`, `DecisionDashboard.astro`, `DecisionTable.astro`, `src/pages/dev/dashboard-states.astro`, `TieBreakerWheel.tsx`, `useWheelSpin.ts`. New files must stay at 0 and join the scan.

Deferred: sign-in and home pages keep the old purple style (out of scope); `text-white` in `button.tsx:14` (not a view file); `Empty` and `Load error` states are tall because of `min-h-screen`.

## Detailed Findings

### Forms and redirects

- Option, criterion, score and decision writes are POSTs to `src/pages/api/{options,criteria,scores,decisions}.ts`, each answering with a redirect to `/dashboard?decision=<id>` (or `&error=...`). Smoke asserts those redirects exactly (`exactLocation`). Dialogs hold the same forms, so these stay unchanged.
- After a redirect the page reloads, so an open dialog closes. For adding several options or criteria in a row that is annoying; a small client script can remember which dialog a form was submitted from and reopen it on load when there is no `?error=`.
- The delete confirmation today is server-rendered from `?confirm=delete` and covered by smoke (`Delete permanently` must be absent without the parameter). It can keep that mechanism: render the confirmation as a dialog that opens on load only when `confirmDelete` is true.

### Dialog technology

- `radix-ui` and `class-variance-authority` are installed, so `npx shadcn add dialog` would work, but the Dialog is a React island: server-rendered forms would be passed as Astro children, which are wrapped in `<astro-slot>` and only exist while the dialog is open. The smoke script reads the HTML and could no longer see the manage forms (it finds option and criterion ids in them).
- A native `<dialog>` in an `.astro` component keeps all forms in the HTML (closed dialogs are `display: none`, still in the markup), gives Esc, focus trap, inert background and `::backdrop` for free, and needs about 20 lines of script to open and close (`showModal()`, `close()`). `AGENTS.md` says to write `.tsx` only for state, effects or handlers; here an `.astro` component with one delegated script is enough.

### Smoke coupling (`scripts/smoke.mjs`)

- `MANAGE_HEADING = ">Manage options and criteria<"` anchors `hiddenIdAfter`, `tableOnly` and `tieBreakerOnly` (`smoke.mjs:47-75`). If the Manage section becomes dialogs, the heading must be replaced by the options dialog title, placed after the table and the tie-breaker in the HTML.
- The edit-decision dialog contains `name="id"` (the decision id), so it must come before the options dialog title in the HTML, or the helper would pick it up for an option; the helper searches from the options dialog title onward, so order is: table, tie-breaker, decision dialogs (edit, delete confirmation, new) then options dialog, criteria dialog. Delete confirmation must not render without `confirm=delete`.
- `Add decision`, `What are you deciding?` and `Your decisions` are asserted for the no-decision and list states; they can stay as visible text (dialog title, tile list heading, submit button).

### State sink and scan

- `src/pages/dev/dashboard-states.astro` renders `DecisionDashboard` many times on one page. A modal that opens itself on load (the delete confirmation) would cover the sink. The component needs a preview mode that renders open dialogs inline (`open` attribute, `static` position) with no script, used only by the sink.
- `scripts/scan-dashboard-literals.mjs` must list the new files; `ring-[3px]` style arbitrary values are matched by the scan regex, so new files use `ring-3`.

## Code References

- `src/components/dashboard/DecisionDashboard.astro:103-124` - decision list (single column)
- `src/components/dashboard/DecisionDashboard.astro:126-132` - new-decision form
- `src/components/dashboard/DecisionDashboard.astro:141-185` - rename, delete link, delete confirmation
- `src/components/dashboard/DecisionDashboard.astro:213-331` - Manage options and criteria
- `src/pages/dashboard.astro:60` - `confirmDelete` only when the decision was requested and `confirm=delete`
- `scripts/smoke.mjs:47-75` - manage heading anchors
- `src/pages/dev/dashboard-states.astro` - state sink
- `src/components/ui/button.tsx` - `buttonVariants` for anchors and buttons styled as buttons

## Architecture Insights

- The data flow needs no change: same props, same endpoints. This is presentation plus a small client script.
- A tile grid and dialogs are separate concerns; splitting them into `DecisionTiles.astro` and `DecisionDialogs.astro` keeps `DecisionDashboard.astro` from growing further and gives the dialog markup one home.
- Native `<dialog>` without JavaScript does not open. That is a change from "no JavaScript needed" for editing; the delete confirmation keeps working without script (rendered with the `open` attribute when `confirm=delete`). Accepted: the rest of the app already needs JavaScript for the wheel.
