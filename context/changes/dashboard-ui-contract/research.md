---
date: 2026-11-08T15:35:12+01:00
researcher: miro16
git_commit: af6d10a89b3f256b7edbf411a1186b0329c77c69
branch: feat/options-and-weighted-criteria
repository: decision-maker
topic: "Two-way UI audit of /dashboard: tokens, shared components, entry states"
tags: [research, ui, dashboard, design-tokens]
status: complete
last_updated: 2026-11-08
last_updated_by: miro16
---

# Research: Two-way UI audit of /dashboard

**Date**: 2026-11-08T15:35:12+01:00
**Researcher**: miro16
**Git Commit**: af6d10a89b3f256b7edbf411a1186b0329c77c69
**Branch**: feat/options-and-weighted-criteria
**Repository**: decision-maker

## Research Question

For the one view `src/pages/dashboard.astro` (`/dashboard`), where do this repo's colour values and shared components live, which views read them, and which literals on this view should have been a token or a shared component? What does a person see when they open this view logged out, with no data, or from a direct link? Produce 3–5 charges, each with a file, a line, and one sentence of user impact, in the categories missing tokens, missing shared component, and accidental architecture.

## Summary

On commit `af6d10a89b3f256b7edbf411a1186b0329c77c69`, the value source is `src/styles/global.css`: `:root` and `.dark` hold the role values (`global.css:6-73`), and `@theme inline` publishes them as `--color-*` (`global.css:75-111`). The shared-component directory `src/components/ui` contains `button.tsx` and `LibBadge.astro`. A role-class search of `src/**/*.{astro,tsx,ts,css}` hits `button.tsx:8-19` and the base layer at `global.css:119-122`, and does not hit `src/pages/dashboard.astro`. The hardcoded-value scan on that dashboard file returns 71 matches. The page builds its own glass panel, inputs, and buttons. Five charges are recorded below.

A logged-out request for `/dashboard`, including a request where `createClient()` returns null, is redirected to `/auth/signin` before the page renders (`src/middleware.ts:18-21`, `src/lib/supabase.ts:6-7`). A signed-in visit with no decision row renders a Title field and Create (`dashboard.astro:203-220`). A signed-in visit with a decision renders unlabeled option and criterion editors inside the same `max-w-sm` card (`dashboard.astro:46`, `dashboard.astro:60`).

## Charges

### 1. Missing tokens — `src/pages/dashboard.astro:47`

The heading uses `from-blue-200 to-purple-200`. The scan defined in the UI audit, run on this file, returns 71 matches; the first palette class on the card is `border-white/10` at `dashboard.astro:46`. The same file's root wrapper uses `bg-cosmic` (`dashboard.astro:45`), and that utility is the hex gradient `#0a0e1a` / `#0f1529` at `global.css:113-115`. Role values for this treatment already exist as `--primary` and `--foreground` (`global.css:10-11`), published at `global.css:85-86`.

A signed-in person sees a blue-purple glass screen whose colours stay on those palette classes when the theme tokens change.

### 2. Missing tokens — `src/pages/dashboard.astro:55`

The `?error=` paragraph uses `border-red-500/30 bg-red-900/30 text-red-300`. The load-failure paragraph repeats that class string at `dashboard.astro:199`. `--destructive` is set at `global.css:22` and published at `global.css:94`.

A person whose save or load failed reads that message in a one-off red, so the destructive role is not the colour of the failure.

### 3. Missing shared component — `src/pages/dashboard.astro:79`

The option Save button and the option Delete button (`dashboard.astro:89`) share `rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs transition-colors hover:bg-white/20`. That string contains no `focus-visible` class. Criterion Save and Delete repeat it at `dashboard.astro:149` and `dashboard.astro:159`. `Button` is exported from `src/components/ui/button.tsx:35`, with a destructive variant at `button.tsx:13` and `focus-visible:ring-ring/50` on the shared base at `button.tsx:8`. This page's frontmatter imports `Layout` and `createClient` (`dashboard.astro:2-3`). A search for `@/components/ui` under `src` hits `src/components/auth/SubmitButton.tsx:3` and no dashboard file.

Delete looks like Save, and keyboard focus on these buttons does not use the ring token.

### 4. Missing shared component — `src/pages/dashboard.astro:46`

