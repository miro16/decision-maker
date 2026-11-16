# Literal scan — dashboard view

The scan is hex, `rgb`/`hsl`/`oklch`, arbitrary `px`/`rem` values, and Tailwind palette colour utilities. It runs on the view files only. Token values in `src/styles/global.css` are the source, so that file is not scanned.

## Before

- **71** matches on `src/pages/dashboard.astro`.
- Recorded in the audit on commit `af6d10a89b3f256b7edbf411a1186b0329c77c69` (2026-11-08). The whole view lived in that one file. The component and the state sink did not exist yet.

## After

- **0** on `src/pages/dashboard.astro`.
- **0** on `src/components/dashboard/DecisionDashboard.astro`.
- **0** on `src/pages/dev/dashboard-states.astro`.
- **Total: 0.** Re-run on 2026-11-08 with `node scripts/scan-dashboard-literals.mjs`.

The same command is wired into `.husky/pre-commit`, after `lint-staged`.

## Trial session

A fresh session was asked to add one sentence under the decision title and to follow `AGENTS.md`, without being handed the class names. It wrote the line in `src/components/dashboard/DecisionDashboard.astro` as `text-sm text-muted-foreground` and did not import a new component. The sentence was removed after the trial so the view stays the planned contract. The scan still returns 0.
