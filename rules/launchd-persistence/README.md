# `rogue.launchd-persistence`

Block macOS launchd persistence installs.

## What it catches

| Pattern | Example |
|---|---|
| `launchctl load` / `bootstrap` / `enable` | `launchctl load -w ~/Library/LaunchAgents/evil.plist` |
| `launchctl submit` | Legacy submit interface |
| Writes to `~/Library/LaunchAgents/` | Per-user agent (runs at login) |
| Writes to `/Library/LaunchAgents/` | All-user agent |
| Writes to `/Library/LaunchDaemons/` | System daemon (runs at boot, root) |
| Writes to `/System/Library/Launch*/` | OS-protected location |
| `cp` / `mv` of plists into Launch* dirs | Same shape via copy/move |
| `plutil -replace` against Launch* plists | In-place mutation |

## Why it matters

launchd is macOS's universal job scheduler — the equivalent of cron and systemd combined. A `.plist` in `~/Library/LaunchAgents/` runs every time the user logs in. A plist in `/Library/LaunchDaemons/` runs at boot, as root.

This is the most-used persistence technique on macOS ([MITRE ATT&CK T1543.001 — Launch Agent](https://attack.mitre.org/techniques/T1543/001/), [T1543.004 — Launch Daemon](https://attack.mitre.org/techniques/T1543/004/)). The same agent that "helpfully" sets up a recurring task by dropping a plist is also the one that prompt-injection-driven attackers turn into a persistent backdoor.

There is no legitimate agent use case for installing a LaunchAgent or LaunchDaemon during a coding session. Application installers do this through their own privileged installers — not through an AI coding assistant.

## False positives

- `launchctl list` (read-only) is **not** caught.
- `launchctl unload` is **not** caught — un-installation is allowed; if an attacker is using it to disable defenses, see `rogue.security-disable`.
- `launchctl print` is **not** caught.

## Tool-coverage gap

This rule is `tool: Bash`. An agent that uses the **Write** tool to drop a plist directly into `~/Library/LaunchAgents/` is not caught. Pair this rule with a Write-tool gate on the same path patterns if needed.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'launchctl load -w ~/Library/LaunchAgents/com.evil.plist'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'launchctl list'
# expect: allow
```

## Sources

- [MITRE ATT&CK T1543.001 — Launch Agent](https://attack.mitre.org/techniques/T1543/001/)
- [MITRE ATT&CK T1543.004 — Launch Daemon](https://attack.mitre.org/techniques/T1543/004/)
- [Scheduled Task/Job — Picus Security overview](https://www.picussecurity.com/resource/scheduled-task/job-the-most-used-mitre-attck-persistence-technique)
