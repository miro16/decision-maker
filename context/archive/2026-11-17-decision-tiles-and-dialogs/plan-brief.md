# Decision Tiles and Dialogs — Plan Brief

> Full plan: `context/changes/decision-tiles-and-dialogs/plan.md`
> Research: `context/changes/decision-tiles-and-dialogs/research.md`

## What & Why

Decisions (laptop, holiday, ...) become square tiles, and the editing forms move into popups, so `/dashboard` is no longer one long page of forms. The table, ranking and tie-breaker wheel stay on the page.

## Starting Point

`DecisionDashboard.astro` stacks a one-column decision list, the new-decision form, rename and delete controls, the table, the wheel and a Manage section with an edit card per option and criterion. There is no dialog component. All writes are plain forms posting to `/api/*`, and smoke finds option ids in the Manage forms by position in the HTML.

## Desired End State

A grid of square tiles with a "+" tile; for the selected decision the buttons `Edit decision`, `Options (n)` and `Criteria (n)`, each opening a dialog with the same forms; the delete confirmation as a dialog opened by `?confirm=delete`; after saving options or criteria their dialog reopens.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Tiles | Square grid, title only, "+" tile at the end | Reads as a set of things to pick | User, 2026-11-17 |
| Popups | New decision, rename and delete, options, criteria | These are the long editing forms | User, 2026-11-17 |
| Stays on page | Table, ranking, wheel | The core result should be visible | User, 2026-11-17 |
| Dialog tech | Native `<dialog>` in `.astro` | Forms stay in the HTML, so smoke and plain POST keep working | User + Research |
| Reopen | Options and criteria dialogs reopen after save (no error) | Adding several items in a row | Plan |
| Delete confirm | Server-rendered from `confirm=delete`, shown as a dialog | Keeps the tested mechanism | Research |
| Branch | Stacked on `feat/tie-breaker-wheel` | PR #9 is still open | User, 2026-11-17 |
| Process | Full automation | | User, 2026-11-17 |

## Scope

**In scope:**

- `Modal.astro`, `DecisionTiles.astro`, `DecisionDialogs.astro`, view wiring, smoke re-anchoring
- State sink sections, contrast notes, literal scan entries, `AGENTS.md` rule, screenshots

**Out of scope:**

- API, database, ranking, React dialogs, moving the table or wheel into dialogs, tile counts, theme changes

## Architecture / Approach

Phase 1 adds the primitive, tiles and the decision dialogs. Phase 2 moves options and criteria and re-anchors smoke. Phase 3 proves states, narrow screens and keyboard, and leaves the rule. Rollback is a revert.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Modal, tiles, decision dialogs | Tile grid, new, edit and delete dialogs | Delete confirmation and `name="id"` order for smoke |
| 2. Options and criteria dialogs | Manage section removed, reopen after save, smoke re-anchored | Reopen logic with errors |
| 3. States, gate and rule | State sink, contrast, scan, rule, screenshots | Auto-opening dialog covering the sink |

**Prerequisites:** local Supabase (Docker) for smoke.
**Estimated effort:** About 1 to 2 sessions across 3 phases.

## Open Risks & Assumptions

- Dialogs need JavaScript to open (except the delete confirmation).
- Keyboard focus return after close relies on native `<dialog>` behaviour; checked in the browser.

## Success Criteria (Summary)

- Tiles are square, popups hold the editing forms, the page is short, and the same writes work.
- Smoke passes, the new files pass the literal scan, and there is no horizontal overflow at 390 px.
