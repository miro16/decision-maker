---
project: decision-maker
researched_at: 2026-10-04
recommended_platform: Cloudflare Workers
runner_up: Render
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7.3 (SSR, output "server") + React 19 islands + Supabase (external)
  runtime: workerd via @astrojs/cloudflare 14.3
---

## Recommendation

**Deploy on Cloudflare Workers (Worker + Static Assets, not Pages).**

Cloudflare Workers is the only platform that passed all five agent-friendly criteria (16/16 weighted), and it is the platform the scaffold already targets: `@astrojs/cloudflare` 14.3.1, `wrangler.jsonc`, and the CI smoke job running the production preview on workerd. Every other option requires swapping the adapter and rewriting deploy/CI config. Interview answers did not override this: users are single-region (EU), so the edge is not decisive, but Workers runs near Polish users with no region configuration. External providers are fine (Supabase stays), and cost and DX were weighted equally, so the $0 Free / $5 Paid pricing is a plus rather than the deciding factor. No persistent connections are needed: the hand-off sets `has_realtime: false` and `has_background_jobs: false`.

Correction to `tech-stack.md`: the hand-off says `deployment_target: cloudflare-pages`, but adapter v13+ dropped Pages support. The target is **Cloudflare Workers**.

## Platform Comparison

Scoring: Pass = 2, Partial = 1, Fail = 0. CLI, managed, and deploy/rollback count ×2, while docs and MCP count ×1, for a max of 16. Soft weights come from the interview (Q2 roughly equal, Q3 no familiarity, Q4 single region in the EU, Q5 external providers fine).

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Weighted | Soft adj. | Total |
|---|---|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 16 | 0 | **16** |
| Render | Pass | Pass | Partial | Pass | Pass | 15 | 0 | **15** |
| Netlify | Pass | Pass | Pass | Pass | Pass | 16 | −2 (functions pinned to Ohio below Pro) | **14** |
| Vercel | Partial | Pass | Pass | Pass | Partial | 13 | 0 | **13** |
| Railway | Partial | Pass | Pass | Partial | Partial | 11 | 0 | **11** |
| Fly.io | Pass | Partial | Pass | Partial | Partial | 11 | 0 | **11** |

- **Cloudflare Workers.** Wrangler covers deploy (`wrangler deploy`), rollback (`wrangler rollback`, last 100 versions), and logs (`wrangler tail`). Docs are available as `index.md` per page, with `/workers/llms.txt` and source on GitHub. The MCP servers (API, Builds, Observability, Docs) are GA. Pricing is $0 on Free (100k req/day at 10 ms CPU each) or $5 on Paid. The bundle limit is 64 MiB uncompressed on both plans.
- **Render.** Native Node in Frankfurt, deployed with `render deploys create --wait` and logged with `render logs --tail`. Rollback is not in the CLI but works through the REST API (non-interactive, so it passes). Docs: `.md` per page works, but `/docs/llms.txt` returned 404 on 2026-10-04, hence Partial. The hosted MCP is not labelled beta. Free services sleep after 15 minutes and take about a minute to wake. Always-on costs about $7–8 per month.
- **Netlify.** The CLI is strong (`deploy --prod --json`, `logs --follow`), with rollback via `netlify api restoreSiteDeploy`. It has `llms.txt` and an official MCP. Penalised because functions run in `cmh` (Ohio) unless you are on Pro, and the credit-based Free plan pauses the site when its 300 credits run out (15 credits per production deploy).
- **Vercel.** Fluid compute runs Node, `@astrojs/vercel` 11 supports Astro 7, and `llms.txt` exists. Partial on CLI and MCP because Instant Rollback in the CLI and the Vercel MCP are both public beta. The default region is `iad1`, so `fra1` must be set. Hobby is non-commercial only.
- **Railway.** `railway up` and `railway logs` work, and there is an EU West (Amsterdam) region. Rollback to an older deployment is dashboard-only. The hosted MCP has been "public testing" since 2026-04-17. Expect roughly $5 per month on Hobby.
- **Fly.io.** flyctl is complete, but you have to manage a container and a Dockerfile. Rollback means re-deploying an old image tag, which does not revert secrets or `fly.toml`. `fly mcp` is experimental. The Warsaw (`waw`) region is deprecated, so use `fra`. There is no free tier, at about $3–5 per month.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

It is the only platform with a clean sweep, and the CLI, rollback and MCP surface are all GA. It costs nothing to adopt because the scaffold, CI smoke job and local dev (`astro dev` on workerd) already target it. Running costs at MVP traffic are $0–5 per month.

