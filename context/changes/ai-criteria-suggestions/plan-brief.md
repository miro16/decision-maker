# AI Criteria Suggestions — Plan Brief

> Full plan: `context/changes/ai-criteria-suggestions/plan.md`

## What & Why

A signed-in user deciding something like "Which car to buy?" asks a language model for criteria worth scoring (price, mileage, running costs) and adds the ones they want. Today the user starts from a blank criteria list and has to think of every criterion alone. The model only proposes names. The user still sets every weight, and the ranking stays scores × weights.

## Starting Point

One decision per account, with options and criteria added through plain HTML forms to `/api/options` and `/api/criteria` (S-01, S-02). The criteria endpoint already validates the name, the 1–5 weight, duplicates, and the 20-row cap. There is no model call, no model secret, no React island on the dashboard, and the dashboard state sink says "Loading: N/A" because the page has no client interval.

## Desired End State

Under `Criteria`, the owner of `Which car to buy?` with `Price (3)` presses "Suggest criteria" and sees a short list that does not repeat `Price`, for example `Mileage` and `Running costs`. They enter weight 4 next to `Mileage`, press Add, and the dashboard shows `Mileage (4)`. If the model is not configured or fails, the button is absent or shows a short error, and everything else on the dashboard works as before.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| What the model does | Suggests criterion names only | PRD limits it to names; weights and scores stay with the user so the ranking is unchanged | PRD FR-011, Non-Goals |
| How a suggestion becomes a criterion | The owner submits the existing `POST /api/criteria` form with `intent=create` and their own weight | Reuses every name, weight, duplicate, and cap rule instead of a second write path | `src/pages/api/criteria.ts` |
| Storage | Suggestions are not stored | No table means no new RLS surface and no history to leak | PRD Non-Goals |
| Input to the model | Decision title and existing criteria names; options are not sent | Smallest data that still gives relevant, non-duplicate suggestions | PRD Open Question 9 (assumed) |
| Where the model is called | Server-side API route only, behind sign-in | The key stays a Worker secret and the browser never talks to the provider | `AGENTS.md`, `infrastructure.md` addendum |
| UI | One small React island with plain form posts for adding | The request has loading, error, and result states that need client state; adding stays a plain form | `AGENTS.md` (`.tsx` only for state) |
| Output handling | Treat model text as untrusted: parse, validate with zod, trim, dedupe, cap | A model can return prose, duplicates, or 500 characters | Plan |
| Failure | Absent key hides the button; provider error shows a short message | Suggestions are an add-on and must not block the decision | PRD guardrail |
| Provider | Not chosen | Cost, data retention, and Polish quality are the user's call | PRD Open Question 7 |

## Scope

**In scope:**

- `src/lib/` function that asks the model and returns validated names
- `POST /api/criteria-suggestions` route (session required, decision from the session)
- Dashboard island with idle, loading, result, empty, and error states, plus the dashboard state sink updated
- Smoke for "no session", "not configured", and a second account's isolation; manual check against the real model

**Out of scope:**

- Suggesting options, weights, scores, or a winner; chat
- Storing suggestions, a per-account rate-limit table, streaming
- Choosing the provider, a new database migration
- Changing the criteria endpoint or the ranking

## Architecture / Approach

Phase 1 adds the server side: an optional secret and model name in the env schema, one `suggestCriteria()` function that builds a short prompt, calls the provider with a timeout, and validates the answer, and one API route that loads the owner's decision, refuses early when the criteria list is already full, and returns names. Phase 2 adds the island under the criteria list. Each suggestion is a small form posting to `/api/criteria`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Suggestion service and route | Validated names from the model, 401/503/409 handling, secret wiring | Starting before the provider is chosen, or trusting raw model text |
| 2. Dashboard island | Button, states, add-with-weight forms, state sink, literal scan covers the new file | New client code breaking the "no literal colours" rule or the 20-row cap UI |

**Prerequisites:** S-02 criteria endpoint (in place; its manual rows 2.5–2.7 are still unchecked). A chosen provider, a key with a spend limit, and a human to run `wrangler secret put` for production.
**Estimated effort:** Not estimated. The roadmap gives no durations.

## Open Questions

1. Provider and model, and whether it answers well in Polish (PRD Open Question 7). Blocks Phase 1 implementation.
2. Per-account rate limit and provider spend cap (PRD Open Question 8). Blocks production use.
3. Send option names too? (PRD Open Question 9). Plan assumes no.
4. Suggestion language (PRD Open Question 10). Plan assumes the language of the title.

## Open Risks & Assumptions

- Any signed-in account can trigger paid calls. The provider-side spend cap is the real backstop until Open Question 2 is answered.
- Decision titles leave the app. The UI must say so next to the button, and the provider should not train on the data.
- A plain `/dashboard` render still happens without the model, so a provider outage cannot take the page down.
- Assumed: the Worker can reach the provider over HTTPS and the call fits the Free-plan CPU budget because waiting on I/O is not CPU. Check in `wrangler tail` after the first deploy.

## Success Criteria (Summary)

- The owner sees model-suggested names that exclude criteria they already have, and can add one with their own weight 1–5.
- A signed-out request, an unconfigured deployment, and a provider failure each end in a clear response without breaking the dashboard.
- The ranking and the criteria rules are unchanged, and another account is never affected.
