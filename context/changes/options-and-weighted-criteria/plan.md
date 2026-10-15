# Options and Weighted Criteria Implementation Plan

## Overview

A signed-in user adds options and weighted criteria to the one private decision they already have, and can correct or remove those rows. Scores and the weighted ranking stay in S-03. This slice stores the lists that ranking will later multiply.

## Current State Analysis

S-01 is in the product. `public.decisions` holds one title per account: `user_id` is unique, the title is 1–200 characters after trim, and row-level security allows select and insert only. `POST /api/decisions` reads `title`, validates it with zod, and sets `user_id` from `context.locals.user.id`. The dashboard shows a create form when that user has no row, and the stored title with no form when a row exists. A load error shows neither. `/api/decisions` is not under `PROTECTED_ROUTES`; the handler redirects a missing user to `/auth/signin`.

There is no options table, no criteria table, and no weight. The smoke script already proves the title rules with two cookie jars and a response body. There is no unit-test runner. zod is a direct dependency.

## Desired End State

The owner of `Which laptop?` adds the option `MacBook` and the criterion `Price` with weight 3. The dashboard shows the title, then `MacBook`, then `Price (3)`, in the order they were added. The title form stays gone. A second account sees none of those names. A blank name, a second option `macbook`, a weight outside 1–5, and a 21st option are rejected and not stored. The owner can rename `MacBook` to `ThinkPad`, change the weight, and delete a row.

### Key Discoveries:

- `decisions` has select and insert policies only (`supabase/migrations/20261011142249_create_decisions.sql`). Child rows must not be stored by adding update or delete on that table.
- The dashboard prints `?error=` only while the create-title form is visible (`src/pages/dashboard.astro`). Option and criterion failures happen after the title exists.
- `scripts/smoke.mjs` reads the body and keeps an owner jar and a second jar. New checks have to keep the existing `Which laptop?`, `Which city?`, and blank-title steps.
- `PROTECTED_ROUTES` is only `["/dashboard"]` (`src/middleware.ts`). New API routes must check `context.locals.user` themselves.

## What We're NOT Doing

- Scores, or the weighted ranking (FR-006, FR-007, S-03).
- A second decision for the same account (FR-009).
- Sharing a decision, or an admin panel (FR-010).
- A note or description on an option or a criterion.
- Dragging rows into a new order.
- Weights outside the integers 1–5, or weights that must sum to 100.
- Renaming or deleting the decision title, or adding update or delete policies on `decisions`.
- A separate decision page, or a React island.
- A unit-test framework.

## Implementation Approach

Add two child tables, `options` and `criteria`, each hanging off `decisions.id`. Row-level security on those tables allows the decision's owner to select, insert, update, and delete. The dashboard, once it shows a title, lists both collections in insertion order and posts plain HTML forms to two API routes. Those routes take the decision from the signed-in user's single row, never from the form. The database rejects a 21st row, a case-insensitive duplicate name, and a weight outside 1–5 even when the form is bypassed. Smoke extends the existing preview flow.

## Critical Implementation Details

The dashboard renders the error query only in the branch where the user has no decision. Option and criterion failures happen after the title exists, so that message has to render in the title branch too. Otherwise a rejected duplicate or a 21st row redirects to a page that hides the reason.

The 20-row cap and the case-insensitive name are database invariants, same as the one-decision rule. A before-insert count that cannot see existing rows, because row-level security hides them from the trigger, would accept a 21st row. The inserting owner must be able to see that decision's rows for the count. Uniqueness is an index on `(decision_id, lower(btrim(name)))`, not a plain unique column, or `Dell` and `dell` would both be stored. `position` is assigned at insert as one past the current maximum and is not changed when the name or weight changes, so a delete leaves a gap and the remaining rows stay in insertion order.

## Phase 1: Option and criterion tables

### Overview

Create the two tables that can hold up to 20 names and up to 20 weighted criteria for one decision, visible only to that decision's owner.

### Changes Required:

#### 1. Options and criteria migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_options_and_criteria.sql`

**Intent**: Store options and weighted criteria under the existing decision so a later request can add, correct, and remove them without opening update or delete on `decisions`.

