<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: First private decision

- **Plan**: context/changes/s01/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-15
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

Reviewed the committed slice at `08be60d` (commits `6c8b31c`, `a7ad27f`, `08be60d`). Later uncommitted edits to `src/pages/dashboard.astro` and `scripts/smoke.mjs` are outside this review.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Verification

Commands were run in a detached worktree at `08be60d`.

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (after `astro check` generated types; a fresh worktree fails typed ESLint before that) |
| `npx astro check` | PASS — 0 errors |
| `npm run build` | PASS |
| `npx supabase db reset` | Not re-run. Docker Desktop is not running. |
| `npm run smoke` | Not re-run. It needs local Supabase, which needs Docker. |

Manual rows 1.2, 1.3, 2.5, and 2.6 are marked done. The smoke script at `08be60d` encodes the same title, privacy, second-title, and blank-title checks. This review did not repeat the browser session.

`user_id` is declared `on delete cascade`. The plan only required a reference to `auth.users`. That clause does not add an update or delete policy.

The null-client redirect in `src/pages/api/decisions.ts` matches the plan. Middleware already sets `locals.user` to null when `createClient()` returns null, so that branch does not run today.

## Findings

### F1 — Failed decision load renders a blank dashboard

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/dashboard.astro:19
- **Detail**: The select result is handled only for success. When `loadError` is set, both `decisionTitle` and `showForm` stay false, so the page shows the welcome line and sign-out with no title, no form, and no error. The insert path redirects to `/dashboard?error=` on any Supabase error. A failed read fails closed (no other user's title is shown) and gives the owner no explanation.
- **Fix**: On `loadError`, render a short error and leave the create form hidden.
- **Decision**: FIXED + ACCEPTED-AS-RULE: Show a load failure instead of an empty dashboard

### F2 — Unplanned ESLint ignore for .claude

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: eslint.config.js:81
- **Detail**: Phase 1 added `{ ignores: [".claude/**"] }`, which is not in the plan. At `08be60d` that directory had no lintable files, so lint results did not change. The commit message says it keeps course skill scripts out of the app typecheck.
- **Fix**: Add a one-line addendum to the plan noting the `.claude/**` ESLint ignore.
- **Decision**: SKIPPED
