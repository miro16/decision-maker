# First private decision Implementation Plan

## Overview

A signed-in user saves one private decision, identified only by its title, and sees that title on the dashboard. The account system already exists. This slice adds the first owner-scoped row and the screen that creates and shows it. Options, criteria, scores, and the weighted ranking stay in later slices.

The roadmap slice for this work is S-01, whose Change ID is `first-private-decision`. This folder is `s01`, so planning does not retitle that roadmap row.

## Current State Analysis

Registration, sign-in, sign-out, and a session cookie already work. Middleware loads the user with `supabase.auth.getUser()` and protects only `/dashboard`. The dashboard renders the user's email and a sign-out form. There is no decision table, no decision query, and no `user.id` use in application code.

`createClient()` in `src/lib/supabase.ts` returns `null` when Supabase env is missing. Auth API routes answer that with a redirect and `?error=`. New tables must enable row-level security with a policy per operation scoped to `auth.uid()`, and migration files are named `YYYYMMDDHHmmss_short_description.sql`. There is no unit-test runner. CI lint, typecheck, and build run on `main`, and a separate smoke job starts local Supabase and runs `scripts/smoke.mjs` against the preview server. That smoke checks auth redirects and status codes only; it does not read response bodies.

## Desired End State

A signed-in user opens `/dashboard`, submits the title `Which laptop?`, and then sees that title with no create form. Submitting `Which city?` afterward, including by calling the endpoint directly, does not store or show it. A second account's dashboard does not contain `Which laptop?`. A blank title is rejected and no row is stored.

### Key Discoveries:

- `PROTECTED_ROUTES` is only `["/dashboard"]` (`src/middleware.ts`). A new `/api/decisions` route is not covered by that prefix check.
- Sign-in, sign-up, and sign-out are form posts that redirect (`src/pages/api/auth/signin.ts`). The dashboard sign-out control is a plain HTML form (`src/pages/dashboard.astro`).
- `context.locals.user` is set in middleware from `getUser()` (`src/middleware.ts`). Application code today reads `user.email` only.
- No `supabase/migrations/` files exist. `scripts/smoke.mjs` keeps one cookie jar and discards response bodies, so a privacy check needs a second jar and a body read.
- `zod` is not installed. `AGENTS.md` says to add it on the first validated API input.

## What We're NOT Doing

- Rebuilding registration, sign-in, or the post-sign-in redirect to `/`.
- A note, description, or any field besides the title.
- A second decision for the same account (FR-009).
- Renaming or deleting the title.
- Options, weighted criteria, scores, or the ranking (S-02 and S-03).
- Sharing a decision, or an admin panel (FR-010).
- A React island for this form. It has no client state.
- Update or delete row-level policies.
- A unit-test framework.

## Implementation Approach

Add one `decisions` table with a single title column and a unique owner. Row-level security allows that owner to select and insert only. The existing dashboard either shows a plain HTML form or, once a row exists, shows the title and omits the form. The form posts to a new API route that follows the auth redirect pattern, validates the title with zod, and sets `user_id` from the session. The unique owner constraint rejects a second insert even when the form is not on the page. Extend the CI smoke flow, which already boots local Supabase, to prove the owner sees `Which laptop?` and another account does not.

## Critical Implementation Details

`/api/decisions` is not inside `PROTECTED_ROUTES`. The handler must treat a missing `context.locals.user` as anonymous and redirect to `/auth/signin`. The inserted `user_id` comes from `context.locals.user.id`, never from the form. With row-level security enabled and no update or delete policy, those operations stay denied; do not add policies for them in this slice.

## Phase 1: Owner-scoped decision table

### Overview

Create the table that can hold one title per account and nothing from any other account.

### Changes Required:

#### 1. Decisions migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_decisions.sql`

**Intent**: Add the first application table so a later request can store one private title for the signed-in user.

