# `exfil.cloud-cred-read`

Block reads of cloud-SDK credential stores not already covered by `rogue.secret-read`.

## What it catches

| Provider | Path | Holds |
|---|---|---|
| gcloud | `~/.config/gcloud/application_default_credentials.json` | ADC OAuth2 refresh token |
| gcloud | `~/.config/gcloud/access_tokens.db`, `credentials.db` | Account credentials |
| gcloud | `~/.config/gcloud/legacy_credentials/` | Per-account creds |
| Azure CLI | `~/.azure/accessTokens.json`, `azureProfile.json` | Bearer tokens, sub IDs |
| Azure CLI | `~/.azure/msal_token_cache.{json,bin}` | MSAL token cache |
| Docker | `~/.docker/config.json` | Container registry auth |
| GCP | `*service*account*.json` | Service-account private keys |
| Terraform | `~/.terraform.d/credentials.tfrc.json` | TFC/TFE tokens |
| Terraform | `terraform.tfstate` (and `.backup`) | **Rendered secrets baked into state** |
| Helm | `~/.helm/repository/repositories.yaml`, `~/.helm/registry/config.json` | Chart registry creds |
| Databricks | `~/.databrickscfg`, `~/.databricks/token-cache.json` | Workspace tokens |
| Snowflake | `~/.snowflake/connections.toml` | Per-connection passwords |
| Heroku | `~/.config/heroku/config.json` | API key |
| GitHub CLI | `~/.config/gh/hosts.yml` | OAuth tokens for `gh` |
| 1Password CLI | `~/.config/op/config` | Account configuration |

## Why it matters

This rule complements `rogue.secret-read`, which already covers `.aws/credentials`, `.aws/config`, kubeconfig, SSH keys, .npmrc, .pypirc, .netrc, and .gnupg. Together they form a near-complete moat around the file-system credential surface.

The threat model is the same as the [Supabase MCP service-role incident](https://generalanalysis.com/blog/supabase-mcp-blog) — once a credential enters the agent's context, every downstream tool call is a potential exfil channel:

> *The cursor assistant operates the Supabase database with elevated access via the service_role, which bypasses all row-level security (RLS) protections.*

…the same logic applies to a GCP service-account JSON or an Azure access token. A prompt-injected agent that has just read `~/.config/gcloud/application_default_credentials.json` can do anything that account can do across GCP — and the credential is now also sitting in the LLM provider's context window.

`terraform.tfstate` is the under-appreciated entry: Terraform writes provisioned-resource secrets (DB passwords, generated API keys) into state in plaintext. Reading state is reading every secret Terraform has ever provisioned for that workspace.

## False positives

- A repo's own `terraform.tfstate` checked into version control (rare, anti-pattern, but happens) is caught — that's intentional, the secrets are real.
- An agent debugging a `gh auth` issue that wants to inspect `~/.config/gh/hosts.yml` is denied. Use `gh auth status` instead — it doesn't leak the token.
- Azure CLI's `~/.azure/clouds.config` (cloud profile, no secrets) is **not** caught.

## Test it

```bash
agentlock fake-hook --session <id> --tool Read \
  --path ~/.config/gcloud/application_default_credentials.json
# expect: deny

agentlock fake-hook --session <id> --tool Read \
  --path ~/.config/gcloud/active_config
# expect: deny  (just account name, but read is the install step for follow-on attacks)
```

## Sources

- [Supabase MCP can leak your entire SQL database — General Analysis](https://generalanalysis.com/blog/supabase-mcp-blog)
- [When AI Has Root: Lessons from the Supabase MCP Data Leak — Pomerium](https://www.pomerium.com/blog/when-ai-has-root-lessons-from-the-supabase-mcp-data-leak)
- [From .env to Leakage: Mishandling of Secrets by Coding Agents — Knostic](https://www.knostic.ai/blog/claude-cursor-env-file-secret-leakage)
