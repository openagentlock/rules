# `rogue.docker-prune`

Block destructive Docker (and Podman) prune / bulk-removal commands.

## What it catches

| Pattern | Why |
|---|---|
| `docker system prune -a -f` | Removes all stopped containers, unused networks, dangling and unused images, and (with `-a`) every image not used by a container |
| `docker volume prune -f` / `docker volume rm` | **Data loss** — volumes are where databases and uploads live |
| `docker image prune -a` | Drops images, breaking subsequent `docker run` |
| `docker rm -f $(docker ps -aq)` | Force-removes every container, running or not |
| `docker rmi -f $(docker images -q)` | Wipes the local image cache |
| `docker compose down -v` | The `-v` flag removes named volumes — silent data loss |
| `podman ... prune` | Same shapes for Podman |

## Why it matters

`docker compose down -v` is the canonical footgun. Without `-v` it's reversible; with `-v` your Postgres data is gone. An agent debugging "why won't this come up?" by running `docker compose down -v && docker compose up -d` has just wiped the database.

`docker system prune -a -f` is the agent-as-janitor shape. Disk full → "let me free space" → all images gone → next `docker run` re-pulls (wasting bandwidth, breaking offline workflows) or fails (image was a local build).

This rule treats *all* prunes as deny. Pruning is a human-judgement operation: which images do I still need? Which volumes are stale? An agent shouldn't decide.

## False positives

- `docker rm <named-container>` (a single specific container) is **not** caught.
- `docker rmi <named-image>` (a single specific image) is **not** caught.
- `docker compose down` (without `-v`) is **not** caught — volumes are preserved.
- `docker stop` is never caught.

If your CI pipeline legitimately needs `docker system prune -a -f`, run it outside the agent context.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash --command 'docker system prune -a -f'
# expect: deny

agentlock fake-hook --session <id> --tool Bash --command 'docker compose down'
# expect: allow

agentlock fake-hook --session <id> --tool Bash --command 'docker compose down -v'
# expect: deny
```
