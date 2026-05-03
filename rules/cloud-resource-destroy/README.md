# `rogue.cloud-resource-destroy`

Block destructive cloud-CLI commands that bypass confirmation prompts.

## What it catches

Across AWS, GCP, and Azure: any delete/terminate operation that uses a force/quiet/yes flag to skip the SDK's normal "are you sure?" prompt.

| Pattern | Why it's load-bearing |
|---|---|
| `aws s3 rb --force` | Recursively deletes a bucket and all its objects |
| `aws s3 rm --recursive s3://...` | Wipes objects from a prefix without confirmation |
| `aws ec2 terminate-instances` | Terminates EC2 (data on instance store is gone) |
| `aws rds delete-db-instance` | Catches both `--skip-final-snapshot` and the bare form |
| `aws rds delete-db-snapshot` | Removes the only recovery path |
| `aws dynamodb delete-table` | Drops a table and its data |
| `aws iam delete-*` | Wipes users/roles/policies/keys (lockout, audit gaps) |
| `aws kms schedule-key-deletion` | Schedules a CMK for deletion → encrypted data unrecoverable |
| `aws secretsmanager delete-secret` | Drops secrets (recovery window varies) |
| `aws ecr batch-delete-image` | Removes container images mid-rollout |
| `aws cloudformation delete-stack` | Tears down a whole stack |
| `gcloud ... delete --quiet` | Skips GCP's interactive confirmation |
| `gcloud projects delete` | Deletes an entire GCP project |
| `az group delete --yes` | Deletes an Azure resource group with everything in it |

## Why it matters

Cloud providers ship interactive confirmation prompts on destructive operations specifically because mistakes here are unrecoverable. The flags this rule blocks (`--force`, `--quiet`, `-q`, `--yes`, `-y`, `--skip-final-snapshot`) exist for scripted pipelines that have *already* gone through human review. An autonomous agent invoking them is the worst-case combination: no human in the loop, no rollback.

The Replit AI incident wiped data for [1,200+ executives and 1,190+ companies](https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data) during an active code freeze — the agent ran destructive commands "despite explicit instructions not to proceed without human approval". The same shape applies to any cloud CLI invocation that strips the confirmation prompt.

## False positives

- `aws s3 rm s3://bucket/key` (a single object, no `--recursive`) is **not** caught.
- `aws ec2 stop-instances` is **not** caught — stopping is reversible.
- `aws rds create-db-snapshot` followed by `aws rds delete-db-instance` is still caught on the delete. That's intentional — snapshot first, then have a human approve the delete.
- `gcloud ... delete` *without* `--quiet` will trigger the SDK's own prompt and is **not** caught here.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'aws s3 rb s3://prod-data --force'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'aws s3 ls s3://prod-data'
# expect: allow
```

## Sources

- [Replit AI Wiped Production Database — Fortune](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)
- [Incident 1152 — AI Incident Database](https://incidentdatabase.ai/cite/1152/)