**Contract**: Table `public.decisions` with `id` (uuid, primary key), `user_id` (uuid, not null, references `auth.users`), `title` (text, not null), and `created_at` (timestamptz, not null, default now). `user_id` is unique. A check constraint requires `char_length(btrim(title))` between 1 and 200. Enable row-level security. Two policies only: select and insert, each requiring `auth.uid() = user_id`. No update policy and no delete policy.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` applies `supabase/migrations/*_create_decisions.sql` without error

#### Manual Verification:

- Policies allow the owner to select and insert, and there is no update or delete policy
- Inserting a second decision for the same `user_id` fails

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Dashboard create and show

### Overview

The signed-in user creates `Which laptop?` on the dashboard and sees it. The form then disappears. Another account does not see that title, and a second title does not replace the first.

### Changes Required:

#### 1. Create-decision endpoint

**File**: `src/pages/api/decisions.ts`

**Intent**: Accept the dashboard form and insert one title for the signed-in user, rejecting a blank title and a second decision.

**Contract**: `POST` reads form field `title`. Add `zod` and trim the title; reject it when empty or longer than 200 characters. Missing `context.locals.user` redirects to `/auth/signin`. `createClient()` returning null, a validation failure, or a unique-owner violation redirects to `/dashboard?error=` with a short message. Success redirects to `/dashboard`. Insert `user_id` from `context.locals.user.id` and the trimmed title only.

#### 2. Dashboard

**File**: `src/pages/dashboard.astro`

**Intent**: Show the create form only when this user has no decision, and show the stored title once they do.

**Contract**: Keep the page on the existing protected `/dashboard` route. Load this user's row with `createClient()` and the session. When the client is null, do not render the form. When no row exists, render a plain HTML form (`method="POST"`, `action="/api/decisions"`, input `name="title"`) and show `Astro.url.searchParams.get("error")` when present. When a row exists, render its `title` and do not render the form. Leave the email line and the sign-out form in place.

#### 3. Smoke coverage

**File**: `scripts/smoke.mjs`

**Intent**: Prove the privacy rule and the one-title rule through the same preview server CI already boots.

**Contract**: Keep the existing auth steps. After the owner is signed in, post `title=Which laptop?` to `/api/decisions` and require the owner's dashboard body to contain `Which laptop?`. Using a second cookie jar, sign up and sign in as another account and require that dashboard body not to contain `Which laptop?`. With the owner's jar, post `title=Which city?` and require the owner's dashboard to contain `Which laptop?` and not `Which city?`. Post a blank title before the successful create and require a redirect to `/dashboard?error=` and no title on the dashboard. The request helper must read the body for these steps; status and `Location` alone cannot see the title.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes
- `npm run smoke` passes, including the owner's title `Which laptop?`, its absence for a second account, rejection of a second title `Which city?`, and rejection of a blank title

#### Manual Verification:

- In the browser, submitting `Which laptop?` shows that title and removes the create form
- A second account's dashboard does not show `Which laptop?`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

No unit-test framework exists, and this slice does not add one. Title rules are covered by the endpoint's zod check and by smoke.

### Integration Tests:

`npm run smoke` against the preview server with local Supabase, which is the smoke job in `.github/workflows/ci.yml`. New steps use the literals `Which laptop?`, `Which city?`, and a blank title.

### Manual Testing Steps:

1. Sign in and open `/dashboard`. Submit `Which laptop?`. The form is gone and the title is visible.
2. Submit `Which city?` by repeating the request. The page still shows `Which laptop?` only.
3. Sign in as a different user. `/dashboard` does not show `Which laptop?`.
4. Submit a blank title on an account with no decision. The form stays and an error is shown.

## Performance Considerations

The dashboard reads at most one row, by the unique `user_id`. No cache and no extra round trip beyond that read and the existing `getUser()` call in middleware.

## Migration Notes

There are no decision rows to backfill. The migration is forward-only. `npx supabase db reset` is the local check. Applying it to the hosted Supabase project is a human approval, and rolling back the Worker does not roll back the table.

## References

- Roadmap slice S-01: `context/foundation/roadmap.md`
- PRD FR-003 and FR-008: `context/foundation/prd.md`
- Session and protected route: `src/middleware.ts`
- Null-client redirect pattern: `src/pages/api/auth/signin.ts`
- Dashboard shell: `src/pages/dashboard.astro`
- Auth smoke: `scripts/smoke.mjs`
- CI smoke job: `.github/workflows/ci.yml`
- Owner-scoped table rule: `AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Owner-scoped decision table

#### Automated

- [x] 1.1 `npx supabase db reset` applies `supabase/migrations/*_create_decisions.sql` without error

#### Manual

- [x] 1.2 Policies allow the owner to select and insert, and there is no update or delete policy
- [x] 1.3 Inserting a second decision for the same `user_id` fails

### Phase 2: Dashboard create and show

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npx astro check` passes
- [ ] 2.3 `npm run build` passes
- [ ] 2.4 `npm run smoke` passes, including the owner's title `Which laptop?`, its absence for a second account, rejection of a second title `Which city?`, and rejection of a blank title

#### Manual

- [ ] 2.5 In the browser, submitting `Which laptop?` shows that title and removes the create form
- [ ] 2.6 A second account's dashboard does not show `Which laptop?`
