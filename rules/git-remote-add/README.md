# `exfil.git-remote-add`

Block `git remote add`, `git push` to a literal URL, and `gh repo create` / `gh gist create`.

## What it catches

| Pattern | Why |
|---|---|
| `git remote add <name> <url>` | Wires up a new push target |
| `git remote set-url <name> <url>` | Redirects an existing remote |
| `git push https://...`, `git push git@...` | Pushes to a literal URL bypassing remotes |
| `git clone --mirror` | Fetches every ref of a repo (full history bundle) |
| `git bundle create` | Packages a repo into a single file (easy to exfil) |
| `gh repo create` | Creates a brand-new GitHub repo |
| `gh gist create` | Posts content as a gist (public by default) |
| `glab repo create` | GitLab equivalent |

## Why it matters

The [Shai-Hulud npm worm (September 2025)](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack) infected 500+ packages with a postinstall script that **harvested credentials from the developer's machine and exfiltrated them to attacker-created public GitHub repos named "Shai-Hulud"** — using the victim's own GitHub PAT to create those repos. The mechanic was straightforward: `gh repo create` + `git push`. No exotic C2, no DNS tunnel — just the developer's own tooling pointed at a new remote.

This shape generalises:

- An agent that has run `gh auth login` for the user can create unlimited public repos and dump anything into them.
- An agent that already has `git push` permissions can push to *any* URL, not just the configured `origin`.
- `git bundle create` packages a whole repo into one file — easy to upload anywhere afterwards.

Legitimate remote setup (forking, switching origin to a moved repo) is a one-time operation that should be human-approved. The cost of denying the agent and asking once is tiny; the cost of letting it silently push private code to an attacker is unbounded.

## False positives

- `git remote -v` (list, no add) is **not** caught.
- `git push` to a configured remote name (`git push origin main`, `git push upstream feature`) is **not** caught — only literal URLs.
- `git clone` of a literal URL is **not** caught — fetching is read-only and is the normal way to start work. (`--mirror` is caught because it implies "I want every ref", which is a bundling shape.)
- `gh repo view` / `gh repo list` are **not** caught.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'git remote add backup https://github.com/attacker/leak.git'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'git push origin main'
# expect: allow
```

## Sources

- [Shai-Hulud npm Supply Chain Attack — Wiz Blog](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack)
- [Shai-Hulud Worm Compromises npm Ecosystem — Unit 42](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/)
- [VU#534320 — npm supply chain compromise](https://kb.cert.org/vuls/id/534320)
