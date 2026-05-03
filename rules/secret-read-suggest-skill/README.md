# `safety.secret-read-suggest-skill`

Deny Read calls against canonical secret-bearing paths and nudge the agent
toward a dedicated `secret-fetcher` skill rather than an ambient file read.

## What it catches

The same path set as `rogue.secret-read`, plus `~/.ssh/config`:

| Pattern | Why |
|---|---|
| `.env`, `.env.*` | App secrets |
| `.envrc` | direnv shell secrets |
| `.aws/credentials`, `.aws/config` | AWS access keys |
| `.ssh/id_*`, `.ssh/identity`, `.ssh/config` | SSH keys + host config |
| `.npmrc`, `.pypirc` | Registry tokens |
| `.netrc` | HTTP auth credentials |
| `.gnupg/*` | GPG private material |
| `kubeconfig`, `.kube/config` | Cluster admin tokens |

## Why a nudge, not just a deny

`rogue.secret-read` is the raw "no, don't read that" rule. This rule layers
the "use the right tool" pattern on top: instead of leaving the agent stuck
or escalating to the operator for every secret access, the verdict carries
the name of the skill that should handle it. The point is to demonstrate the
"force use of a skill" pattern — a deny that simultaneously *teaches* the
agent the correct path forward.

> Note: `secret-fetcher` is illustrative — it's a placeholder for a future
> entry in the [openagentlock/skills](https://github.com/openagentlock/skills)
> repo. The exact skill name will firm up once that registry lands; the
> nudge text in this rule is the right shape but expect the skill id to
> change. Until then the second half of the nudge ("ask the operator to
> paste the value") is the actually-actionable fallback.

## Example interaction

```text
agent$ Read .env
daemon: deny (safety.secret-read-suggest-skill)
        nudge: Don't read secret files directly into your context. If your
        harness has the openagentlock/skills `secret-fetcher` skill
        installed, invoke it — the skill brokers the value through a sealed
        channel so the secret never lands in your prompt or tool-call
        payloads. Otherwise, ask the operator to read the file and paste
        only the specific value you need (key name + use case), and treat
        anything they paste as sensitive — do not echo it back into logs or
        reply text.

agent: I need DATABASE_URL from .env to run the migration. Could you paste
       just that one value? I won't log it.
```

## Pairing with `rogue.secret-read`

If you install both rules, this one's nudge wins on overlap (same path set,
this rule has the actionable hint). You can pin only this rule for the
nudge-forward style, or only `rogue.secret-read` for the terse deny — pick
based on whether your operators want the agent to self-recover.

## Test it

```bash
agentlock fake-hook --session <id> --tool Read --path '.env'
# expect: deny with the secret-fetcher nudge in the verdict
```