#### 2. Render

It is the best fallback if workerd constraints bite: a full Node runtime, an always-on EU region, WebSockets if ever needed, and an MCP that can deploy and read logs. The gap compared with Cloudflare is an adapter swap to `@astrojs/node`, proxy config (`security.allowedDomains`), a free tier with roughly one-minute cold starts, and rollback outside the CLI.

#### 3. Netlify

It has an excellent agent surface (CLI, `llms.txt`, official MCP). The gap is that Free and Personal plans pin functions to Ohio, which adds a transatlantic round trip to every SSR request and every Supabase call from the EU. Credit exhaustion also pauses the site, and an adapter swap to `@astrojs/netlify` is needed.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. The Free plan allows 10 ms of CPU per request. `src/middleware.ts` calls `supabase.auth.getUser()` on every request, and each response is SSR-rendered on top of that. Cloudflare's own guidance puts SSR with auth at 10–20 ms, so intermittent Error 1102 in production is likely on Free.
2. The hand-off target `cloudflare-pages` no longer exists for this adapter. Any CI/CD design or tutorial built around Pages (Pages projects, Pages preview branches, `wrangler pages deploy`) is wrong for this project.
3. Version URLs use production resources, and Worker Preview URLs are public unless Cloudflare Access is put in front of them. Preview testing can write test users and decisions into the production Supabase project.
4. On deploy the adapter auto-provisions a `SESSION` KV namespace and an `IMAGES` binding that nobody asked for. Deleting a bound KV namespace later blocks `wrangler rollback` to versions that referenced it.
5. Under `nodejs_compat`, some Node modules (`child_process`, `worker_threads`) are stubs that import fine and fail at runtime. A dependency can pass `astro build` and break only when a request hits it.

### Pre-Mortem — How This Could Fail

The team deployed on the Free plan because "at our traffic it's $0". Locally everything worked. In production, some requests returned Error 1102: SSR plus the per-request `getUser()` call crossed 10 ms of CPU, and sampled `wrangler tail` output didn't show the pattern clearly. Someone followed an older tutorial and added `Astro.locals.runtime.env`, which adapter v14 removed, so secrets stopped resolving. Preview deploys were configured as Pages branches and never fired. CI listened on `master` while work happened on `main`, so deploys went out manually from a laptop without lint or the smoke test. In month four, a tester on a public preview URL created accounts in the production Supabase project. Separately, a migration without RLS exposed decisions across accounts. Rolling back the Worker did not roll back the database. The bad assumptions were that Free is enough, that old tutorials apply to the current adapter, and that previews are isolated.

### Unknown Unknowns

- `Astro.locals.runtime` is gone in adapter v14. Read env via `astro:env/server` (already used in `src/lib/supabase.ts`) or `import { env } from "cloudflare:workers"`. The execution context is `Astro.locals.cfContext`.
- The target environment is fixed at build time (`CLOUDFLARE_ENV=<env> astro build`). The same build artifact cannot be promoted from staging to production with different config.
- `name` in `wrangler.jsonc` is still `10x-astro-starter`. It becomes the `*.workers.dev` subdomain and must match the Worker name for Workers Builds. Rename it before the first deploy, because renaming afterwards creates a second Worker.
- Installed Wrangler is 4.131.1. Worker Previews (`wrangler preview`, launched 2026-09-22) needs ≥4.135, and `npm audit` flags wrangler 4.102–4.143 (via miniflare/undici). Upgrade to ≥4.144.
- `astro dev` and `astro preview` already run on workerd (adapter v13+), so a separate `wrangler dev` loop is redundant. `wrangler tail` does not capture logs from version URLs.

## Operational Story

