---
change_id: futuristic-dashboard-ui
title: Futuristic neon-dark theme for the dashboard
status: new
created: 2026-11-16
updated: 2026-11-16
archived_at: null
---

## Notes

UI change via `/10x-ui`. Runs after `multiple-decisions`, so the restyle also covers the decision list, add, rename and delete controls.

- **View:** `/dashboard` (`src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`); state sink `/dev/dashboard-states`.
- **Contract variant:** existing design system (Tailwind 4 + shadcn, role tokens in `src/styles/global.css`). Extend it, no second `shadcn init`.
- **Motif (user choice, 2026-11-16):** dark neon. Deep navy-black base, cyan with violet accent, soft glow on focus and cards. The `.dark` class is not applied anywhere today (no theme toggle, `Layout.astro` sets no class), and the token set is fully achromatic, so the motif goes in at the token layer and dark becomes the default.
- **Pre-audit:** `node scripts/scan-dashboard-literals.mjs` reports 0 literals in the three view files, so no cleanup is needed before the restyle. Known issue to fold in: `text-destructive` on `bg-destructive/10` has about 3.97:1 contrast in light mode (below 4.5:1).
- `bg-cosmic` in `global.css` writes hex values directly; check whether it should be replaced by role tokens.
- Not in scope: other pages (landing, auth), a theme toggle unless the plan asks for one.

Next: `/10x-research futuristic-dashboard-ui` with the `/10x-ui` audit brief (charges), then `/10x-plan`.
