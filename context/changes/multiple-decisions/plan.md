# Multiple Decisions Implementation Plan

## Overview

A signed-in user can keep up to 20 decisions, type what each one is about ("What are you deciding?"), rename a decision, and delete it after a separate confirmation step. The dashboard shows a list of the account's decisions; the current one is chosen by `?decision=<id>` in the URL, and without that parameter it is the most recently created one. Options, criteria, scores and the ranking work per decision exactly as today. Everything stays private to the owner.

The reason is concrete: production holds an old test decision ("pizza") that cannot be renamed, deleted or replaced, because the account is limited to one decision and the dashboard has no controls for it.

## Current State Analysis

`decisions` has `user_id uuid not null unique` and only `select` and `insert` policies (`supabase/migrations/20261011142249_create_decisions.sql`). `POST /api/decisions` only creates and turns the unique violation (`23505`) into "You already have a decision" (`src/pages/api/decisions.ts:24-31`). `src/pages/dashboard.astro:19-24` loads the decision by `user_id` with `maybeSingle()`, and `src/pages/api/options.ts:25-33`, `src/pages/api/criteria.ts:26-31` and `src/pages/api/scores.ts:23-28` do the same, so none of the dashboard forms post a `decision_id`. The title is rendered as a bare paragraph (`src/components/dashboard/DecisionDashboard.astro:85`). `options`, `criteria` and `scores` reference their parents with `on delete cascade`, so deleting a decision already removes its children.

Production state (checked 2026-11-16): the hosted project has the options-and-criteria and scores migrations applied by hand before this change; the app reads one decision per account.

## Desired End State

On `/dashboard` the owner sees their decisions as a list with the current one highlighted, a form labelled "What are you deciding?" that adds a new decision, and for the current decision a rename field and a delete action. Choosing another decision opens its own options, criteria, scores and ranking. Delete first shows a confirmation panel that says what will be removed (the decision, its options, criteria and scores) with "Delete permanently" and "Cancel". A second account cannot see, rename, delete or write into the first account's decisions. A 21st decision is refused with a message.

### Key Discoveries:

- Four places resolve the decision from the session instead of the form: `src/pages/dashboard.astro:19-24`, `src/pages/api/options.ts:25-29`, `src/pages/api/criteria.ts:26-30`, `src/pages/api/scores.ts:23-27`. They are the whole blast radius of the data change.
- The write endpoints follow one pattern: auth redirect, `createClient()` null branch, zod-validated form, redirect with `?error=` (`src/pages/api/options.ts:15-90`). Create, rename and delete for decisions follow the same `intent` field as options and criteria.
- Cascade deletes already exist for options, criteria and scores (`supabase/migrations/20261011183800_create_options_and_criteria.sql:3,102`; `supabase/migrations/20261116232000_create_scores.sql`). Delete needs no extra cleanup code.
- `decisions` needs `update` and `delete` policies. `options` and `criteria` already have the full set, which is the pattern to copy.
- `context/foundation/lessons.md` "Show a load failure instead of an empty dashboard": a failed list read must show the load-error text, not an empty list or the add form.
- The 20-item cap pattern exists for options (`src/pages/api/options.ts:10`, "at most 20"); decisions get the same cap, enforced in the API (user decision).

## What We're NOT Doing

- Sharing decisions between accounts or an admin panel (`context/foundation/prd.md` Non-Goals).
- A decision-level setting beyond the title (description, archive, duplicate, reorder, drag and drop).
- A uniqueness rule on titles. Two decisions may share a title; the list is ordered by creation time.
- A cookie or server state for the "last opened" decision. The URL is the only selector (user decision).
- A JavaScript confirm dialog or a typed-title confirmation. Delete is a separate server-rendered step (user decision).
- A database trigger for the 20-decision cap. The cap is enforced in `POST /api/decisions`, as the user chose; the other caps in the schema are trigger-based, so this one is weaker against direct database access and is recorded as a known gap.
- The visual restyle (slice S-07 `futuristic-dashboard-ui`), the tie wheel (S-05) and model suggestions (S-04).
- A unit-test framework. `AGENTS.md` says the automated check is `scripts/smoke.mjs`.

