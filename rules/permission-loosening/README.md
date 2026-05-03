# `rogue.permission-loosening`

Block `chmod` / `chown` / `setfacl` / `xattr` invocations that loosen security in dangerous ways.

## What it catches

| Pattern | Why |
|---|---|
| `chmod 777`, `chmod 0777`, `chmod -R 777` | World-writable, world-executable |
| Mode ending in 777 (e.g. `1777`, `4777`) | Same plus sticky/setuid |
| Mode in the [2467]xxx family | Setuid / setgid / sticky bits set |
| `chmod a+w` / `a=rwx` | Equivalent symbolic forms |
| `chmod o+w` | Others get write |
| `chmod +s` / `u+s` / `g+s` | **Setuid** — the file runs as its owner |
| `chmod 666 /etc/...` | World-writable on a system dir |
| `chown -R user /(etc\|usr\|bin\|sbin\|root\|boot)` | Recursively re-owns system dirs |
| `setfacl -m o:rwx` | ACL-based world-write |
| `xattr -d com.apple.quarantine` | Strips macOS Gatekeeper quarantine |

## Why it matters

`chmod 777` is the load-bearing footgun. Every developer who's been told "just chmod 777 it" has experienced what [Xygeni's writeup](https://xygeni.io/blog/chmod-777-is-not-a-fix-how-a-misconfigured-script-became-a-backdoor/) describes:

> *In shared build agents, containerized environments, or multi-user Linux systems, `chmod 777` turns every file it touches into an open invitation for tampering — the perfect setup for a backdoor attack. … chmod 777 overrides carefully designed Linux permissions, removes safeguards, and paves the way for a backdoor attack that can compromise CI/CD pipelines and production systems.*

This is [MITRE ATT&CK T1222.002 — Linux and Mac File and Directory Permissions Modification](https://attack.mitre.org/techniques/T1222/002/), used by attackers for both defence evasion and persistence.

For an AI coding agent: the failure mode is the canonical "permission denied → loosen permissions" reflex. The agent runs into a `EACCES`, "fixes" it with `chmod -R 777 /opt/app`, and the production app directory is now writable by every user on the box. Any later compromise (web shell, supply-chain pull) lands in a directory that auto-executes attacker code.

The setuid bit (`chmod +s`) is even more dangerous — it makes a binary execute with its owner's privileges (often root). An agent dropping `+s` on a script it just wrote is a privilege-escalation primitive.

## False positives

- `chmod 755` (standard executable), `chmod 644` (standard file), `chmod 700` (private dir) are all **not** caught.
- `chmod +x script.sh` (just executable, no world-write) is **not** caught.
- `chown -R user .` against a project directory is **not** caught — only system dirs trigger the recursive-chown match.
- `xattr -d com.apple.quarantine` is caught. Sometimes legitimate (a power user removing quarantine on a downloaded binary they've audited) — but for an agent, this is bypassing macOS Gatekeeper and the deny is intentional.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'chmod -R 777 /opt/app'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'chmod 755 deploy.sh'
# expect: allow
```

## Sources

- [MITRE ATT&CK T1222.002 — File and Directory Permissions Modification](https://attack.mitre.org/techniques/T1222/002/)
- [Chmod 777 Is Not a Fix — Xygeni](https://xygeni.io/blog/chmod-777-is-not-a-fix-how-a-misconfigured-script-became-a-backdoor/)
- [Understanding Chmod 777 — Oreate AI](https://www.oreateai.com/blog/understanding-chmod-777-the-power-and-risks-of-recursive-permissions/6a40658d62abadede49d9c7fb9cbf6e7)