The decision sits in `w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-8 text-center text-white backdrop-blur-xl`. `src/pages/auth/signin.astro:10` and `src/pages/auth/signup.astro:10` repeat that panel without `text-center`; `src/pages/auth/confirm-email.astro:23` repeats it with `text-center`. The directory `src/components/ui` contains `button.tsx` and `LibBadge.astro`. A search for the string `LibBadge` under `src` returned no matches. There is no `Card` file in that directory. Per-item frames repeat `rounded-lg border border-white/10 p-3` at `dashboard.astro:62` and `dashboard.astro:119`.

The person works on the decision inside a sign-in panel (`max-w-sm`), with each option and criterion in a hand-built box.

### 5. Accidental architecture — `src/pages/dashboard.astro:60`

The signed-in card stacks, in this order: the email line (`dashboard.astro:50`), the sentence "This page is only for authenticated users." (`dashboard.astro:53`), an options `<section>` (`dashboard.astro:60`) with no heading, a criteria `<section>` (`dashboard.astro:117`) with no heading, and Sign out (`dashboard.astro:224`). With a decision and empty lists, the first editor under the title is the Option field (`dashboard.astro:96-114`). With no decision row, `showForm` (`dashboard.astro:37`) renders a Title field and a Create button (`dashboard.astro:203-220`). A logged-out request, and a request where `createClient()` returns null, redirects to `/auth/signin` (`src/middleware.ts:20`, `src/lib/supabase.ts:6-7`) and does not render this template. On the success branch, option and criterion errors are not read; a null payload becomes `[]` (`dashboard.astro:25-35`). This file, as read in this audit, contains no score field and no ranking list. The PRD's primary success criterion includes scoring and a weighted ranking (`context/foundation/prd.md:51`).

Someone who opens the page signed in, including from a direct link, gets a disclaimer and then unlabeled editors in the order those features were added; someone whose option list failed to load gets that same empty editor.

**Deferred:** drawing a ranking on this view. Reason: scoring and weighted order belong to `context/changes/weighted-ranking/`. The plan still covers the unlabeled stack, the empty account, and the false-empty child read.

`AGENTS.md` and `CLAUDE.md` were read for a rule that tells an agent to use one-off colours or arbitrary values. `AGENTS.md:20` places shadcn/ui primitives in `src/components/ui/`, and `AGENTS.md:34` says to merge Tailwind classes with `cn()`. No `.cursor/rules`, `.windsurfrules`, or `copilot-instructions.md` is present in the repo root. This pass found no such one-off-style rule, so none is charged.

## Detailed Findings

### Token source → views

Values live in `:root` (`global.css:6-39`) and `.dark` (`global.css:41-73`). `@theme inline` maps them to `--color-*` (`global.css:75-111`), which is what makes utilities such as `bg-primary` exist. `@layer base` applies `border-border`, `outline-ring/50`, `bg-background`, and `text-foreground` (`global.css:117-123`). `@utility bg-cosmic` (`global.css:113-115`) is a linear-gradient of the hex colours `#0a0e1a` and `#0f1529`, beside the role tokens.

The role-class pattern `(bg|text|border|ring|outline|from|via|to)-(primary|primary-foreground|background|foreground|card|card-foreground|muted|muted-foreground|destructive|secondary|secondary-foreground|accent|accent-foreground|border|input|ring)`, including opacity suffixes, was searched in `src/**/*.{astro,tsx,ts,css}`. Hits are `src/components/ui/button.tsx:8-19` and `src/styles/global.css:119` plus `global.css:122`. `src/pages/dashboard.astro` is absent from that result.

The hardcoded-value scan (hex, rgb/hsl/oklch, arbitrary px/rem, and Tailwind palette colour utilities) on `src/pages/dashboard.astro` returned 71 matches. That file has no hex, `rgb(`, or `oklch(` of its own; the hex for its background sits in `bg-cosmic`.

Palette classes also appear on other screens in this repo, outside this change's view: `src/components/Welcome.astro:22`, `src/pages/auth/signin.astro:11`, `src/components/Topbar.astro:5`, `src/components/auth/FormField.tsx:6`, `src/components/auth/ServerError.tsx:11`, `src/components/ui/LibBadge.astro:10`. `bg-cosmic` is also on `Welcome.astro:5`, `signin.astro:9`, `signup.astro:9`, and `confirm-email.astro:22`. Those files are evidence that the token file is unread by the screens, and they are outside the single view this change names.

