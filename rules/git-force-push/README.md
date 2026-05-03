# `rogue.git-force-push`

Block `git push --force` to canonical shared branches: `main`, `master`, `develop`, `release/*`.

## What it catches

| Pattern | Example |
|---|---|
| `git push --force <remote> main` | `git push --force origin main` |
| `git push -f <remote> master` | `git push -f origin master` |
| `git push --force-with-lease <remote> main` | `git push --force-with-lease origin main` |
| `git push <remote> +main` | `git push origin +main` (refspec form) |

## What it does not catch

- Force push to a personal/feature branch — that's normal workflow.
- Force push when the target branch is implicit (no positional arg) — the regex needs the branch name to be present so it doesn't false-positive on `git push --force` against an upstream-tracked feature branch.

## Why it matters

The shape this gate catches: an operator under time pressure asks the agent to "push this fix fast", and the agent reaches for `git push --force origin main` to skirt a branch-protection complaint. The gate denies. The operator either approves explicitly (with a fresh session root via `session rotate`) or refuses and ships through a normal PR. Force-push to main should cost something — a deliberate two-tap flow plus a permanent ledger entry.

## Tuning

If your team uses a non-standard "main" branch (`trunk`, `prod`, ...), fork this rule and add it to the regex. Branch protection on the GitHub side is also a load-bearing layer — this rule is defense in depth, not a substitute for `protected_branches`.
