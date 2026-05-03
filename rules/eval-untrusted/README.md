# `rogue.eval-untrusted`

Block dynamic eval of agent-supplied source — the moral cousin of `curl | sh`, but executed inside a language runtime so the operator never sees a script file to inspect.

## What it catches

| Pattern | Example |
|---|---|
| `python -c "exec(...)"` / `eval(...)` / `__import__` | `python -c "exec(open('x').read())"` |
| `node -e ...` invoking `eval` / `Function` / a child-process spawn | `node -e "eval(process.argv[1])"` |
| `ruby -e ... eval/system/backticks` | `ruby -e "eval(STDIN.read)"` |
| `sh -c "$(curl ...)"` / `eval "$(wget ...)"` | classic remote-payload shape |

## Why it matters

A prompt-injected agent that wants to run arbitrary code has two natural paths:
1. `curl ... | sh` — caught by `rogue.destructive-bash`.
2. Pipe a payload through a language runtime's eval entrypoint — caught here.

Splitting them keeps the verdicts attributable: each rule names a specific mechanism, so the ledger entry tells you which family of attack actually fired.

## False positives

- Legitimate one-liners: `python -c "import sys; print(sys.version)"` is fine — the regex requires `exec` / `eval` / `__import__` / `compile` to fire.
- `eval $(some-cmd)` for shell composition is matched only when the inner command is `curl` or `wget`; `eval $(ssh-agent -s)` etc. are allowed.