A search for `from "@/components/ui` and `from '@/components/ui` under `src` returned `SubmitButton.tsx:3`. Its `className` includes `bg-purple-600` and `text-white` (`SubmitButton.tsx:18`). `cn()` passes classes through `twMerge` (`src/lib/utils.ts:4`). The default button variant still declares `bg-primary` (`button.tsx:12`). This audit did not render that button.

### Shared components → views

`src/components/ui/button.tsx` exports `buttonVariants` (`button.tsx:7`) and `Button` (`button.tsx:35`). `src/components/ui/LibBadge.astro` is a badge span at `LibBadge.astro:10`. A directory listing of `src/components/ui` returned `button.tsx` and `LibBadge.astro`. The same import search returned no file under `src/pages`. `/auth/signin` and `/auth/signup` reach `Button` through `SignInForm` / `SignUpForm` and `SubmitButton`. `/dashboard` does not.

Dashboard controls that repeat local class strings:

- Eight `<button>` elements, starting at `dashboard.astro:77`, `87`, `108`, `147`, `157`, `188`, `215`, and `225`.
- Text inputs at `dashboard.astro:69`, `101`, `128`, `138`, `171`, `180`, and `208`. Their class strings include `border-white/20 bg-white/10` and include no `focus-visible` class.
- Labels at `dashboard.astro:67`, `99`, `126`, `136`, `169`, `178`, and `205`.

`src/components/auth/FormField.tsx:6` and `ServerError.tsx:11` are auth components with the same palette classes. Dashboard does not import them. Importing `ServerError` would copy `border-red-500/30 bg-red-900/30 text-red-300` into this view.

### Entry states

Observed from the template and middleware, not from a browser session.

| Arrival | What the code renders | Anchor |
| --- | --- | --- |
| Logged out, or `locals.user` null | Redirect to `/auth/signin`. `PROTECTED_ROUTES` is `["/dashboard"]`. The redirect target carries no `error` query. | `src/middleware.ts:4`, `src/middleware.ts:18-21` |
| Env missing (`SUPABASE_URL` or `SUPABASE_KEY` empty) | `createClient()` returns null, middleware sets `locals.user` to null, same redirect. The page guard `if (supabase && user)` is not reached on that request. | `src/lib/supabase.ts:6-7`, `src/middleware.ts:14-16`, `dashboard.astro:15` |
| Signed in, decision query error | Welcome line, the authenticated-only sentence, Sign out, and the fixed text "Could not load your decision". No title form. | `dashboard.astro:38-40`, `dashboard.astro:198-201` |
| Signed in, no decision row | Same welcome card, then Title and Create. | `dashboard.astro:36-37`, `dashboard.astro:203-220` |
| Signed in, decision, empty option and criterion arrays | Title, then Option / Add option, then Criterion / Weight / Add criterion. The two `<section>` elements have no `h2` or `h3`. | `dashboard.astro:59-60`, `dashboard.astro:96-114`, `dashboard.astro:117`, `dashboard.astro:166-194` |
| Signed in, decision, with options | The option name is a static line and the value of the Name input. Save and Delete are sibling forms with the same button classes. | `dashboard.astro:63-73`, `dashboard.astro:79`, `dashboard.astro:89` |
| Direct `/dashboard` while signed in | The card for whichever branch above matches the data. | `dashboard.astro:44-46` |
| Direct `/dashboard?error=...` while signed in | The query text is printed in the paragraph at line 55, in addition to the data branch. Option, criterion, and decision POSTs redirect here with short sentences such as "Could not save the option". | `dashboard.astro:7`, `dashboard.astro:54-56`, `src/pages/api/options.ts:42` |

## Code References

