---
starter_id: 10x-astro-starter
package_manager: npm
project_name: decision-maker
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
---

## Why this stack

Decision Maker is a small web app with a one-week, after-hours first slice: email/password accounts and a weighted ranking, no payments or realtime. One narrow AI feature was added on 2026-11-16 (see "AI addition" below). You accepted the recommended JavaScript/TypeScript starter for this product type. 10x Astro Starter (Astro + Supabase + Cloudflare) ships auth and a database out of the box, which matches FR-001/FR-002, and targets Cloudflare Pages — the deploy target you confirmed. GitHub Actions with auto-deploy on merge is the CI shape. Scaffolding is first-class: the starter is registered with a valid CLI but not fully battle-tested, so expect mostly-smooth setup with occasional manual steps.

## AI addition (2026-11-16)

FR-011 adds one language-model call: given a decision title and its existing criteria names, the server asks a model for criterion-name suggestions (for example price, mileage for a car purchase). `has_ai` is now `true`; `has_background_jobs` stays `false` because the call happens inside the request.

- **Where it runs:** server-side only, in an API route on the Cloudflare Worker. The browser never sees the provider key and never calls the provider.
- **Provider and model:** not chosen. Open question in `context/foundation/prd.md` (Open Questions 7-10). The two families under consideration are an external HTTP API with a Worker secret, or a Cloudflare-hosted model through a Worker binding. Choose before S-04 implementation starts.
- **Secrets:** for an external API, the key is read only through `astro:env/server` (`access: "secret"`, `optional: true` so build and CI smoke do not need it). Never a `PUBLIC_` variable. A Cloudflare-hosted model would use a binding declared in `wrangler.jsonc` instead of a key.
- **No SDK lock-in assumed:** the call is isolated behind one function in `src/lib/` so the provider can change without touching the route or the UI.
