---
date: 2026-11-17T00:45:00+01:00
researcher: Cursor agent
git_commit: 1eaafff
branch: feat/futuristic-dashboard-ui
repository: decision-maker
topic: "Audit of /dashboard for a futuristic neon-dark theme (/10x-ui audit brief)"
tags: [research, ui, dashboard, tokens, tailwind, shadcn]
status: complete
last_updated: 2026-11-17
last_updated_by: Cursor agent
---

# Research: Audit of /dashboard for a futuristic neon-dark theme

**Date**: 2026-11-17
**Git Commit**: 1eaafff
**Branch**: feat/futuristic-dashboard-ui
**Repository**: decision-maker

## Research Question

Which charges (missing tokens, missing shared component, accidental architecture) stand between the current `/dashboard` and a dark neon theme (deep navy-black base, cyan with violet accent, soft glow), so that the restyle lives in the token layer and shared components and not in literals?

## Summary

The contract from `dashboard-ui-contract` holds for the three view files: the literal scan reports 0 hits in each (`node scripts/scan-dashboard-literals.mjs`, run 2026-11-17, total 0). The problem is upstream of the view. In the inspected `src/styles/global.css` every colour role has zero chroma (greys only), so the palette cannot express cyan or violet. The `.dark` block exists, but nothing in `src/layouts/Layout.astro` or under `src/pages` sets a `dark` class, so it never takes effect. The view builds its panels, markers and alerts from repeated class strings instead of shared components, and `bg-cosmic`, the only existing "dark gradient", is a utility with hex literals outside the scanned files. Five charges follow; four go into the plan, one is deferred.

## Detailed Findings

### Tokens (source → views)

- `:root` and `.dark` hold role values in `oklch()`; `@theme inline` publishes them as `--color-*` (`src/styles/global.css:4-110`). In the inspected `:root` block `--primary`, `--accent`, `--ring`, `--border`, `--muted` all have chroma 0 (`global.css:12-31`), and the same holds for the `.dark` block except `--destructive` and the `--chart-*` / `--sidebar-primary` entries (`global.css:43-71`).
- No glow or shadow role exists. The view and the ui components use `shadow-xs` and `shadow-sm` (`src/components/ui/button.tsx:14-20`, `src/components/ui/card.tsx:9`).
- The view reads tokens only: classes such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`, `bg-accent` appear across `src/components/dashboard/DecisionDashboard.astro` (this inspected file). The token values copied in `context/changes/dashboard-ui-contract/tokens.md` match `global.css` today.

### Dark mode is dead code (accidental architecture)

- `src/layouts/Layout.astro:12` renders `<html lang="en">` with no class. A search of `src` for a `dark` class assignment or a theme toggle found none (the `dark:` utilities in `src/components/ui/button.tsx` and `input.tsx` are variants that need the class).
- Effect on the user: the app renders only the light values; the `.dark` block, including any new neon values, would do nothing until the class is applied.

### Missing shared components (view → source)

- `src/components/ui` contains `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx` and `LibBadge.astro` (Glob of that directory). `components.json` exists, so `npx shadcn add <name>` is the path for additions.
- The same panel class string `rounded-lg border border-border p-3` (with `space-y-2`, or `space-y-3` and `border-destructive` for the delete confirmation) is repeated for option cards, criterion cards, score forms, ranking rows and the confirmation panel: `DecisionDashboard.astro:152,176,216,269,300`. A restyle (glow, radius) would need one edit per copy.
- The "incomplete" and "tie" markers are hand-built `<span class="rounded-md border border-border px-2 py-0.5 ...">` (`DecisionDashboard.astro:305,310`); a `badge` component would own them. `badge` is not in `src/components/ui`.
- The error alert is a hand-built `<p ... role="alert">` with `border-destructive bg-destructive/10 ... text-destructive` (`DecisionDashboard.astro:88-89`), and a second load-error variant at line 95; an `alert` component would own both.
- The "Delete decision" and "Cancel" controls are plain anchors styled with `text-destructive underline` (`DecisionDashboard.astro:147`) because `Button` has no anchor mode without `asChild` (phase-2 note of `multiple-decisions`). The decision list items are anchors with their own class string (`DecisionDashboard.astro`, list section).

### Hex literals outside the scanned files

- `bg-cosmic` is defined with hex stops `#0a0e1a`, `#0f1529`, `#0a0e1a` (`src/styles/global.css:114-116`). It is used by `src/pages/auth/signin.astro:9`, `signup.astro:9`, `confirm-email.astro:22` and `src/components/Welcome.astro:5`; the dashboard uses `bg-background` instead (`DecisionDashboard.astro:55-56` area). Effect: the auth pages are navy gradient while the dashboard is plain white; after the restyle both must come from the same role tokens.
- `src/components/ui/button.tsx:14` has `text-white` on the destructive variant: a literal in a ui component, not in the scanned view files.

