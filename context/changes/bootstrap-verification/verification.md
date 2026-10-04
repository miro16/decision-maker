---
bootstrapped_at: 2026-10-01T19:10:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: decision-maker
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
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
```

### Why this stack

Decision Maker is a small web app with a one-week, after-hours first slice: email/password accounts and a weighted ranking, no payments, realtime, or AI. You accepted the recommended JavaScript/TypeScript starter for this product type. 10x Astro Starter (Astro + Supabase + Cloudflare) ships auth and a database out of the box, which matches FR-001/FR-002, and targets Cloudflare Pages — the deploy target you confirmed. GitHub Actions with auto-deploy on merge is the CI shape. Scaffolding is first-class: the starter is registered with a valid CLI but not fully battle-tested, so expect mostly-smooth setup with occasional manual steps.

## Pre-scaffold verification

| Signal      | Value                                                       | Severity | Notes                                                                                 |
| ----------- | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| npm package | not run                                                     | —        | `cmd_template` starts with `git clone`; no npm CLI package to check                   |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-09-12   | fresh    | from card.docs_url; `gh` CLI not installed, fetched via public GitHub REST API instead |

Local toolchain at run time: git 2.45.1, node v24.15.0, npm 12.1.0 (card targets node 22; `.nvmrc` shipped by the starter).

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 51 files (excluding `node_modules/`), 22 top-level entries
**Conflicts (.scaffold siblings)**: CLAUDE.md → CLAUDE.md.scaffold
**.gitignore handling**: moved silently (absent in cwd)
**.bootstrap-scaffold cleanup**: deleted (cloned `.git/` removed before move-up; 0 leftover paths)

Top-level entries moved: `.github`, `.husky`, `.vscode`, `node_modules`, `public`, `scripts`, `src`, `supabase`, `.env.example`, `.gitignore`, `.nvmrc`, `.prettierrc.json`, `AGENTS.md`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `package-lock.json`, `package.json`, `README.md`, `tsconfig.json`, `wrangler.jsonc`. Sidelined: `CLAUDE.md` (existing kept).

Install warnings worth noting:

- `EBADENGINE`: `astro-eslint-parser@3.1.0` and `eslint-plugin-astro@3.1.0` require node `^22.22.3 || ^24.16.0 || >=26.3.0`; current is v24.15.0.
- npm blocked install scripts not covered by `allowScripts`: `esbuild@0.28.2`, `esbuild@0.28.1`, `workerd@1.20260911.1` (postinstall `node install.js`). Review with `npm install-scripts ls`; approve with `npm install-scripts approve <pkg>` if dev/build fails.
- `Unknown env config "devdir"` — local npm config warning, unrelated to the starter.

## Post-scaffold audit

**Tool**: npm audit --json (exit code 1 — informational)
**Summary**: 0 CRITICAL, 3 HIGH, 4 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/1/0 direct of total 0/3/4/0 (only `wrangler` is a direct dependency)

#### CRITICAL findings

none

#### HIGH findings

- **brace-expansion** (`<=1.1.20 || 4.0.0 - 5.0.11`, transitive) — DoS advisories: GHSA-q2hr-2g5m-vwhr (quadratic `{a},b}` expansion), GHSA-qhr7-859c-m2p7 (nested brace recursion), GHSA-6j4f-fj2g-mc7p (parseCommaParts recursion). Fix available.
- **devalue** (`<=5.9.2`, transitive) — GHSA-j22f-vq7h-c4qm, GHSA-hx4r-w6wj-j8fg, GHSA-mcm9-63f2-9j32, GHSA-wf3x-273g-mvxv, GHSA-x5rw-q4pp-hg5g, GHSA-4q55-j62x-fr9h (serialization / CPU amplification / `__proto__` bypass). Fix available.
- **undici** (`7.0.0 - 7.29.0`, transitive) — GHSA-3wwx-pv8p-q78v, GHSA-pmjh-fq2x-6v4x, GHSA-r53p-7pc4-xj5r, GHSA-rfgv-xxqx-mfg5, GHSA-3xpg-4rpp-hhhm, GHSA-2jfj-6hjv-fm6j, GHSA-2gqq-gqf2-x968, GHSA-w293-vg96-wgc3, GHSA-8436-99hf-9mmv, GHSA-rx4f-c7p8-82vq (DoS, response splitting, cookie disclosure, TLS validation bypass in BalancedPool). Fix available.

#### MODERATE findings

- **wrangler** (`4.102.0 - 4.143.0`, **direct**) — via miniflare. Fix available.
- **miniflare** (`4.20260617.0 - 5.20260926.0-alpha`, transitive) — via undici. Fix available.
- **@cloudflare/vite-plugin** (`1.42.0 - 1.62.0`, transitive) — via miniflare, wrangler. Fix available.
- **fast-uri** (`3.0.0 - 3.1.7`, transitive) — GHSA-hrr3-gc8f-f4qj (host case normalization via percent-encoded octets). Fix available.

#### LOW / INFO findings

none

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
