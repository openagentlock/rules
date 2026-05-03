# `rogue.system-auth-write`

Block writes to system authentication, identity, and network-routing files.

## What it catches

| Path | What it controls |
|---|---|
| `/etc/sudoers`, `/etc/sudoers.d/*` | Who can `sudo` and as whom (privilege escalation primitive) |
| `/etc/passwd`, `/etc/shadow`, `/etc/group`, `/etc/gshadow` | User and group accounts |
| `/etc/hosts`, `/etc/hostname` | Local DNS overrides — domain hijacking |
| `/etc/resolv.conf` | Resolver config — full DNS hijack |
| `/etc/nsswitch.conf` | Name-resolution dispatch order |
| `/etc/pam.d/*`, `/etc/security/*` | Pluggable auth policy |
| `/etc/ssh/sshd_config`, `/etc/ssh/sshd_config.d/*` | SSH server policy (PasswordAuth, PermitRootLogin) |
| `/etc/ssh/ssh_host_*` | Host keys — substitution enables MITM |
| `~/.ssh/authorized_keys`, `/root/.ssh/authorized_keys` | **The classic SSH backdoor primitive** |
| `~/.ssh/config` | Per-user SSH client policy (Host overrides) |
| `~/.ssh/known_hosts` | Host-key trust (clearing enables MITM) |
| `/etc/login.defs`, `/etc/securetty`, `/etc/sub(u/g)id` | Account-creation policy |
| `/etc/hosts.allow`, `/etc/hosts.deny`, `/etc/cron.allow`, `/etc/at.allow` | Service-level ACLs |
| `/private/etc/...` | macOS aliases for the same files |

## Why it matters

This is [MITRE ATT&CK T1098 — Account Manipulation](https://attack.mitre.org/techniques/T1098/) and [T1556 — Modify Authentication Process](https://attack.mitre.org/techniques/T1556/), bundled together. Every file on this list is a primitive an attacker uses to:

- **Establish persistence** — adding an SSH key to `authorized_keys` is the canonical SSH backdoor; adding a sudoers entry is the canonical privilege-escalation backdoor.
- **Hijack name resolution** — `/etc/hosts` redirects `github.com` to an attacker IP; `/etc/resolv.conf` redirects *all* lookups.
- **Weaken authentication** — flipping `PasswordAuthentication yes` and `PermitRootLogin yes` in `sshd_config`, or removing PAM modules, opens auth surface that the operator may have spent months tightening.
- **Create accounts** — adding a line to `/etc/passwd` and `/etc/shadow` creates a usable login.

For an AI coding agent: there is **no coding workflow** that requires writing to `/etc/sudoers`, `/etc/passwd`, or `~/.ssh/authorized_keys`. SSH key management is a one-time human operation. sudoers changes go through a package-managed snippet review. /etc/hosts mods are sometimes done in development, but always by hand.

## False positives

- Reading these files is **not** blocked here — see `rogue.secret-read` for the relevant Read-tool gate (which already covers SSH private keys and a few of these paths).
- A genuine development workflow that needs `/etc/hosts` edits — do it manually. The agent should not be able to silently redirect your traffic.
- Container image builds that legitimately edit `/etc/passwd` (creating an app user) — run those through `RUN useradd` in a Dockerfile, not via an agent's Write tool against the host.

## Tool-coverage gap

This rule is `tool: Write`. An agent that uses **Edit** to modify these files, or uses Bash to `echo "..." >> /etc/hosts`, will not be caught. Pair this rule with:

- A sibling rule with `tool: Edit` and the same `any_path_regex`.
- Patterns in a Bash-redirect rule covering `(?:>|>>)\s*/etc/(sudoers|passwd|...)`.

## Test it

```bash
agentlock fake-hook --session <id> --tool Write --path /etc/sudoers
# expect: deny

agentlock fake-hook --session <id> --tool Write --path /Users/me/.ssh/authorized_keys
# expect: deny
```

## Sources

- [MITRE ATT&CK T1098 — Account Manipulation](https://attack.mitre.org/techniques/T1098/)
- [MITRE ATT&CK T1098.004 — SSH Authorized Keys](https://attack.mitre.org/techniques/T1098/004/)
- [MITRE ATT&CK T1556 — Modify Authentication Process](https://attack.mitre.org/techniques/T1556/)
