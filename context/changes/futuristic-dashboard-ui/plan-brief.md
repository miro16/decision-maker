# Futuristic Dashboard UI — Plan Brief

> Full plan: `context/changes/futuristic-dashboard-ui/plan.md`
> Research: `context/changes/futuristic-dashboard-ui/research.md`

## What & Why

`/dashboard` gets a dark neon look (navy-black base, cyan main accent, violet second accent, subtle glow). The user asked for a "futuristic" look. The change goes through the `/10x-ui` contract: audit into charges, tokens first, then shared components, then states and a visual gate, then a rule for the next agent.

## Starting Point

The view already uses role tokens only (0 literals), but every colour role is grey, there is no glow role, the `.dark` block never applies because `<html>` has no class, `bg-cosmic` has hex stops, and the view repeats one panel class five times and hand-builds markers and alerts. `badge` and `alert` do not exist in `src/components/ui`.

## Desired End State

A dark neon dashboard with cyan primary buttons and focus ring, a violet highlight on the current decision and the tie and incomplete markers, and a soft glow on the page card. Sign-in, sign-up and home inherit the palette. A state sink shows every state, contrast is measured and recorded, and `AGENTS.md` says where tokens, glow and components live.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Motif | Dark neon | The user's choice from three options | User, 2026-11-16 |
| Palette | Cyan primary, violet secondary | The user's choice; highest legibility of the three | User, 2026-11-17 |
| Glow | Subtle: card, current decision, focus | Readability before effects | User, 2026-11-17 |
| Scope | Dark app-wide through `<html class="dark">`; auth and home views not edited | One palette without touching other views | User, 2026-11-17 |
| Theme toggle | None; `:root` light values stay | Keeps the change to one view plus global tokens | Plan |
| Glow token | `--glow` role plus `--shadow-glow` referencing it | No raw colours in `@theme inline` | Research |
| Components | `npx shadcn add badge alert`; panels on `Card`; anchors use `buttonVariants` | Extend the existing system, no second button | Research |
| Contrast | Re-measure 8 pairs, text at 4.5:1, ring and border at 3:1 | Replaces the carried 3.97:1 figure | Research |
| Deferred | `text-white` on the destructive button | A ui-component literal outside the view | Research |

## Scope

**In scope:**

- Token values, glow role, dark default, `bg-cosmic` from tokens, `tokens.md`
- Shared `badge` and `alert`, one panel pattern, anchor controls on `buttonVariants`
- States, contrast, screenshots, the `AGENTS.md` rule

**Out of scope:**

- A theme toggle, editing auth or home views, behaviour or copy changes, web fonts or animation libraries, a screenshot-test runner

## Architecture / Approach

Phase 1 makes the whole app able to render the palette (class, tokens, glow, `bg-cosmic`). Phase 2 routes the view through shared components. Phase 3 proves states and contrast and leaves the rule. `class="dark"` on `<html>` is the single switch and the rollback.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Environment and tokens | `dark` default, neon values, `--glow`, tokenised `bg-cosmic`, `tokens.md` | The shared Layout also changes auth and home pages |
| 2. Dashboard view on shared components | `badge`, `alert`, one panel pattern, anchor controls on real variants | Visible text must not change (smoke asserts it) |
| 3. States, contrast, gate and rule | 7-state matrix, measured contrast, screenshots, `AGENTS.md` rule | Neon values may fail 4.5:1 and need adjusting |

**Prerequisites:** `multiple-decisions` is on `main` (deployed 2026-11-16).
**Estimated effort:** About 2 sessions across 3 phases.

## Open Risks & Assumptions

- Auth and home pages change look through the shared Layout; they are screenshotted but not edited.
- Starting token values are a proposal; Phase 3 may adjust hues and lightness to pass contrast.
- Production gets this only after a merge to `main`; no database change is involved.

## Success Criteria (Summary)

- The dashboard looks dark neon, every control shows a visible focus ring, and text and borders meet the contrast targets.
- No literal colours enter the view, behaviour and visible text stay the same (smoke passes), and the rule is in `AGENTS.md`.
