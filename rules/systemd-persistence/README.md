# `rogue.systemd-persistence`

Block Linux systemd unit and timer persistence installs.

## What it catches

| Pattern | Example |
|---|---|
| `systemctl enable <unit>` | `systemctl enable evil.service` |
| `systemctl start <new-unit>.service` | Activation of a freshly-dropped unit |
| Writes to `/etc/systemd/system/*.service` | Operator-managed unit dir |
| Writes to `/usr/lib/systemd/system/*.service` | Package-managed unit dir |
| Writes to `~/.config/systemd/user/*.service` | Per-user unit |
| `cp` / `mv` of `.service` files into systemd dirs | Same shape |
| `systemd-run --unit=...` | Persistent unit registration |
| `loginctl enable-linger` | Lets user units run after logout |

## Why it matters

systemd is the universal Linux service manager. A `.service` file in `/etc/systemd/system/` plus `systemctl enable` is enough to survive every reboot and most cleanup runs. By default, units run as root.

This is [MITRE ATT&CK T1543.002 — Create or Modify System Process: Systemd Service](https://attack.mitre.org/techniques/T1543/002/), one of the persistence techniques most commonly seen in Linux post-exploitation. An AI agent that "configures the deployment" by dropping a service file is establishing the same primitive an attacker uses for backdoor installation.

There is no agent coding workflow that legitimately requires writing to `/etc/systemd/system/` or running `systemctl enable`. Production deployments go through orchestration (Ansible, Helm, packaged installers), each with their own review path.

## False positives

- `systemctl status`, `systemctl is-active`, `systemctl list-units` are **not** caught (read-only).
- `systemctl restart <existing-known-unit>` is caught when the unit-name pattern matches. If your operator workflow involves the agent restarting your own services, this is the right behaviour — restarts are a deploy primitive that should be human-approved.
- `systemctl --user enable` (per-user) is caught. User-scope persistence is still persistence.

## Tool-coverage gap

This rule is `tool: Bash`. An agent dropping a unit file via the **Write** tool is not caught here. Pair with a Write-tool path rule on the same directories.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'systemctl enable evil.service'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'systemctl status nginx'
# expect: allow
```

## Sources

- [MITRE ATT&CK T1543.002 — Systemd Service](https://attack.mitre.org/techniques/T1543/002/)
