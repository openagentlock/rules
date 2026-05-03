# `rogue.terraform-destroy`

Block `terraform destroy` and auto-approved Terraform / OpenTofu applies.

## What it catches

| Pattern | Example |
|---|---|
| `terraform destroy` | `terraform destroy -auto-approve` |
| `terraform apply -auto-approve` | `terraform apply -auto-approve` |
| `terraform apply -destroy` | `terraform apply -destroy -target=...` |
| OpenTofu equivalents | `tofu destroy`, `tofu apply -auto-approve` |

## Why it matters

In the [DataTalks.Club incident](https://alexeyondata.substack.com/p/how-i-dropped-our-production-database) (Aug 2025), Claude Code was migrating a project to AWS using Terraform. The state file wasn't uploaded, so the agent created duplicate resources. When the real state file finally landed, the agent — taking the new state file as the source of truth — ran `terraform destroy` to bring the environment "into alignment". It deleted the database, VPC, ECS cluster, load balancers, bastion host, and all automated backups. **2.5 years of student data vanished.**

The pattern generalises:

1. Agent has incomplete or stale state.
2. Agent reasons that the right next step is to "clean up" or "reconcile".
3. `-auto-approve` removes the only confirmation step Terraform offers.
4. Production is gone.

`-auto-approve` is the load-bearing footgun. With it, Terraform applies a plan without showing it to a human. There is no agent workflow where this is the right call — operator approval should always gate destructive plans.

## False positives

- `terraform plan -destroy` is **not** caught — plan-only invocations are safe.
- `terraform destroy` against a dev workspace is caught. That's intentional. Mint a session with monitor mode for dev work, or fork this rule and add a positive workspace whitelist.
- CI/CD pipelines that legitimately run `terraform apply -auto-approve` are caught. Run those outside the agent context — the agent should propose the plan, not execute it.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'terraform destroy -auto-approve'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'terraform plan'
# expect: allow
```

## Sources

- [How I Dropped Our Production Database — Alexey Grigorev](https://alexeyondata.substack.com/p/how-i-dropped-our-production-database)
- [Claude Code Terraform Destroy Incident — Vibe Graveyard](https://vibegraveyard.ai/story/claude-code-terraform-datatalks-infrastructure-destruction/)
