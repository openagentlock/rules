# `rogue.cron-persistence`

Block cron-based persistence installs.

## What it catches

| Pattern | Example |
|---|---|
| `crontab -` (stdin install) | `echo "* * * * * /tmp/payload" \| crontab -` |
| `crontab <file>` | `crontab /tmp/job.cron` |
| Append-via-subshell | `(crontab -l; echo "@reboot /tmp/x") \| crontab -` |
| Writes to `/etc/cron.*` | `echo "* * * * * root /tmp/x" >> /etc/cron.d/payload` |
| Writes to `/var/spool/cron/` | Per-user crontab spool |
| `systemd-run --on-*` | One-shot or recurring transient timer |
| `at now + 5 minutes` | One-shot scheduled job |

## Why it matters

Cron is [MITRE ATT&CK T1053.003](https://attack.mitre.org/techniques/T1053/003/) — *the* most common Linux/macOS persistence technique. The pattern is well-known: an attacker (or a prompt-injected agent) drops a job that re-establishes a C2 channel, re-installs malware after reboot, or exfiltrates data on a schedule.

Real-world example: the [Shai-Hulud npm supply-chain worm (September 2025)](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack) compromised 500+ npm packages with `postinstall` scripts that, among other things, installed scheduled jobs to maintain access. Once the worm was on a developer's machine, the cron job kept re-fetching credential-harvesting payloads and republishing trojaned versions of any package the dev had npm tokens for — making the worm self-propagating.

Agents have *no* legitimate use for installing cron jobs in a coding session. If you're doing infra work that genuinely needs scheduled execution, write a Terraform/Helm/systemd unit through the normal review process.

## False positives

- `crontab -l` (list, no install) is **not** caught.
- `crontab -e` (interactive edit) is **not** caught — it requires an editor session, which is a poor agent attack surface.
- A repository that ships a `.cron` file in version control: caught only when an agent tries to *install* it, not when it's just read or written as a file.

## Tool-coverage gap

This rule is `tool: Bash`. An agent that drops a payload directly into `/etc/cron.d/` via the **Write** or **Edit** tool will not be caught here. Pair this rule with a Write-tool gate against the same paths if your threat model includes that vector.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'echo "* * * * * /tmp/x" | crontab -'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'crontab -l'
# expect: allow
```

## Sources

- [MITRE ATT&CK T1053.003 — Scheduled Task/Job: Cron](https://attack.mitre.org/techniques/T1053/003/)
- [Shai-Hulud npm Supply Chain Attack — Wiz Blog](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack)
- [Shai-Hulud Worm Compromises npm Ecosystem — Unit 42](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/)
