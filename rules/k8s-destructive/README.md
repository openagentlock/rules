# `rogue.k8s-destructive`

Block destructive `kubectl` and `helm` operations that an agent should never perform without human review.

## What it catches

| Pattern | Why |
|---|---|
| `kubectl delete --all` / `--all-namespaces` | Bulk-deletes every resource of a kind |
| `kubectl delete namespace <ns>` | Cascades through every resource in the namespace |
| `kubectl delete pv` / `pvc` | **Data loss** — persistent volumes hold state |
| `kubectl delete secret` | Instant outage for any workload depending on it |
| `kubectl delete --force --grace-period=0` | Skips graceful shutdown, can corrupt state |
| `kubectl delete crd` | Cascades to every CR of that kind |
| `kubectl drain --force` | Evicts all pods including those without controllers |
| `kubectl scale --replicas=0` | Soft-outage, but agent-friendly footgun |
| `kubectl exec ... -- rm -rf` | Ad-hoc destruction inside a pod |
| `helm uninstall` / `helm delete` | Tears down a whole release |
| `kubeadm reset`, `k3s uninstall` | Wipes the control plane |

## Why it matters

Kubernetes secrets aren't soft-deleted. The [official docs and operator guides](https://www.plural.sh/blog/kubectl-delete-secrets-guide/) are explicit: *"Deleting a Secret in Kubernetes is immediate and irreversible — the object is removed from etcd without a grace period or finalizers, and any workload that depends on it is now in an invalid state."*

PVCs/PVs are the same story: deletion semantics depend on the reclaim policy, and `Delete` is the default for many storage classes — meaning the underlying disk is wiped along with the object.

For agents: the failure mode is overconfident "cleanup". An agent that can't tell stale resources from live ones (the same failure mode that drove the [DataTalks.Club terraform-destroy incident](https://alexeyondata.substack.com/p/how-i-dropped-our-production-database)) will reach for `delete --all` to "reset". That's an outage.

## False positives

- `kubectl delete pod <name>` (single named pod) is **not** caught — pods are designed to be recreated.
- `kubectl delete deployment <name>` (single named deployment) is **not** caught.
- `kubectl get`, `kubectl describe`, `kubectl logs` — never caught, all read-only.
- `helm uninstall` of a dev release is caught. Use a dev cluster context with monitor mode if you need this in agent flows.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'kubectl delete namespace prod'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'kubectl get pods -A'
# expect: allow
```

## Sources

- [The Complete Guide to `kubectl delete secret` — Plural](https://www.plural.sh/blog/kubectl-delete-secrets-guide/)
- [Securing Autonomous AI Agents on Kubernetes — InfoQ](https://www.infoq.com/articles/securing-autonomous-ai-agents-kubernetes/)
