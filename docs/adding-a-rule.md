# Adding a rule

This walks through publishing a rule to the upstream registry. The same steps work for a private fork — just push to your own git host and register it with `agentlock rules add` instead of opening a PR here.

## 1. Pick an id

Rule ids are lowercase, dot-separated, kebab-case for the leaf. Examples that are already taken:

- `rogue.destructive-bash`
- `exfil.curl-with-env`

The directory under `rules/` must match the leaf segment. So `rogue.destructive-bash` lives at `rules/destructive-bash/`.

## 2. Author the rule

Copy an existing rule directory as a template:

```bash
cp -r rules/destructive-bash rules/my-new-rule
```

Edit `rules/my-new-rule/rule.yaml`. The schema lives at `schema/rule.schema.json`; here are the fields you must set:

| Field | What it means |
|---|---|
| `schema_version` | Always `1` for now. |
| `id` | Globally-unique rule id, e.g. `mycompany.no-ssh-keys`. |
| `name` | One-line human title. |
| `description` | 1–3 sentences of why the rule exists. |
| `severity` | `info`, `low`, `medium`, `high`, `critical`. |
| `tags` | Free-form, lowercase. Used by site search. |
| `gate.match` | Match conditions in OpenAgentLock-native shape: `tool`, `any_command_regex` (array), `any_path_regex`, `any_url_regex`, `path_glob`. |
| `gate.evaluate` | Array of evaluator entries. v1 supports `kind: always` with `action` ∈ {`allow`, `deny`, `monitor`, `warn`}. Richer evaluators (`allowlist`, `typosquat`) are passed through verbatim. |
| `gate.mode` | (optional) Per-gate mode override: `monitor` or `firewall`. |

Then write `README.md` for your rule. Cover:

- **What it catches** — list the patterns with examples.
- **False positives** — be honest about edge cases that trip the rule.
- **Why it matters** — why an OpenAgentLock user would adopt this.

## 3. Validate locally

```bash
cd tools
bun install
bun run validate
bun run build-index
```

`validate` lints every rule against `schema/rule.schema.json`. `build-index` regenerates `site/data/index.json` so the search site picks up your new rule.

## 4. Open the PR

CI runs the same `validate` + `build-index` and posts a check on your PR. Once merged, GitHub Pages re-deploys the site with the new index automatically — no extra step.

## Running your own registry

If you don't want to upstream a rule (company policy, internal threat model, secrecy), publish it from your own repo:

1. Create a new repo with the same layout — `rules/`, `schema/`, `tools/`, `site/`.
2. Copy this repo's `tools/` and `schema/` directories verbatim. They are intentionally vendored, not pinned to a package, so your registry is self-contained.
3. Push to any git host. The CLI just clones a URL — it does not require GitHub.
4. On the OpenAgentLock daemon host:
   ```bash
   agentlock rules add https://github.com/your-org/your-rules.git
   agentlock rules sync
   ```
5. Optional: remove the upstream default if your environment requires bind-only-to-private behavior:
   ```bash
   agentlock rules remove openagentlock/rules
   ```

The CLI deduplicates rule ids across registries; collisions are reported at sync time. Pin a registry to a specific commit if you want bit-for-bit reproducibility:

```bash
agentlock rules add https://github.com/your-org/your-rules.git --pin <sha>
```