## Implementation Approach

Phase 1 changes the data and every write endpoint so that a decision is always named by `decision_id`, and makes the existing single-decision dashboard send that id (it loads the most recently created decision) so the app keeps working between phases. Phase 2 adds the list, the add form, rename, the delete confirmation and `?decision=` selection on top of that.

Decision ids are validated with zod (`z.uuid()`) and always checked against the owner (`.eq("user_id", user.id)` plus RLS), so a forged id from another account finds nothing and the request is refused.

## Critical Implementation Details

- **Ordering of the current decision.** "Most recently created" is `created_at desc`, then `id` as the tiebreak for equal timestamps, so the choice is deterministic. An unknown or foreign `?decision=` value falls back to that default and shows "Decision not found" instead of an empty page or a 500.
- **Redirect targets.** Every endpoint redirect after a write keeps the user on the same decision: `/dashboard?decision=<id>` (plus `&error=` when needed). After deleting the current decision the target is plain `/dashboard`, which resolves to the newest remaining one, or to the add form when none is left.
- **Delete is two requests.** The confirmation panel is rendered by `GET /dashboard?decision=<id>&confirm=delete`; the destructive request is `POST /api/decisions` with `intent=delete`. The GET must never delete anything.
- **Production database.** The Worker deploy does not apply migrations. The new migration must be applied to the hosted project (`npx supabase db push`) before the code that sends `decision_id` goes live; otherwise the unique constraint still blocks a second decision on production.

## Phase 1: Data and API

### Overview

Allow several decisions per account, add rename and delete with owner-scoped policies, and make the options, criteria and scores endpoints take an explicit `decision_id`. The dashboard still shows a single decision (the newest) but now posts its id in every form.

### Changes Required:

#### 1. Migration for several decisions

**File**: `supabase/migrations/20261117000000_allow_multiple_decisions.sql`

**Intent**: Remove the one-decision-per-user constraint, support the per-user newest-first read, and allow the owner to rename and delete a decision.

**Contract**: Drop the unique constraint on `decisions.user_id`. Add an index on `(user_id, created_at desc)`. Add RLS policies `decisions_update_own` (using and with check `auth.uid() = user_id`) and `decisions_delete_own` (using `auth.uid() = user_id`). RLS stays enabled; the existing select and insert policies are untouched. The title length check stays.

#### 2. Decisions endpoint: create, rename, delete

**File**: `src/pages/api/decisions.ts`

**Intent**: Turn the create-only endpoint into the one place that creates, renames and deletes decisions, enforcing the cap and ownership.

**Contract**: `POST` with form field `intent` = `create` | `rename` | `delete`, as in `src/pages/api/options.ts`. `title` is zod-validated (trimmed, 1–200). `create` counts the owner's decisions first; at 20 or more it redirects with "You can have at most 20 decisions"; otherwise it inserts and redirects to `/dashboard?decision=<new id>` (the insert selects the new id). `rename` takes `id` and `title`, updates `.eq("id").eq("user_id")` and treats zero affected rows as "Decision not found". `delete` takes `id`, deletes with the same filters, treats zero rows as "Decision not found", and redirects to `/dashboard`. Unknown intent redirects with "Could not save the decision". The unauthenticated and `createClient() === null` branches stay as they are today.

#### 3. Child endpoints take an explicit decision

**Files**: `src/pages/api/options.ts`, `src/pages/api/criteria.ts`, `src/pages/api/scores.ts`

**Intent**: Stop guessing the decision from the session and use the id the form posts, still scoped to the owner.

**Contract**: Read `decision_id` from the form, validate with `z.uuid()`, and load `decisions` by `id` and `user_id`; a missing, invalid or foreign id redirects with "Create a decision first" as today. Existing child logic (`.eq("decision_id", decision.id)`) is unchanged. Redirects after a write go to `/dashboard?decision=<id>` with the existing `error` handling appended.

#### 4. Shared redirect helper

**File**: `src/lib/dashboard-url.ts`