- **Preview deploys**: Run `npx wrangler preview` per branch after upgrading to Wrangler ≥4.135. Each branch gets an isolated preview with its own settings, but URLs are public by default. Put Cloudflare Access in front, or point preview builds at a separate Supabase project, before sharing them. Avoid version URLs for testing because they hit production resources.
- **Secrets**: `SUPABASE_URL` and `SUPABASE_KEY` live as Worker secrets (`npx wrangler secret put SUPABASE_URL`) and are read at runtime via `astro:env/server`. Local values go in `.dev.vars`/`.env`, both gitignored. CI build values go in GitHub repository secrets. Anyone with Workers edit rights on the Cloudflare account can overwrite them, and nobody can read them back. To rotate the anon key, regenerate it in Supabase, then run `wrangler secret put` (takes effect on the next request) and update the GitHub secret.
- **Rollback**: Run `npx wrangler deployments list` to find the version, then `npx wrangler rollback <version-id>`. It takes seconds and works for the last 100 versions. Supabase migrations and data do not roll back with it, so write forward-only fixes for schema changes. Rollback is blocked if a bound KV/R2/Queue was deleted.
- **Approval**: A human must approve production deploys (`wrangler deploy` to production), `wrangler rollback`, `wrangler secret put` on production, any Supabase migration applied to the hosted project, and deleting any Worker, KV or Supabase resource. An agent may run `astro dev`, `astro build`, `astro preview`, `npm run smoke`, `wrangler deploy --dry-run`, `wrangler preview` against a non-production Supabase, `wrangler tail`, and `wrangler deployments list` without approval.
- **Logs**: Stream runtime logs with `npx wrangler tail --format json` (read-only, sampled under load). Observability is already enabled in `wrangler.jsonc`, so historical logs are available through the Cloudflare Observability MCP server. Pipeline logs come from GitHub Actions via `gh run view --log` (requires installing `gh`).

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Error 1102 from the 10 ms CPU limit on Free | Devil's advocate | M | H | Start on Workers Paid ($5/month), or check CPU time per request in Observability during the first week and upgrade before launch if p95 is above 7 ms |
| Hand-off says Pages, but the adapter targets Workers only | Devil's advocate | H | M | Treat `infrastructure.md` as the source of truth, and design CI/CD around `wrangler deploy` or Workers Builds, not Pages |
| Previews and version URLs write to production Supabase | Devil's advocate / Pre-mortem | M | H | Create a second Supabase project for previews, and put Cloudflare Access on preview URLs |
| Agent or tutorial uses removed `Astro.locals.runtime` | Pre-mortem / Unknown unknowns | M | M | Keep env access through `astro:env/server`, and reject PRs that reference `locals.runtime` |
| CI triggers on `master` while work happens on `main`, so deploys skip lint and smoke | Pre-mortem / Research finding | H | M | Change `.github/workflows/ci.yml` triggers to `main` before wiring auto-deploy |
| Rollback does not revert Supabase migrations | Pre-mortem | M | H | Write forward-only migrations, test them locally with `npx supabase start`, and require RLS on every new table (see `AGENTS.md`) |
| Wrangler 4.131.1 lacks previews and is in a flagged range | Unknown unknowns / Research finding | H | L | `npm install -D wrangler@latest` (≥4.144), then re-run `npm audit` |
| Worker name `10x-astro-starter` leaks into the URL, and renaming later creates a second Worker | Unknown unknowns | H | L | Set `"name": "decision-maker"` in `wrangler.jsonc` before the first deploy |
| Auto-provisioned `SESSION` KV is unused, and deleting it blocks rollback | Devil's advocate | L | M | Set `session: false` in the adapter config if Astro sessions stay unused, or never delete bound KV |
| An npm dependency fails at runtime because of a `nodejs_compat` stub | Devil's advocate | L | M | Run `npm run smoke` against `astro preview` (workerd) after every dependency change, as the CI smoke job already does |

## Getting Started

1. **Fix the deploy identity and toolchain.** Set `"name": "decision-maker"` in `wrangler.jsonc`, then run `npm install -D wrangler@latest` to get ≥4.144, which supports Worker Previews and clears the audit finding. Commands below use the project-local `npx wrangler`, since no global install is needed.
2. **Authenticate and set production secrets.** Run `npx wrangler login`, then `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`, using an EU-region Supabase project (e.g. Frankfurt).
3. **Verify locally on workerd.** Run `npm run build`, then `npm run preview` (adapter v14 runs `astro preview` on workerd, so `wrangler dev` isn't needed). Check `/`, `/auth/signin` and the `/dashboard` redirect by hand without signing up: local `.env` points at the production Supabase project. The full `npm run smoke` creates accounts and needs email confirmation off, so it runs only in CI against a local Supabase (or locally after `npx supabase start`).
4. **Deploy.** Run `npx wrangler deploy`. The adapter's entrypoint and `./dist` assets come from `wrangler.jsonc`. Confirm the `*.workers.dev` URL, then do a read-only HTTP check (`/` returns 200, `/dashboard` returns 302) and one manual sign-up. Do not run `npm run smoke` against production.
5. **Watch the first traffic.** Run `npx wrangler tail --format json`, and check CPU time per request in Observability to decide between the Free and Paid plans.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
