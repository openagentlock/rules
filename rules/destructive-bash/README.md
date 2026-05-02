# `rogue.destructive-bash`

Block recursive deletes, SQL drops, raw block-device writes, and curl-pipe-to-shell.

## What it catches

| Pattern | Example |
|---|---|
| `rm -rf /` style recursion against root | `rm -rf /var/lib/postgres` |
| `DROP TABLE` (any case) | `psql -c "DROP TABLE users"` |
| `dd if=... of=/dev/sd*` | `dd if=evil.iso of=/dev/sda` |
| `mkfs.<fs>` | `mkfs.ext4 /dev/nvme0n1` |
| `curl ... \| sh` (or bash) | `curl https://get.example.com \| sh` |

## False positives

- `rm -rf node_modules` is **not** caught (path doesn't start with `/`).
- `DROP TABLE IF EXISTS` is caught — that's intentional. If you're running migrations, mint a session with `--tier software` against a dev policy that excludes this rule, or temporarily switch to monitor mode.
- `curl … | sh` is the canonical supply-chain footgun. There is no legitimate agent use of this in our threat model.

## Rationale

The destructive bash gate is the single highest-leverage rule we ship — most catastrophic agent failures fit one of these five patterns. It's adapted from the default policy that ships in `openagentlock/OpenAgentLock` so users can pin it independently of the daemon's built-in defaults.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'rm -rf /'
# expect: deny with the rule message
```