**Intent**: One definition of the dashboard URL so every endpoint and the page build `?decision=<id>&error=<message>` the same way.

**Contract**: A function taking an optional decision id and an optional error message and returning the path string, with the message URL-encoded. No other behaviour.

#### 5. Dashboard sends the decision id

**Files**: `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Keep the current single-decision view working: load the newest decision and put its id into every option, criterion and score form.

**Contract**: Replace `.maybeSingle()` on `user_id` with a read ordered by `created_at desc, id desc` limited to one row. Pass `decisionId` as a prop. Each form that posts to `/api/options`, `/api/criteria` and `/api/scores` gets a hidden `decision_id` field. Load errors keep the existing "Could not load your decision" path.

#### 6. Smoke steps for the API

**File**: `scripts/smoke.mjs`

**Intent**: Prove the data and API rules without a browser.

**Contract**: The existing steps read the decision id from the `Location` of the create redirect and post it with each child request. New steps: a second decision on the same account is accepted; rename changes the title; delete removes the decision and its options, criteria and scores; the 21st create is refused; a second account cannot rename or delete the first account's decision; options, criteria and scores reject a `decision_id` of another account and a malformed id.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly on a fresh local database: `npx supabase db reset`
- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- Smoke passes with the new steps (several decisions, rename, delete with cascade, cap of 20, foreign `decision_id` refused, second account cannot rename or delete): `npm run smoke`

#### Manual Verification:

- On the local dev server, the existing flow (add options and criteria, enter scores, see the ranking) still works for a single decision after the forms send `decision_id`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Decision list, add, rename, delete confirmation

### Overview

Make the multi-decision model visible: list the decisions, label the title, let the user type what they decide, rename it, and delete it after a confirmation step.

### Changes Required:

#### 1. Load all decisions and resolve the current one

**File**: `src/pages/dashboard.astro`

**Intent**: Read the owner's decisions, pick the current one from `?decision=`, and tell the view whether to show the delete confirmation.

**Contract**: Read `id, title, created_at` for the owner ordered `created_at desc, id desc`. The current decision is the one matching a valid `?decision=` id, else the first row. An unknown or foreign id falls back to the first row and sets the message "Decision not found". `?confirm=delete` is honoured only when a current decision exists. A failed read of the list sets the existing load-error message and renders neither the list nor the add form (lessons.md). Options, criteria and scores are loaded only for the current decision, with the existing failure handling.

#### 2. Decision list, add, rename and delete in the view

**File**: `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Show the user what they are deciding and give them control of it, using the existing tokens and `ui` components (no literals; `AGENTS.md` UI rules).

**Contract**: A "Your decisions" list of links to `/dashboard?decision=<id>` with the current one marked (`aria-current="page"`). A form labelled "What are you deciding?" posting `intent=create` to `/api/decisions`. For the current decision: its title as a labelled heading, a rename form (`intent=rename`, hidden `id`) and a "Delete" link to `?decision=<id>&confirm=delete`. When `confirm=delete` is set, a confirmation panel states that the decision and its options, criteria and scores will be removed (with the counts already loaded), a "Delete permanently" form (`intent=delete`, hidden `id`) and a "Cancel" link back to the decision. With no decisions the add form is the empty state. Reuse `Button`, `Input`, `Label` and `Card`; if a missing shared component is needed, add it with `npx shadcn add <name>`.

#### 3. State sink and literal scan

