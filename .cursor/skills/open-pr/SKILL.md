---
name: open-pr
description: >-
  Create a new branch from current work, commit, push, and open a GitHub pull
  request with gh. Use when the user types /open-pr or asks to open a PR,
  stworzyć PR, zrobić PR, wypchnąć zmiany, or ship uncommitted work as a PR.
  Not for splitting work into multiple PRs (use split-to-prs).
disable-model-invocation: true
argument-hint: "[optional title or branch slug]"
---

# Open PR

Ship the current working-tree changes as one branch + one PR. Default base is `main`.

## Hard rules

- Never `push --force` to `main`/`master`. Warn and stop if the user asks.
- Never skip hooks (`--no-verify`, `--no-gpg-sign`) unless the user explicitly asks.
- Never `git add -i` or `git rebase -i`.
- Never update git config.
- Never commit `.env`, `.dev.vars`, credentials, or files gitignored as secrets. Warn if the user asks to include them.
- Do not push until the commit exists locally and `git status` is clean for the intended files.
- Return the PR URL when done.

## 1. Inspect

Run these in parallel:

```powershell
git status -sb
git diff
git diff --cached
git log --oneline -10
git rev-parse --abbrev-ref HEAD
git remote -v
```

Also run `git log --oneline origin/main..HEAD` if already on a feature branch.

Stop and ask the user if:

- There is nothing to commit and nothing unpushed.
- The working tree is on `main` with unrelated dirty files you cannot attribute to this change.
- `gh` is missing from PATH (on Windows refresh PATH first, then retry):

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
gh auth status
```

## 2. Branch

If already on a non-`main` branch that matches the change, keep it.

Otherwise create a new branch from `main` (or the current HEAD if the user is already based correctly):

```powershell
git switch -c <type>/<short-slug>
```

`<type>` is one of: `feat`, `fix`, `chore`, `ci`, `docs`. Slug is lowercase kebab-case, 2–5 words. Examples: `ci/deploy-on-main`, `feat/decision-list`.

Do not commit on `main`.

## 3. Commit

Follow the repo commit style (`git log`). Default: one commit, why-focused, 1–2 sentences.

1. Stage **named files only**. No `git add .` / `git add -A` unless the user asked to include everything and the status list is already reviewed.
2. Re-check staged paths: no secrets, no `node_modules`, no `dist/`.
3. Commit with a message passed as a single `-m` argument (PowerShell 5 has no bash HEREDOC):

```powershell
git commit -m "type: short why" -m "Optional second paragraph."
```

4. If a hook fails, fix and create a **new** commit. Do not `--amend` after a failed hook.
5. `git status -sb` after the commit.

Amend only when all of these are true: the user asked (or a hook rewrote files after a commit you just made), HEAD is yours, and the branch has not been pushed.

## 4. Push

```powershell
git push -u origin HEAD
```

Do not force-push. If the remote rejected a non-fast-forward, stop and report.

## 5. Open the PR

Gather `git log origin/main...HEAD` and the full diff vs `main` (all commits, not just the last).

Write the body to a **temp file outside the repo**, then:

```powershell
gh pr create --base main --head HEAD --title "<same intent as the commit>" --body-file $env:TEMP\pr-body.md
```

Do not pass a multi-line `--body` string in PowerShell 5 — quotes break. Delete the temp file after `gh` succeeds.

PR body template:

```markdown
## Summary
- <1–3 bullets: why / user-visible outcome>

## Test plan
- [ ] <how to verify>
```

If a PR for this head already exists, print its URL instead of opening a second one (`gh pr view --json url,title,state`).

## 6. Report

Reply with: branch name, PR URL, what landed, and anything left uncommitted. Do not merge unless the user asks.
