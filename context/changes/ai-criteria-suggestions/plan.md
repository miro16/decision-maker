# AI Criteria Suggestions Implementation Plan

## Overview

A signed-in user with a decision asks a language model for criteria worth scoring, for example price and mileage when the decision is `Which car to buy?`. The server returns a short list of names. The owner adds a chosen name with their own weight 1–5 through the criteria form that already exists. The model never supplies a weight, a score, or a ranking, and nothing it returns is stored.

## Current State Analysis

S-01 and S-02 are in the product. `/dashboard` loads the owner's single decision, then options and criteria ordered by `position` (`src/pages/dashboard.astro:16-47`) and passes them to `DecisionDashboard.astro`, which renders plain HTML forms posting to `/api/options` and `/api/criteria` (criteria section from `src/components/dashboard/DecisionDashboard.astro:100`). `POST /api/criteria` takes the decision from the session, never from the form, and with `intent=create` validates `name` (zod, trimmed, 1–200), `weight` (integer 1–5), and maps the database duplicate and 20-row errors to messages (`src/pages/api/criteria.ts:5-14`, `src/pages/api/criteria.ts:64-77`). The database enforces the same rules (S-02 plan, Phase 1).

There is no model call and no model secret. `astro.config.mjs` declares only `SUPABASE_URL` and `SUPABASE_KEY`, both `access: "secret"` and `optional: true`. `createClient()` in `src/lib/supabase.ts` returns `null` when env is missing and routes handle that branch. `PROTECTED_ROUTES` is `["/dashboard"]` (`src/middleware.ts:4`), so API routes check `context.locals.user` themselves. There is no React island on the dashboard and no `src/components/hooks/` directory yet. The dashboard state sink marks Loading as N/A because the page has no client interval (`src/pages/dev/dashboard-states.astro`). `scripts/scan-dashboard-literals.mjs` scans a fixed list of three view files. zod is a direct dependency. There is no unit-test runner; `scripts/smoke.mjs` is the automated check, and CI runs it against a local Supabase with no model key.

## Desired End State

The owner of `Which car to buy?` with the criterion `Price (3)` presses "Suggest criteria" under the Criteria list. After a short wait they see names such as `Mileage` and `Running costs` and not `Price`. They type weight 4 next to `Mileage`, press Add, land on `/dashboard`, and see `Mileage (4)`. A signed-out request to the suggestion route is rejected. A deployment with no model configured shows no button and the route answers "not configured". A provider failure shows a short message under the button and the rest of the dashboard still works. A second account's suggestions use only that account's own decision.

### Key Discoveries:

- The only write path for a criterion is `POST /api/criteria`. Reusing it means a suggested name goes through the same trim, 200-character, duplicate, weight 1–5, and 20-row rules as a typed one.
- The list cap is checkable before spending a model call: when the owner already has 20 criteria, the route can answer without calling the provider.
- Existing criteria names must be sent to the model and also removed from its answer. Uniqueness in the database is `lower(btrim(name))`, so the filter must compare the same way.
- The dashboard literal scan only covers the three files it lists. A new view file under `src/components/dashboard/` is invisible to it until the script's list is extended.

## What We're NOT Doing

- Suggesting options, weights, scores, or a winner, or a chat with the model (`context/foundation/prd.md` Non-Goals).
- Storing suggestions or any history, and adding a table, a migration, or an RLS policy. Nothing in this slice touches Supabase schema.
- A per-account rate-limit table. That is PRD Open Question 8. The provider-side spend cap is the interim backstop.
- Streaming the answer, retries with a second model, or a cache.
- Sending option names to the model. PRD Open Question 9 is assumed "no".
- Changing `/api/criteria`, the criteria table, or the ranking.
- Choosing the provider or model. That is PRD Open Question 7 and the user's decision. Phase 1 does not start until it is answered.
- A unit-test framework. `AGENTS.md` names `scripts/smoke.mjs` as the automated check.

## Implementation Approach

Phase 1 is the server side: an optional model secret and name in the env schema, one function in `src/lib/` that asks the provider and validates the answer, and one API route. Phase 2 is the browser side: one React island under the criteria list, a hook in `src/components/hooks/`, the dashboard state sink, and the literal scan. The island renders one plain form per suggestion that posts to `/api/criteria`, so adding a criterion is the existing write path. The provider call lives behind one function so a provider change touches only that file.

## Critical Implementation Details