### Contrast

- The known light-mode pair `text-destructive` on `bg-destructive/10` was measured at about 3.97:1 earlier in the project (below 4.5:1); the alert at `DecisionDashboard.astro:88-89` uses exactly that pair. This is a carried measurement, not re-measured in this research. The plan's gate re-measures it for the new values.

## Charges

| # | Category | Evidence | Effect on the user | Plan |
| --- | --- | --- | --- | --- |
| 1 | Missing tokens | All colour roles have chroma 0 (`global.css:12-31,43-71`); no glow role | The theme cannot show cyan, violet or glow without literals | Phase 1: new neon values in `.dark`, a `glow` role published through `@theme inline` (reference variables, no raw colours) |
| 2 | Accidental architecture | `Layout.astro:12` sets no class; `.dark` never applies | Dark values are dead; the user sees only light | Phase 1: apply `dark` on `<html>` as the default (no toggle) |
| 3 | Missing shared component | Repeated panel string `DecisionDashboard.astro:152,176,216,269,300`; hand-built markers (305,310) and alerts (88-89, 95) | Each visual change needs several edits, so spots drift | Phase 2: `npx shadcn add badge alert`; panels become one `Card`-based pattern; view uses them |
| 4 | Missing tokens / hex outside scan | `bg-cosmic` hex stops `global.css:114-116`, used by 4 files | Auth pages and dashboard disagree on the background | Phase 1: rebuild `bg-cosmic` from role tokens (no markup change in auth pages) |
| 5 | Contrast | `text-destructive` on `bg-destructive/10` about 3.97:1 (carried) | Error text is hard to read on the alert | Phase 3: re-measure for the new values in the states gate; adjust the token if below 4.5:1 |
| D | Deferred | `button.tsx:14` `text-white` on the destructive variant | None visible with the neon values | Deferred: a ui-component literal outside the view; revisit if contrast fails |

## Code References

- `src/styles/global.css:4-110` - `:root`, `.dark` and `@theme inline`; `global.css:114-116` - `bg-cosmic` hex gradient
- `src/layouts/Layout.astro:12` - `<html>` without a theme class
- `src/components/dashboard/DecisionDashboard.astro` - view; repeated panels at 152, 176, 216, 269, 300; markers at 305, 310; alerts at 88-89, 95; delete link at 147
- `src/components/ui/button.tsx:14-20`, `card.tsx:9`, `input.tsx` - shared components with `dark:` variants
- `scripts/scan-dashboard-literals.mjs` - the three-file literal scan; `AGENTS.md:32-38` - UI rules
- `context/changes/dashboard-ui-contract/tokens.md` - raw token values

## Architecture Insights

- Contract variant is "existing design system" (Tailwind 4 + shadcn, role tokens): extend `global.css`, no second `shadcn init`, add components with `npx shadcn add`.
- The restyle has two layers that can fail separately: token values (change the look everywhere) and the shared components the view imports (change the structure once). The order from `/10x-ui` applies: environment and library, token values, one view, states.
- Because `Layout.astro` is shared, applying `dark` and changing token values also changes the auth and home pages. That is intended (one palette) but those pages are not edited; they are only screenshotted as a check.

## Historical Context (from prior changes)

- `context/changes/dashboard-ui-contract/` - created the three-file scan, the `/dev/dashboard-states` sink and the AGENTS.md UI block this change extends.
- `context/changes/multiple-decisions/plan.md` - phase 2 added the list, add form, rename form, delete confirmation and the anchor-styled controls that this restyle covers.

## Related Research

- None other under `context/changes/**/research.md` covers the dashboard's visual layer.

## Open Questions

1. Exact neon values (hue and chroma of the cyan and violet roles) are a design choice for `/10x-plan`, to be deposited in a `tokens.md` in the change folder.
2. Whether the destructive button should get a `--destructive-foreground` role (charge D) depends on the contrast measurement.
