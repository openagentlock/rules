# `rogue.git-history-rewrite`

Block git's destructive history-rewrite and ref-destruction primitives.

## What it catches

| Pattern | Why |
|---|---|
| `git filter-branch`, `git filter-repo`, `bfg` | Whole-history rewrite — every commit hash changes |
| `git reset --hard origin/<branch>` | Overwrites local work with upstream |
| `git reset --hard HEAD~<n>` | Drops the last N commits |
| `git update-ref -d <ref>` | Deletes a ref directly |
| `git reflog expire --expire=now` | **Removes the reflog safety net** |
| `git reflog delete` | Same shape, surgical |
| `git gc --prune=now` / `--prune=all` | Garbage-collects unreachable objects (lost forever) |
| `git gc --aggressive` | Same plus a deeper repack |
| `git branch -D <name>` | Force-delete a branch (no merge check) |
| `git tag -d <tag>` | Tag deletion |
| `git push --delete <ref>`, `git push :<ref>` | Remote ref deletion |
| `git clean -fd` (or `-fdx`) | Wipes untracked/ignored files |
| `git worktree remove -f` | Force-removes a worktree |

## Why it matters

This rule is the local-side complement to the existing `rogue.git-force-push` (which blocks force-push to shared branches). Force-push is one way to lose work; the commands here are the others.

The standard "agent panicked" failure mode: the agent realises it made a wrong change, tries to "go back to a clean state" by running `git reset --hard origin/main` — which silently overwrites every uncommitted local change. *Normally* you can recover from this via the reflog. But if the agent then runs `git reflog expire --expire=now && git gc --prune=now` to "clean up" — the safety net is gone too.

`git filter-branch` and `git filter-repo` are heavier-weight: they rewrite every commit hash in history. For a team repo, this is functionally a force-push of an entire alternate timeline. Anyone with the old refs has a permanent split.

`bfg` (BFG Repo-Cleaner) is the popular tool for "removing secrets from git history" — exactly the operation an agent might be asked to do after a credential leak. It works by rewriting history. If the agent runs it without first ensuring everyone has pushed and the team is ready, you've created a coordination disaster.

`git clean -fd` / `-fdx` removes untracked (and with `x`, ignored) files. This is the one that wipes your `.env`, your `node_modules`, your build artifacts, and any in-progress files you forgot to add. There is no undo.

## False positives

- `git reset` (soft, no `--hard`) is **not** caught.
- `git reset --hard` to a local commit you wrote (`git reset --hard abc123`) is **not** caught — only resets to `origin/...`, `upstream/...`, `remotes/...`, or `HEAD~N` are flagged. This is the heuristic line: agent is "reverting to upstream" or "dropping recent work".
- `git gc` without `--prune=now` is **not** caught (default prune window is 2 weeks).
- `git clean -n` (dry-run) is **not** caught.

## Overlap notes

- The existing `rogue.git-force-push` covers force-push to `main`/`master`/`develop`/`release`. This rule covers everything else in the destructive-git surface.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'git reflog expire --expire=now --all && git gc --prune=now'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'git reset HEAD~1'
# expect: allow  (soft reset)

agentlock fake-hook --session <id> --tool Bash --command 'git reset --hard origin/main'
# expect: deny
```