- **Model output is untrusted text.** The function must parse it as a JSON array of strings with zod, trim each entry, reject entries longer than 200 characters or empty, remove entries equal to an existing criterion or to each other under `lower(btrim(name))`, and keep at most `min(8, 20 - existingCount)`. Anything that does not parse is a failure, not a partial result. The island renders names as text only; never as HTML.
- **Order of checks in the route.** Session first, then Supabase client, then the owner's decision, then the 20-criteria cap, then model configuration, then the provider call. A signed-out caller and a caller with no decision never cost a model call, and a missing key in CI is reachable only after the cheaper checks have run.
- **Secrets.** The key and model name are read through `astro:env/server` only, declared `access: "secret"`, `optional: true`, and never as `PUBLIC_`. Do not log the key, the prompt, or the raw provider response. A provider failure is logged as a status code only.
- **Request budget.** Time-box the provider call (an `AbortSignal` timeout of about ten seconds). The Free-plan CPU limit applies to the parsing and validation, which handle a handful of short strings.
- **Language.** The prompt asks for names in the language of the decision title and for no explanations, no weights, and no numbering. Quality in Polish is verified by hand against the chosen model (Open Question 4).
- **Dashboard state.** The page already knows nothing about the model. `dashboard.astro` computes one boolean from the env values and passes it to the dashboard component. The island is rendered only when that boolean is true and the owner has fewer than 20 criteria.

## Phase 1: Suggestion service and route

### Overview

A signed-in owner can POST to one route and get back validated criterion names, or a clear error. No UI yet. Do not start this phase until Open Question 1 (provider and model) has a user answer.

### Changes Required:

#### 1. Env schema

**File**: `astro.config.mjs`

**Intent**: Make the model key and name readable on the server and absent-safe, like the Supabase values.

**Contract**: Add two entries under `env.schema`: the model key as `envField.string({ context: "server", access: "secret", optional: true })` and the model name as `envField.string({ context: "server", access: "secret", optional: true })`. Working names are `LLM_API_KEY` and `LLM_MODEL`; they are final only after the provider is chosen. If the chosen provider is a Cloudflare-hosted model reached through a binding, the key entry is dropped and `wrangler.jsonc` gets the binding instead; record that in this plan before implementing. Do not add a `PUBLIC_` variant. Add placeholder names to `.env.example`, with no values.

#### 2. Suggestion function

**File**: `src/lib/criteria-suggestions.ts`

**Intent**: One place that turns a decision title and existing criteria names into at most eight valid, new criterion names.

**Contract**: `suggestCriteria({ title, existing })` returns either `{ ok: true, names: string[] }` or `{ ok: false, reason: "not_configured" | "provider_error" | "bad_output" }`. It returns `not_configured` without any network call when the key or model name is missing. It sends the title and the existing names only, with the language and format instructions from Critical Implementation Details, under a timeout. It validates and filters the answer exactly as described there. It never throws for a provider failure; it returns `provider_error`. The provider-specific request and response shape is the only part that waits on Open Question 1.

#### 3. Suggestion route

**File**: `src/pages/api/criteria-suggestions.ts`

**Intent**: Give the dashboard island a JSON endpoint that suggests criteria for the signed-in owner's decision.

**Contract**: `POST` with no body fields. It never reads a decision id or user id from the request. Responses are JSON. Missing `context.locals.user` returns 401. `createClient()` returning null returns 503 with `{ error: "not_configured" }`. No decision for that user returns 409 `{ error: "no_decision" }`. Twenty criteria already stored returns 409 `{ error: "criteria_full" }`. Then call `suggestCriteria` with the decision title and the owner's criteria names: `not_configured` returns 503 `{ error: "not_configured" }`, `provider_error` and `bad_output` return 502 `{ error: "unavailable" }`, and success returns 200 `{ suggestions: string[] }`. An empty list after filtering is a 200 with an empty array, not an error. Do not add the route to `PROTECTED_ROUTES`; it checks the session itself, like `/api/criteria`.

#### 4. Smoke coverage

**File**: `scripts/smoke.mjs`

**Intent**: Prove the cheap guards through the preview server CI already boots, without calling a real model.

**Contract**: Keep every existing step. Add: an anonymous `POST /api/criteria-suggestions` returns 401. A second account that has no decision returns 409 `no_decision`. The owner with `Which laptop?` returns either 503 `not_configured` (the CI case, no key) or 200 with a `suggestions` array of at most eight strings that contains none of the owner's existing criterion names compared case-insensitively. Run the CI path without a model key; a developer who runs smoke with a key set pays for one call. Smoke never asserts specific suggested names.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes without the model key set
- `npm run smoke` passes, including 401 for an anonymous caller, 409 `no_decision` for the second account, and 503 `not_configured` (or a valid 200) for the owner

#### Manual Verification:

- With a real key in `.dev.vars`, posting as the owner of `Which car to buy?` with criterion `Price` returns up to eight names, none equal to `Price` in any letter case
- With the key removed, the same request returns 503 `not_configured` and the dashboard still loads
- With an invalid key or the network blocked, the route returns 502 `unavailable` within the timeout and nothing sensitive appears in `wrangler tail`
- With 20 criteria stored, the route returns 409 `criteria_full` and makes no provider call

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Dashboard island

### Overview

The owner presses "Suggest criteria", sees names, adds one with a weight, and sees it in the list. Every state has a visible screen, and the new view code obeys the token and literal rules.

### Changes Required:

#### 1. Suggestions hook

**File**: `src/components/hooks/useCriteriaSuggestions.ts`

**Intent**: Keep the request state out of the component, as `AGENTS.md` asks for hooks.

**Contract**: Exposes the states `idle`, `loading`, `ready`, `empty`, and `error`, the suggestion list, and a `request()` action that `POST`s to `/api/criteria-suggestions`. A 200 with names is `ready`, a 200 with none is `empty`, any other status is `error` with a short message chosen by the response `error` value (`criteria_full`, `no_decision`, `not_configured`, `unavailable`, or a generic one). A second `request()` while `loading` is ignored. No `"use client"` directive.

#### 2. Island component

**File**: `src/components/dashboard/CriteriaSuggestions.tsx`

**Intent**: Show the button, the states, and one add form per suggestion.

**Contract**: A "Suggest criteria" `Button` (from `src/components/ui/button.tsx`) with a one-line disclosure under it, saying that the decision title and the current criteria names are sent to an AI model provider. While `loading` the button is disabled and a short status line is visible. In `ready`, each suggestion is a `<form method="POST" action="/api/criteria">` with hidden `intent=create`, a hidden `name` carrying the suggestion text, a weight `Input` of type number (min 1, max 5, required) with its `Label`, and an "Add" `Button`. The weight has no default value: the owner chooses it. `empty` shows "No new suggestions". `error` shows the message in the `text-destructive` role style the dashboard already uses. Merge classes with `cn()`. Use role tokens only: no literal colours and no arbitrary px/rem values. Accepts optional `initialState` and `initialSuggestions` props used only by the dashboard state sink to render a state without a request.

#### 3. Dashboard wiring

**File**: `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`

**Intent**: Show the island only where it can work.

**Contract**: `dashboard.astro` reads the key and model name from `astro:env/server`, computes `suggestionsAvailable` as true only when both are set, and passes it as a prop. The prop is optional and defaults to false, so the existing `/dev/dashboard-states` examples render unchanged. `DecisionDashboard.astro` renders the island, hydrated on load, inside the Criteria section only when `suggestionsAvailable` is true and `criteria.length < 20`. Nothing else in that component changes. The existing criteria add form stays.

#### 4. State sink and literal scan

**File**: `src/pages/dev/dashboard-states.astro`, `scripts/scan-dashboard-literals.mjs`

**Intent**: Keep the "every state is visible, no literal colours" contract true for the new view code.

**Contract**: In `dashboard-states.astro`, replace the Loading "N/A" text with a rendered suggestions Loading state, and add rendered Ready, Empty, and Error states for the island using its `initialState` props. Add `src/components/dashboard/CriteriaSuggestions.tsx` to the `files` list in the scan script. `npm` pre-commit scan reports zero literals for all listed files.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes
- `node scripts/scan-dashboard-literals.mjs` reports `total: 0` with the new file in its list
- `npm run smoke` still passes (the dashboard renders for an unconfigured deployment without the island)

#### Manual Verification:

- With a key configured, the owner of `Which car to buy?` presses "Suggest criteria", sees a loading state, then names that exclude existing criteria; adding `Mileage` with weight 4 shows `Mileage (4)` in the list and the suggestion list can be requested again
- Adding a suggestion with weight 0, 6, or empty is rejected and shows the existing criteria error
- With no key configured, no button appears and `/dashboard` is otherwise unchanged
- With 20 criteria, no button appears
- With the provider failing, the error message appears under the button and the rest of the page works
- `/dev/dashboard-states` shows Loading, Ready, Empty, and Error for the suggestions, with focus rings visible on the button and the weight field, in light and dark themes, at desktop and mobile width
- A second account asking for suggestions sees only suggestions for its own decision title

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Open Questions

Carried from `context/foundation/prd.md` (Open Questions 7–10). This plan does not answer them.