**Files**: `src/pages/dev/dashboard-states.astro`, `scripts/scan-dashboard-literals.mjs` (only if the scan's file list needs a new view file)

**Intent**: Keep the visual-contract gate honest for the new controls.

**Contract**: Add states for the list with a current decision, the delete confirmation, the cap-reached error and "Decision not found". The scan keeps passing with 0 literals.

#### 4. Smoke steps for the flow

**File**: `scripts/smoke.mjs`

**Intent**: Cover selection and the destructive path through the real pages.

**Contract**: `GET /dashboard?decision=<id>` shows that decision's title and options; an unknown id shows the default decision and "Decision not found"; `?confirm=delete` renders the confirmation and the GET alone deletes nothing; confirming deletes and `/dashboard` then resolves to the newest remaining decision; deleting the last decision shows the add form.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type check passes with 0 errors: `npx astro check`
- Build passes: `npm run build`
- No literal colours or arbitrary values in the dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- Smoke passes with the selection, fallback, confirmation and delete steps: `npm run smoke`

#### Manual Verification:

- Two decisions with titles typed by the user: opening each shows only its own options, criteria, scores and ranking.
- Rename changes the title in the list and in the heading, and a blank title shows an error and changes nothing.
- Delete shows the confirmation with counts; Cancel changes nothing; "Delete permanently" removes the decision and lands on the newest remaining one; deleting the last decision shows the add form.
- `/dev/dashboard-states` shows the new states and has no horizontal overflow at desktop and one mobile width.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before closing the plan.

---

## Testing Strategy

### Unit Tests:

- None. There is no unit-test framework (`AGENTS.md`); `scripts/smoke.mjs` is the automated check.

### Integration Tests:

- `npm run smoke` against a local Supabase: several decisions, cap, rename, delete with cascade, isolation between two accounts, selection and fallback, the confirmation step.

### Manual Testing Steps:

1. Sign in, add "Which laptop?" and "Where to go on holiday?", add one option to each, and switch between them.
2. Rename the first decision; try a blank title.
3. Open the delete confirmation, cancel, then delete and confirm; check the list and the URL.
4. Visit `/dashboard?decision=not-a-real-id` and a decision id from another account.

## Performance Considerations

The list is at most 20 rows per account and is served by the new `(user_id, created_at desc)` index. No caching is needed.

## Migration Notes

The migration only drops a constraint and adds an index and two policies; it deletes no data and the existing decision on every account stays. Apply it to the hosted project with `npx supabase db push` before deploying this code (the Worker deploy does not run migrations). The leftover test decision on production can then be renamed or deleted by its owner in the app.

## References

- Change: `context/changes/multiple-decisions/change.md`
- PRD: `context/foundation/prd.md` (FR-009, FR-003); roadmap slice S-06 in `context/foundation/roadmap.md`
- Cap pattern: `src/pages/api/options.ts:10`; endpoint pattern: `src/pages/api/options.ts:15-90`
- Lesson: `context/foundation/lessons.md` "Show a load failure instead of an empty dashboard"

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data and API

#### Automated

- [x] 1.1 Migration applies cleanly on a fresh local database: `npx supabase db reset`
- [x] 1.2 Linting passes: `npm run lint`
- [x] 1.3 Type check passes with 0 errors: `npx astro check`
- [x] 1.4 Build passes: `npm run build`
- [x] 1.5 Smoke passes with the new steps (several decisions, rename, delete with cascade, cap of 20, foreign `decision_id` refused, second account cannot rename or delete): `npm run smoke`

#### Manual

- [x] 1.6 On the local dev server, the existing flow (add options and criteria, enter scores, see the ranking) still works for a single decision after the forms send `decision_id`.

### Phase 2: Decision list, add, rename, delete confirmation

#### Automated

- [ ] 2.1 Linting passes: `npm run lint`
- [ ] 2.2 Type check passes with 0 errors: `npx astro check`
- [ ] 2.3 Build passes: `npm run build`
- [ ] 2.4 No literal colours or arbitrary values in the dashboard view files: `node scripts/scan-dashboard-literals.mjs`
- [ ] 2.5 Smoke passes with the selection, fallback, confirmation and delete steps: `npm run smoke`

#### Manual

- [ ] 2.6 Two decisions with titles typed by the user: opening each shows only its own options, criteria, scores and ranking.
- [ ] 2.7 Rename changes the title in the list and in the heading, and a blank title shows an error and changes nothing.
- [ ] 2.8 Delete shows the confirmation with counts; Cancel changes nothing; "Delete permanently" removes the decision and lands on the newest remaining one; deleting the last decision shows the add form.
- [ ] 2.9 `/dev/dashboard-states` shows the new states and has no horizontal overflow at desktop and one mobile width.
