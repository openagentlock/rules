# `rogue.sql-mass-mutation`

Block mass-mutation SQL and NoSQL commands that wipe entire tables, schemas, or databases.

## What it catches

| Pattern | Example |
|---|---|
| `TRUNCATE [TABLE] <name>` | `psql -c "TRUNCATE users"` |
| `DROP DATABASE`, `DROP SCHEMA` | `psql -c "DROP DATABASE prod"` |
| `DROP USER`, `DROP ROLE` | Auth/identity wipe |
| `DELETE FROM <table>;` (no WHERE) | `psql -c "DELETE FROM users;"` |
| `DELETE … WHERE 1=1` / `WHERE TRUE` | Common SQL-injection / agent-bypass shape |
| `UPDATE … WHERE 1=1` / `WHERE TRUE` | Mass-update without filter |
| Mongo `dropDatabase()`, `deleteMany({})`, `remove({})` | NoSQL equivalents |
| Redis `FLUSHALL` / `FLUSHDB` | Wipes one or all logical databases |

## Why it matters

The [Replit AI incident (July 2025)](https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data): an AI agent wiped production data for **1,200+ executives and 1,190+ companies** during an active code freeze, "panicking in response to empty queries" and violating explicit instructions not to proceed without human approval. The CEO apologised; new safeguards now separate dev and prod databases.

The shape of the failure: an unconfirmed mutation against a production connection. A single `TRUNCATE` or `DELETE FROM users;` (note the trailing semicolon and no WHERE) is enough.

This rule complements the existing `rogue.destructive-bash`, which only catches literal `DROP TABLE`. Real destructive shapes are wider: `TRUNCATE` is faster than DELETE and is what an agent reaches for to "reset"; `DELETE FROM x;` looks innocuous in a one-liner; Mongo's `deleteMany({})` is the same shape with a different syntax; Redis `FLUSHALL` wipes every logical DB.

## False positives

- `DELETE FROM users WHERE id = 5` — **not** caught (has a real predicate).
- `TRUNCATE` inside a multi-statement migration script run via `psql -f file.sql` is **not** caught — the regex matches inline `-c` invocations and stdin/heredoc piping. Migration scripts go through code review.
- `DROP TABLE foo` (single table) is caught by the existing `rogue.destructive-bash`, not by this rule.
- `DROP DATABASE IF EXISTS test_db` in a test setup is caught. Use monitor mode for dev workflows or approve one-shot.

## False positives that are intentional

- `WHERE 1=1` and `WHERE TRUE` are common SQL-injection bypass shapes. Even when written by hand, an agent should not be running them.
- `dropDatabase()` against any Mongo instance is treated as destructive. There is no per-host distinction in RE2.

## Test it

```bash
agentlock fake-hook --session <id> --tool Bash \
  --command 'psql -c "TRUNCATE users CASCADE"'
# expect: deny

agentlock fake-hook --session <id> --tool Bash \
  --command 'psql -c "SELECT count(*) FROM users"'
# expect: allow
```

## Sources

- [Replit AI Wiped Production Database — Fortune](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)
- [Incident 1152 — AI Incident Database](https://incidentdatabase.ai/cite/1152/)
- [Vibe coding service Replit deleted production database — The Register](https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/)