- `src/styles/global.css:6-73` — `:root` and `.dark` role values
- `src/styles/global.css:75-111` — `@theme inline` publishing `--color-*`
- `src/styles/global.css:113-115` — `bg-cosmic` hex gradient
- `src/pages/dashboard.astro:45-47` — cosmic page, glass card, blue-purple heading
- `src/pages/dashboard.astro:55` — `?error=` palette red
- `src/pages/dashboard.astro:79` — raw Save button
- `src/components/ui/button.tsx:8` — focus-visible ring on `Button`
- `src/components/ui/button.tsx:35` — `Button`
- `src/middleware.ts:18-21` — logged-out redirect
- `src/pages/dashboard.astro:25-35` — child-list errors dropped, null payload becomes `[]`
- `context/foundation/prd.md:51` — primary success criterion: create, score, see a weighted ranking

## Architecture Insights

This repo matches the Tailwind v4 + shadcn/ui variant: values in `:root` / `.dark`, published through `@theme inline`, components copied under `src/components/ui`. `components.json` points `tailwind.css` at `src/styles/global.css` and `aliases.ui` at `@/components/ui` (`components.json:8`, `components.json:16`). The contract variant for this change is a fresh starter whose token file and `Button` exist, while `src/pages/dashboard.astro` uses palette classes and local elements. `body` does receive `bg-background text-foreground` from the base layer (`global.css:121-122`); the dashboard wrapper then paints `bg-cosmic` over that page (`dashboard.astro:45`).

## Historical Context (from prior changes)

- `context/foundation/lessons.md:34-39` — "Show a load failure instead of an empty dashboard." Verdict: **partial**. The problem sentence says a `loadError` leaves `decisionTitle` and `showForm` false and shows the welcome line and sign-out with no title, no form, and no error. The current file still leaves both flags false, still shows the welcome line and Sign out, and still omits the title and the Create form (`dashboard.astro:47-53`, `dashboard.astro:224-231`). The "no error" clause is contradicted: the `else` branch sets `loadErrorMessage` (`dashboard.astro:39`) and the template prints it (`dashboard.astro:198-201`). The lesson's Rule and Applies to lines are empty. Its pointer `dashboard.astro:19` is now `.eq("user_id", user.id)`.
- `context/changes/weighted-ranking/research.md:57` — states that the lesson sentence is contradicted by the current branch. Verdict on that research sentence: **partial**. The "no error" clause is contradicted, which is the conflict that note names; the rest of the lesson sentence still matches the template, so calling the whole sentence contradicted is broader than this pass.
- `context/changes/weighted-ranking/plan-brief.md:69` — the lesson is not a rule to re-implement, and the page shows "Could not load your decision". Verdict: **supported** by `dashboard.astro:39` and `dashboard.astro:199-201`.
- `context/changes/options-and-weighted-criteria/plan.md:20` — describes a dashboard that prints `?error=` while the create-title form is visible. Verdict as a description of the current template: **contradicted**. `dashboard.astro:54-56` renders `error` before the `decisionTitle` branch, so the paragraph is in the title branch as well. Verdict as the plan's record of the problem it set out to fix (`plan.md:42`): **supported** as history; the current file has the paragraph outside that branch.
- `context/changes/weighted-ranking/research.md:28` — on this same commit, a search of `src/**/*.{ts,tsx,astro}`, `supabase/**/*.sql`, and `scripts/**` for `score` or `ranking` found no matches. Verdict: **not re-run in this audit**. This audit's own read of `dashboard.astro` found no score field and no ranking markup in that file. The absence claim beyond this file stays with that earlier search.
- `context/changes/weighted-ranking/plan.md:45` — a ranking must not treat a failed option or criterion read as an empty list, citing `dashboard.astro:25-35`. Verdict: **supported** as a description of the current destructure: the error fields are not read, and `optionRows ?? []` / `criterionRows ?? []` run at `dashboard.astro:34-35`.

## Related Research

- `context/changes/weighted-ranking/research.md` — where scoring would attach on this dashboard, and the child-read branch at `dashboard.astro:25-35`
- `context/changes/options-and-weighted-criteria/plan.md` — the dashboard list and `?error=` rendering this view grew from

## Open Questions

- Ranking markup is specified in `context/foundation/prd.md:51` and planned under `context/changes/weighted-ranking/`. This audit records that the current dashboard has no ranking. Whether this UI change draws a ranking is a planning boundary with that change, not a missing fact about the current file.
- `src/components/ui` has no `Card` or `Input`. Adding them with the existing shadcn path (`components.json` is present) is a plan choice. This research does not choose the component set.
- Entry outcomes above are from source branches. This pass did not open the running app.
