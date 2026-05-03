# `rogue.secret-read`

Block Read tool calls against canonical secret-bearing paths.

## What it catches

Standing reads of well-known secret locations:

| Pattern | Why |
|---|---|
| `.env`, `.env.local`, `.env.production` | Application secrets |
| `.envrc` | direnv shell secrets |
| `.aws/credentials`, `.aws/config` | AWS access keys |
| `.ssh/id_rsa`, `.ssh/id_ed25519`, ... | SSH private keys |
| `.npmrc`, `.pypirc` | Registry auth tokens |
| `.netrc` | Generic HTTP auth credentials |
| `.gnupg/*` | GPG private keys |
| `kubeconfig`, `.kube/config` | Cluster admin tokens |

## Why it matters

The canonical scenario for this gate: an agent debugging "auth failure" reads `.env` to "check the env config", and the keys are then in the agent's context — which means in any subsequent tool-call payload (a curl, a log, a chat message back to the LLM provider). Even without active exfiltration, a `Read .env` is the moment trust crosses from your shell into the model.

The daemon-side approval flow (`session approve --one-shot`) is the right escape hatch — the agent gets the file once, the deny becomes an `allow` for that one call, and the ledger records the explicit human approval.

## False positives

- A repo-shipped `.env.example` file with placeholders is caught. That's intentional — you should `Bash cat .env.example` if you actually need the agent to see it; that intent is then explicit.
- Reading `.envrc` of a project you're working in: also intentional. If your workflow needs it, install the rule with `monitor` mode locally instead of `firewall` for a soft trip.
