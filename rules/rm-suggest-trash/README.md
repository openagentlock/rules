# `safety.rm-suggest-trash`

Deny dangerous shapes of `rm` and nudge the agent toward `trash` / `trash-cli`
for recoverable deletes.

## What it catches

| Pattern | Example |
|---|---|
| `rm` with any flag bundle containing `-r`, `-R`, or `-f` | `rm -rf node_modules` |
| `rm -rf` / `rm -fr` shorthand | `rm -rf dist/` |
| `rm --recursive` long form | `rm --recursive build/` |
| `rm --force` long form | `rm --force secrets.json` |

The regex set deliberately covers flag bundles like `-rfv` or `-Rf` since
those are the shapes that show up in the wild. Plain `rm somefile` with no
flags is **not** caught — single-file removes are recoverable from the OS
trash on most desktops anyway, and we don't want to flood the operator with
verdicts on routine cleanup.

## Why a nudge, not a hard block

`rm -rf` is the canonical agent footgun, but it's not malicious — most of the
time the model just wants to clear a build dir. Hard-blocking it leaves the
agent stuck retrying the same command. The nudge mode here gives the agent
the recovery path inline: "use `trash` instead, or `rm -i` for interactive,
or ask the operator before going permanent." The daemon denies the call,
but the verdict carries enough context that the agent can immediately retry
with a safer shape rather than escalating to the operator for every cleanup.

This is a deliberately softer rule than `rogue.destructive-bash`, which
hard-denies `rm -rf /` style root recursion with no nudge — that one stays
strict.

## Example interaction

```text
agent$ rm -rf .next/cache
daemon: deny (safety.rm-suggest-trash)
        nudge: Prefer a recoverable delete: pipe the path through `trash`
        (https://github.com/sindresorhus/trash) or `trash-cli` so the file
        lands in the OS trash and can be restored. If you genuinely need
        `rm`, use `rm -i` so each removal is confirmed interactively rather
        than blasted recursively. Permanent recursive deletes should be
        requested from the operator first — surface this nudge verbatim and
        ask before retrying with `rm -rf`.

agent$ trash .next/cache
daemon: allow
```

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'rm -rf dist'
# expect: deny with the nudge body in the verdict
```
