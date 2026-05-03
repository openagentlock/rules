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

## community scenario tie-in

This is the demo scenario "the main branch is broken, push this fix fast" — the agent runs `git push --force origin main`, the gate denies, and the operator either approves with a fresh session root (`session rotate`) or refuses. Force-push to main is exactly the kind of action that should cost something. Two taps, a fresh session root, and it's visible in the ledger forever.

## Tuning

If your team uses a non-standard "main" branch (`trunk`, `prod`, ...), fork this rule and add it to the regex. Branch protection on the GitHub side is also a load-bearing layer — this rule is defense in depth, not a substitute for `protected_branches`.