**Contract**: Table `public.options` with `id` (uuid, primary key), `decision_id` (uuid, not null, references `public.decisions` on delete cascade), `name` (text, not null), `position` (integer, not null), and `created_at` (timestamptz, not null, default now). Table `public.criteria` with those columns plus `weight` (integer, not null). A check requires `char_length(btrim(name))` between 1 and 200 on both tables. A check requires `weight` between 1 and 5 on `criteria`. A unique index on `(decision_id, lower(btrim(name)))` per table. A unique `(decision_id, position)` per table. A before-insert trigger sets `position` to one more than the current maximum for that decision (zero when none) and rejects the insert when that decision already has 20 rows in that table. Enable row-level security. Four policies per table: select, insert, update, and delete, each allowing the action only when the parent decision's `user_id` equals `auth.uid()`. No new policy on `public.decisions`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` applies `supabase/migrations/*_create_options_and_criteria.sql` without error

#### Manual Verification:

- Options and criteria allow the owner to select, insert, update, and delete, and `decisions` still has no update or delete policy
- Inserting a 21st option for the same decision fails
- Inserting a second option whose trimmed name matches an existing one regardless of case fails
- Inserting a criterion with weight 0 or 6 fails

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Dashboard lists

### Overview

The owner adds `MacBook` and `Price` at weight 3 on the dashboard, sees them under the title, and can rename, reweight, and delete. Another account does not see those names. A blank name, a duplicate, a bad weight, and a 21st option do not stick.

### Changes Required:

#### 1. Option endpoint

**File**: `src/pages/api/options.ts`

**Intent**: Accept the dashboard forms that create, rename, and delete one option for the signed-in user's decision.

**Contract**: `POST` reads `intent` (`create`, `update`, or `delete`) and `name`. `update` and `delete` also read `id`. Missing `context.locals.user` redirects to `/auth/signin`. `createClient()` returning null, no decision for that user, a validation failure, a duplicate name, or a 21st option redirects to `/dashboard?error=` with a short message. Success redirects to `/dashboard`. Trim `name` and reject it when empty or longer than 200 characters. Load `decision_id` from the user's single `decisions` row. Do not read `decision_id` or `user_id` from the form. `create` inserts the trimmed name. `update` changes that row's name only. `delete` removes that row. `position` stays unchanged on update.

#### 2. Criterion endpoint

**File**: `src/pages/api/criteria.ts`

**Intent**: Accept the same three actions for a criterion, including its weight.

**Contract**: Same redirects, session decision, and name rules as the option endpoint. `create` and `update` also read `weight` and reject it unless it is an integer from 1 to 5. `create` inserts the trimmed name and that weight. `update` changes name and weight only. `delete` removes that row.

#### 3. Dashboard

**File**: `src/pages/dashboard.astro`

**Intent**: Show both lists under the stored title, and let the owner add, correct, and remove rows without bringing back the title form.

**Contract**: Keep the page on `/dashboard`. When a decision row exists, render its title, then options ordered by `position` ascending, then criteria in that same order. Render each criterion as `Name (weight)`, for example `Price (3)`. Render `Astro.url.searchParams.get("error")` when it is present, including in this branch. When the user has fewer than 20 options, render a plain HTML form (`method="POST"`, `action="/api/options"`, `intent=create`, input `name="name"`). At 20 options, omit that form. Same for criteria, with an additional weight input, posted to `/api/criteria`. Each existing row gets plain HTML forms to update and delete that row's `id`. Do not render these lists or forms when the user has no decision, or when `createClient()` returns null. Leave the email line and the sign-out form in place. Leave the title form omitted once a title exists.

#### 4. Smoke coverage

**File**: `scripts/smoke.mjs`

**Intent**: Prove the lists, the privacy rule, and the rejection rules through the same preview server CI already boots.

**Contract**: Keep the existing auth steps and the `Which laptop?`, `Which city?`, and blank-title steps. After the owner has `Which laptop?`, post a blank option name and require a redirect to `/dashboard?error=` and no new option title on the dashboard. Post option `MacBook`, then criterion `Price` with weight `3`, and require the owner's dashboard body to contain `MacBook` and `Price (3)`. Post criterion `Battery` with weight `1` and require `Price (3)` to appear before `Battery (1)`. Using the second cookie jar, require that account's dashboard not to contain `MacBook` or `Price`. With the owner's jar, post option `macbook` and require an error redirect while `MacBook` remains. Post criterion `Range` with weight `9` and require an error redirect and no `Range` in the body. Update `MacBook` to `ThinkPad` and require `ThinkPad` and not `MacBook`. Delete `ThinkPad` and require the body not to contain `ThinkPad`. Create options `N01` through `N20` and require `N21` to be rejected and absent from the body while `N20` is present. The request helper must keep reading the body.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes
- `npm run smoke` passes, including the owner's `MacBook` and `Price (3)` before `Battery (1)`, their absence for a second account, rejection of a blank name, a duplicate `macbook`, weight `9` on `Range`, and a 21st option `N21`, plus rename to `ThinkPad` and a delete that removes it

