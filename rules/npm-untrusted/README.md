# `supply-chain.npm-untrusted`

Block npm / yarn / pnpm installs from unaudited sources, and credential operations that turn a developer machine into a publishing surface.

## What it catches

| Pattern | Why |
|---|---|
| `npm install <url>` / `git+...` / `github:...` / `file:...` | Bypasses the public registry — no version, no provenance, no audit |
| `npm install <local>.tgz` | Tarball install — same problem |
| Same shapes for `yarn add` / `pnpm add` | Equivalent footguns |
| `npx <url>` / `npx --package=<url>` | One-shot execution from arbitrary URLs |
| `npm install --registry=...` (any) | An explicit registry override at install time — even pointing at npmjs.org is suspicious in agent context |
| `yarn/pnpm config set registry <any>` | Persistent registry switch |
| `npm publish`, `yarn publish`, `pnpm publish` | The actual propagation step Shai-Hulud used |
| `npm token create/delete/revoke/list` | Token surface — minting tokens for an agent is bad |
| `npm adduser`, `npm login` | Session establishment |

## Why it matters — Shai-Hulud (September 2025)

The [Shai-Hulud npm worm](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack) is the worst-case shape:

> *On September 15, 2025, malicious versions of multiple popular packages were published to npm containing a post-install script that harvested sensitive data and exfiltrated it to attacker-created public GitHub repos named Shai-Hulud. … When a compromised package encountered additional npm tokens in a victim environment, [it] would automatically publish malicious versions of any packages it could access.*

500+ packages compromised. Self-propagating. The propagation primitive was `npm publish` from victim machines.

There was also a parallel campaign on September 8, 2025 — a phishing attack hijacked an npm maintainer's account, cascading into 18 packages including chalk, debug, ansi-styles, strip-ansi (collectively **2.6 billion weekly downloads**).

For an AI coding agent: the install-from-URL shapes are how prompt-injected agents get arbitrary code onto the developer's machine in the first place. The publish/token shapes are how that code spreads further.

In 2025 alone, attackers published [454,648 malicious npm packages](https://unit42.paloaltonetworks.com/monitoring-npm-supply-chain-attacks/) — nearly half a million in one year. The base rate is too high to assume any unfamiliar package URL is safe.

## False positives

- `npm install <package-name>` (registry-name install) is **not** caught. The registry has its own audit signal; this rule is about *non-registry* installs.
- `npm install` (no args, restoring `package-lock.json`) is **not** caught.
- `npm view`, `npm search`, `npm pack`, `npm run` are all unaffected.
- Local development with linked packages (`npm link`, `pnpm link`) is **not** caught.
- A monorepo using `file:../sibling` workspace dependencies is caught. If you have a fixed set of internal `file:` deps, fork this rule and add a positive whitelist for those paths.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'npm install https://github.com/random/repo/tarball/main'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'npm install lodash'
# expect: allow

agentlock fake-hook --session <id> --tool Bash --command 'npm publish'
# expect: deny
```

## Sources

- [Shai-Hulud npm Supply Chain Attack — Wiz](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack)
- ["Shai-Hulud" Worm Compromises npm Ecosystem — Unit 42](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/)
- [Defending Against npm Supply Chain Attacks — Splunk](https://www.splunk.com/en_us/blog/security/npm-supply-chain-attack-detection-analysis.html)
- [The npm Threat Landscape — Unit 42](https://unit42.paloaltonetworks.com/monitoring-npm-supply-chain-attacks/)
