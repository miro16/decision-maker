# Dashboard design-system contract — Plan Brief

> Full plan: `context/changes/dashboard-ui-contract/plan.md`
> Research: `context/changes/dashboard-ui-contract/research.md`

## What & Why

`/dashboard` is the signed-in decision screen, and it is built from palette classes and hand-made buttons inside a sign-in panel. The repo already has role tokens in `src/styles/global.css` and a `Button` in `src/components/ui`. This change makes that one view read them.

## Starting Point

The starter published neutral roles through `@theme inline`, and shadcn is already configured in `components.json`. The dashboard does not import `src/components/ui`. Its background is `bg-cosmic`, its heading is a blue-purple gradient, and Save and Delete look the same. A logged-out visit redirects to `/auth/signin`. A failed option or criterion read looks like an empty list.

## Desired End State

A signed-in person sees the decision on a `Card`, with Options and Criteria headings, shared inputs, and a destructive Delete. Errors use the destructive role. An account with no decision sees "Name the decision you want to make." A failed list read sees "Could not load your decision" instead of a blank editor. The colours are the starter's existing neutral roles, not a new theme.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Variant | Dead token file: the view reads the tokens already in the repo | The screens use palette classes while `:root` and `.dark` already hold the roles | Research |
| Theme | No new motif; starter neutral values stay | Choosing colours is not the first move on this path | Plan |
| View | `/dashboard` only | One UI change owns one view; auth and the landing page stay on `bg-cosmic` | Research |
| Library | `npx shadcn add card input label`; no `shadcn init` | `Button` already exists; Card, Input, and Label do not | Plan |
| Ranking | Deferred to `weighted-ranking` | That change owns scores and order | Research |
| Child-read error | Show "Could not load your decision" and hide the editors | A failed read must not look like an empty list, and the sentence already exists | Plan |
| Smoke text | Keep `{name} ({weight})` and `name="title"` | `scripts/smoke.mjs` asserts `Price (3)` and the create-title field | Plan |
| Loading and logged-out | N/A on the sink, with the reason written on the cell | The page is server-rendered, and middleware redirects before the template | Plan |
| Guard | A short block in `AGENTS.md`; no new lint package | The repo already has ESLint, and a new plugin was not part of this path | Plan |
| Dark mode | No toggle, and no edit to `.dark` for this view | The class exists in CSS and nothing in `src` applies it | Plan |

## Scope

**In scope:**

- Add `Card`, `Input`, and `Label` under `src/components/ui` without replacing the token values
- Deposit the current `:root` and `.dark` values in `context/changes/dashboard-ui-contract/tokens.md`
- Rebuild `/dashboard` from those roles and components, including headings, empty copy, and the child-read error
- A fixture sink at `/dev/dashboard-states` and an `AGENTS.md` rule for this view

**Out of scope:**

- A new palette, removing `bg-cosmic`, and restyling any page other than the dashboard
- Ranking, score fields, a dark-mode toggle, and a per-field `?error=` parameter
- Changing the 20-row cap from "omit the form" to "disable the button"
- Playwright, a unit test runner, or an ESLint plugin

## Architecture / Approach

`dashboard.astro` keeps the Supabase reads and passes display props into `src/components/dashboard/DecisionDashboard.astro`. That component is also what the sink renders with fixtures. `Card`, `Input`, `Label`, and `Button` render as static HTML inside the Astro file, so the POST forms stay server forms. If either child query returns an error, the page passes the existing load-failure sentence and does not pass the rows.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Environment and library | `card.tsx`, `input.tsx`, `label.tsx` | `shadcn add` rewrites `:root` / `.dark` |
| 2. Token values | `tokens.md` plus a source comment; values unchanged | Depositing a CLI-rewritten palette by mistake |
| 3. Dashboard view | One component and the real `/dashboard` | Smoke breaks if `Price (3)` or the option id disappears |
| 4. States | `/dev/dashboard-states` and the `AGENTS.md` rule | The sink gets linked or placed under `/dashboard`, where middleware redirects it |

**Prerequisites:** `components.json`, the current `src/styles/global.css` roles, and `src/components/ui/button.tsx`. Smoke in Phase 3 needs a running app and local Supabase.
**Estimated effort:** about 1–2 sessions across 4 phases.

## Open Risks & Assumptions

- Phase 1 restores the token blocks if the shadcn CLI rewrites them. Phase 2 copies the restored file.
- `context/changes/weighted-ranking/` will also edit `src/pages/dashboard.astro`. This plan does not add ranking markup, so that change still has a place to render order.
- `/dev/dashboard-states` is public and shows fixture names only. It is not linked from the product UI.
- The lesson "Show a load failure instead of an empty dashboard" has an empty Rule. This plan reuses the sentence already on the page. It does not fill that lesson in.

## Success Criteria (Summary)

- A signed-in dashboard uses the starter's neutral roles and repo components, and Delete is distinguishable from Save.
- No decision, an empty list, a failed list read, and a save error each say what happened. A logged-out visit still goes to sign-in.
- `/dev/dashboard-states` shows the states a person can reach, and marks loading and the logged-out page as N/A with a reason.
