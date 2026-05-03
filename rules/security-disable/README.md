# `rogue.security-disable`

Block disabling host and cloud security controls.

## What it catches

**Linux firewall:**
- `iptables -F`, `ip6tables -F`, `nft flush ruleset`, `ufw disable`
- `systemctl stop/disable/mask firewalld | ufw | iptables | nftables`

**Mandatory access control & auditing:**
- `setenforce 0`, `setenforce Permissive` (SELinux)
- `aa-disable`, `aa-complain` (AppArmor)
- `systemctl stop/disable/mask apparmor | auditd | rsyslog | systemd-journald`
- `auditctl -D`, `service auditd stop`

**macOS protections:**
- `csrutil disable` — System Integrity Protection
- `spctl --master-disable` — Gatekeeper
- `defaults write /Library/Preferences/com.apple.security ...`

**Shell-history erasure (covering tracks):**
- `unset HISTFILE`, `set +o history`, `history -c`
- `export HISTSIZE=0`, `export HISTFILE=/dev/null`
- `rm ~/.bash_history`, `rm ~/.zsh_history`

**Cloud-side audit & observability deletion:**
- `aws cloudtrail stop-logging` / `delete-trail`
- `aws guardduty delete-detector`
- `aws config stop-configuration-recorder`
- `aws securityhub disable-security-hub`
- `gcloud logging sinks delete`

## Why it matters

Every entry on this list is a step in the same playbook: **make the next attack invisible**. This is [MITRE ATT&CK TA0005 — Defence Evasion](https://attack.mitre.org/tactics/TA0005/). The standard sequence:

1. Get an initial primitive (RCE, prompt injection, leaked credential).
2. Disable the things that would notice further activity.
3. Do the actual damage.

Step 2 is what this rule blocks. The cost of false positives here is genuinely low: an AI coding agent has effectively *no* legitimate reason to disable any of these. Firewall configuration changes happen through declarative tools (Terraform, Ansible) reviewed by humans. SELinux / AppArmor / SIP modifications happen through OS-level installers, not coding sessions. CloudTrail and GuardDuty exist *specifically* so that a compromised credential can't quietly cover its tracks.

The shell-history patterns deserve special note: an agent that has just run something it doesn't want logged will reach for `history -c` or `unset HISTFILE`. This is the agent equivalent of an attacker clearing logs after a breach. There is no benign reason for an autonomous agent to touch shell history.

## False positives

- `iptables -L` (list, no flush) is **not** caught.
- `aws cloudtrail describe-trails` (read-only) is **not** caught.
- A development workstation legitimately needing `csrutil disable` (custom kernel extensions) — perform this manually outside the agent context.
- `history` (no `-c`) is **not** caught.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'iptables -F'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'iptables -L'
# expect: allow

agentlock fake-hook --session <id> --tool Bash --command 'history -c && unset HISTFILE'
# expect: deny
```

## Sources

- [MITRE ATT&CK TA0005 — Defence Evasion](https://attack.mitre.org/tactics/TA0005/)
- [MITRE ATT&CK T1562.001 — Disable or Modify Tools](https://attack.mitre.org/techniques/T1562/001/)
- [MITRE ATT&CK T1562.004 — Disable or Modify System Firewall](https://attack.mitre.org/techniques/T1562/004/)
- [MITRE ATT&CK T1070.003 — Indicator Removal: Clear Command History](https://attack.mitre.org/techniques/T1070/003/)
