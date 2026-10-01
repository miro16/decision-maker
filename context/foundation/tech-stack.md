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
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Decision Maker is a small web app with a one-week, after-hours first slice: email/password accounts and a weighted ranking, no payments, realtime, or AI. You accepted the recommended JavaScript/TypeScript starter for this product type. 10x Astro Starter (Astro + Supabase + Cloudflare) ships auth and a database out of the box, which matches FR-001/FR-002, and targets Cloudflare Pages — the deploy target you confirmed. GitHub Actions with auto-deploy on merge is the CI shape. Scaffolding is first-class: the starter is registered with a valid CLI but not fully battle-tested, so expect mostly-smooth setup with occasional manual steps.
