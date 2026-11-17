# Repository Guidelines

Decision Maker: a multi-user web app where a user builds a decision from options and weighted criteria, scores the options, and sees a ranking computed from score × weight. Stack: Astro 7 SSR with React 19 islands, Tailwind 4, and Supabase auth on Cloudflare Workers. Scope and rules: @context/foundation/prd.md.

## Hard rules

- Decisions are private to their owner in v1. Every new table in `supabase/migrations/` enables RLS with per-operation policies scoped to `auth.uid()`.
- Name migrations `YYYYMMDDHHmmss_short_description.sql`.
- Supabase secrets are read only through `astro:env/server` (schema in @astro.config.mjs). Never commit `.env` or `.dev.vars`, and never add a `PUBLIC_` variant.
- `createClient()` in @src/lib/supabase.ts returns `null` when env is missing. Handle that branch the way @src/pages/api/auth/signin.ts does.
- Do not edit the block between `<!-- BEGIN @przeprogramowani/10x-cli -->` markers in `CLAUDE.md`, since the 10x CLI regenerates it. Never write under `context/archive/`.

## Testing

There is no unit test framework yet. The only automated check is `scripts/smoke.mjs`. Before finishing a change, run `npm run lint`, `npx astro check`, and `npm run build`.

## Project Structure

- `src/pages/`: Astro pages. API endpoints go in `src/pages/api/`.
- `src/components/`: write a `.tsx` component only if it uses state, effects, or event handlers; otherwise use `.astro`. Group React components by feature (see `src/components/auth/`). shadcn/ui primitives live in `src/components/ui/`.
- `src/lib/`: services and helpers. Shared types go in `src/types.ts`.
- `src/middleware.ts`: add new auth-only paths to `PROTECTED_ROUTES`.

## Commands

- Scripts: @package.json. `npm run dev` runs on the workerd runtime.
- `npx astro check`: type check, which CI runs.
- `npm run build`: SSR build. Needs `SUPABASE_URL`/`SUPABASE_KEY`.
- `npm run smoke`: auth-flow check against a running server (`BASE_URL`, default `http://localhost:4321`).
- `npx supabase start`: local Supabase (needs Docker).

## UI

- Tokens live in `src/styles/global.css`: role values in `:root` and `.dark`, published through `@theme inline`. Do not write raw colours into `@theme inline`.
- Shared components live in `src/components/ui`. Check that directory before creating a component. Add a missing one with `npx shadcn add <name>`.
- No literal colours or arbitrary px/rem values in the dashboard view. Use role tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`) and the components above. The view files are `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`, and `src/pages/dev/dashboard-states.astro`.
- Dark is the default theme: `class="dark"` on `<html>` in `src/layouts/Layout.astro`, with no toggle. The palette (cyan primary, violet secondary and accent) lives in the `.dark` block of `src/styles/global.css`, and the glow in the `--glow` role there. Measured contrast is in `context/changes/futuristic-dashboard-ui/tokens.md`.
- Use the `shadow-glow` utility (from `--shadow-glow` in `@theme inline`) for the glow. Do not write a box-shadow with a colour.
- `badge` and `alert` exist in `src/components/ui`. Use `Badge` for markers and `Alert` (destructive) for error messages. Anchors styled as buttons use `buttonVariants` from `src/components/ui/button.tsx`, not hand-written classes.
- The state sink for that view is `/dev/dashboard-states`.
- `scripts/scan-dashboard-literals.mjs` fails when those view files contain a literal. The pre-commit hook runs it.

## Coding Style

- Merge Tailwind classes with `cn()` from @src/lib/utils.ts, not string concatenation.
- Do not use React directives such as `"use client"`. Put hooks in `src/components/hooks/`.
- Validate API input with zod. It is not installed yet, so add `zod` on first use.

## Commits & CI

@.github/workflows/ci.yml triggers only on `master`, but this repo works on `main`. CI will not run until the trigger is changed.

## Environment

npm blocks the `esbuild`/`workerd` postinstall scripts. If dev or build fails, run `npm install-scripts approve esbuild workerd`.