1. **Provider and model.** External HTTP API with a Worker secret, or a Cloudflare-hosted model through a binding? Cost, data retention, and answer quality in Polish decide. Owner: user. Blocks Phase 1 implementation.
2. **Rate limit and spend cap.** How many suggestion requests per account and per hour, and what hard monthly limit at the provider? Owner: user. Does not block local work; should be answered before production.
3. **Data sent.** This plan sends the title and existing criteria names. Should option names be added for better suggestions? Owner: user. Does not block.
4. **Language.** This plan asks for the language of the title. Confirm against the chosen model. Owner: user. Does not block.

## Testing Strategy

### Unit Tests:

No unit-test framework exists, and this slice does not add one. The validation rules are small and are exercised through smoke and the manual steps below.

### Integration Tests:

`npm run smoke` against the preview server with local Supabase and no model key. It covers the 401, 409, and 503 guards and, when a key is present, the shape of a 200. It does not call a model in CI.

### Manual Testing Steps:

1. With the key in `.dev.vars`, create `Which car to buy?`, add `Price` weight 3, press "Suggest criteria". The list does not contain `Price`.
2. Add `Mileage` with weight 4. The dashboard shows `Mileage (4)`. Request suggestions again; `Mileage` is no longer offered.
3. Remove the key, reload. No button. Restore the key.
4. Block the network or use an invalid key. A short error appears; adding criteria by hand still works.
5. Fill the list to 20 criteria. The button is gone and a direct POST returns 409.
6. Sign in as a second account without a decision and POST to the route. It returns 409.
7. Review `/dev/dashboard-states` in light and dark at desktop and mobile width.

## Performance Considerations

One provider call per button press, time-boxed to about ten seconds, with at most eight short names in the answer. Parsing and filtering are trivial CPU. There is no cache and no background job. The page itself is not delayed: the call happens only after the owner presses the button.

## Migration Notes

None. No table, column, or policy changes, so there is nothing to apply to hosted Supabase. Production needs the model secret set by a human with `npx wrangler secret put` before the button appears there (`context/deployment/deploy-plan.md`, addendum). Rolling back the Worker removes the feature and leaves the data untouched.

## References

- Roadmap slice S-04: `context/foundation/roadmap.md`
- PRD FR-011, US-02, and Open Questions 7–10: `context/foundation/prd.md`
- Criteria write path and rules: `src/pages/api/criteria.ts`, `context/changes/options-and-weighted-criteria/plan.md`
- Dashboard shell and view: `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`
- UI contract and state sink: `AGENTS.md` (UI section), `src/pages/dev/dashboard-states.astro`, `scripts/scan-dashboard-literals.mjs`
- Infrastructure addendum and risk rows: `context/foundation/infrastructure.md`
- Deploy addendum (secret): `context/deployment/deploy-plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Suggestion service and route

#### Automated

- [ ] 1.1 `npm run lint` passes
- [ ] 1.2 `npx astro check` passes
- [ ] 1.3 `npm run build` passes without the model key set
- [ ] 1.4 `npm run smoke` passes, including 401 for an anonymous caller, 409 `no_decision` for the second account, and 503 `not_configured` (or a valid 200) for the owner

#### Manual

- [ ] 1.5 With a real key in `.dev.vars`, posting as the owner of `Which car to buy?` with criterion `Price` returns up to eight names, none equal to `Price` in any letter case
- [ ] 1.6 With the key removed, the same request returns 503 `not_configured` and the dashboard still loads
- [ ] 1.7 With an invalid key or the network blocked, the route returns 502 `unavailable` within the timeout and nothing sensitive appears in `wrangler tail`
- [ ] 1.8 With 20 criteria stored, the route returns 409 `criteria_full` and makes no provider call

### Phase 2: Dashboard island

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npx astro check` passes
- [ ] 2.3 `npm run build` passes
- [ ] 2.4 `node scripts/scan-dashboard-literals.mjs` reports `total: 0` with the new file in its list
- [ ] 2.5 `npm run smoke` still passes (the dashboard renders for an unconfigured deployment without the island)

#### Manual

- [ ] 2.6 With a key configured, the owner presses "Suggest criteria", sees a loading state, then names that exclude existing criteria; adding `Mileage` with weight 4 shows `Mileage (4)` and the suggestions can be requested again
- [ ] 2.7 Adding a suggestion with weight 0, 6, or empty is rejected and shows the existing criteria error
- [ ] 2.8 With no key configured, no button appears and `/dashboard` is otherwise unchanged
- [ ] 2.9 With 20 criteria, no button appears
- [ ] 2.10 With the provider failing, the error message appears under the button and the rest of the page works
- [ ] 2.11 `/dev/dashboard-states` shows Loading, Ready, Empty, and Error for the suggestions, with visible focus rings, in light and dark themes, at desktop and mobile width
- [ ] 2.12 A second account asking for suggestions sees only suggestions for its own decision title