#### Manual Verification:

- In the browser, under `Which laptop?`, adding `MacBook` and `Price` with weight 3 shows `MacBook` and `Price (3)` in insertion order, and the title form stays gone
- Renaming, changing the weight, and deleting update that list
- A second account's dashboard does not show `MacBook` or `Price`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

No unit-test framework exists, and this slice does not add one. Name, weight, duplicate, and cap rules are covered by database constraints and by smoke.

### Integration Tests:

`npm run smoke` against the preview server with local Supabase, which is the smoke job in `.github/workflows/ci.yml`. New steps use the literals `MacBook`, `macbook`, `ThinkPad`, `Price`, `Battery`, `Range`, weights `3`, `1`, and `9`, and option names `N01` through `N21`.

### Manual Testing Steps:

1. Sign in, create `Which laptop?`, and add option `MacBook` and criterion `Price` with weight 3. The title form stays gone. The page shows `MacBook` and `Price (3)`.
2. Add criterion `Battery` with weight 1. `Price (3)` stays above `Battery (1)`.
3. Rename `MacBook` to `ThinkPad`, change `Price` from 3 to 5, and delete `Battery`. The list matches those edits.
4. Submit `macbook`, a blank name, weight 9, and a 21st option. Each shows an error and does not appear as a stored row.
5. Sign in as a different user. `/dashboard` does not show `MacBook`, `ThinkPad`, or `Price`.

## Performance Considerations

Each list is at most 20 rows, ordered by `position` on the owner's decision. No cache. The dashboard read adds those two lists to the existing decision read and the existing `getUser()` call in middleware.

## Migration Notes

There are no option or criterion rows to backfill. The migration is forward-only. `npx supabase db reset` is the local check. Applying it to the hosted Supabase project is a human approval, and rolling back the Worker does not roll back the tables. Deleting a decision cascades to its options and criteria.

## References

- Roadmap slice S-02: `context/foundation/roadmap.md`
- PRD FR-004, FR-005, and FR-008: `context/foundation/prd.md`
- Prior decision contract: `context/changes/s01/plan.md`
- Decision table: `supabase/migrations/20261011142249_create_decisions.sql`
- Dashboard shell: `src/pages/dashboard.astro`
- Title endpoint: `src/pages/api/decisions.ts`
- Auth smoke: `scripts/smoke.mjs`
- Owner-scoped table rule: `AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Option and criterion tables

#### Automated

- [x] 1.1 `npx supabase db reset` applies `supabase/migrations/*_create_options_and_criteria.sql` without error — 938d69f

#### Manual

- [x] 1.2 Options and criteria allow the owner to select, insert, update, and delete, and `decisions` still has no update or delete policy — 938d69f
- [x] 1.3 Inserting a 21st option for the same decision fails — 938d69f
- [x] 1.4 Inserting a second option whose trimmed name matches an existing one regardless of case fails — 938d69f
- [x] 1.5 Inserting a criterion with weight 0 or 6 fails — 938d69f

### Phase 2: Dashboard lists

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npx astro check` passes
- [x] 2.3 `npm run build` passes
- [x] 2.4 `npm run smoke` passes, including the owner's `MacBook` and `Price (3)` before `Battery (1)`, their absence for a second account, rejection of a blank name, a duplicate `macbook`, weight `9` on `Range`, and a 21st option `N21`, plus rename to `ThinkPad` and a delete that removes it

#### Manual

- [ ] 2.5 In the browser, under `Which laptop?`, adding `MacBook` and `Price` with weight 3 shows `MacBook` and `Price (3)` in insertion order, and the title form stays gone
- [ ] 2.6 Renaming, changing the weight, and deleting update that list
- [ ] 2.7 A second account's dashboard does not show `MacBook` or `Price`
