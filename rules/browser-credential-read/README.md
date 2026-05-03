# `exfil.browser-credential-read`

Block reads of browser credential / cookie stores and IDE session token storage.

## What it catches

**Chromium-family (Chrome, Chromium, Edge, Brave, Arc):**
- `Login Data` — saved passwords (encrypted, but the key lives on disk)
- `Cookies` — active session cookies (full impersonation)
- `Web Data` — autofill, including credit cards
- `Local State` — encryption key wrapper

**Firefox:**
- `key4.db` — master encryption key
- `logins.json` — saved logins
- `cookies.sqlite` — session cookies
- `signedInUser.json` — Sync account state

**Safari:**
- `Cookies.binarycookies`

**Desktop apps holding live session tokens:**
- Slack (`Cookies`, `storage/`) — workspace bearer tokens
- Discord (`Local Storage/`, `Cookies`) — user tokens
- Signal (`sql/db.sqlite`) — message DB
- Cursor / VS Code (`globalStorage/`, `Local Storage/`) — Copilot/Anthropic tokens, MCP secrets, extension auth

**macOS keychain:**
- `~/Library/Keychains/login.keychain-db`

## Why it matters

These are not config files — they are **live session databases**. Reading `Cookies` from Chrome gives you the user's GitHub, Slack, Gmail, AWS console, and SaaS SSO sessions, all at once. Reading Cursor's `globalStorage/` may surface the user's stored Anthropic API key and any MCP server tokens.

Real-world relevance:

- The [Claude Code source-map leak (March 2026)](https://www.zscaler.com/blogs/security-research/anthropic-claude-code-leak) noted that Claude Code "operates at the terminal level with access to local file systems, environment variables, and critically the `~/.anthropic/config` directory where API keys live" — IDE session storage is the same trust class.
- The [Shai-Hulud npm worm](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack) harvested "credentials from the developer's machine, including npm tokens, GitHub Personal Access Tokens, and cloud service keys" — the IDE session storage class is exactly that surface.
- A prompt-injected agent reading these files is a one-step path to *full account takeover* on every web service the developer is logged into.

## False positives

- Reading `~/Library/Application Support/Google/Chrome/Default/Bookmarks` (bookmarks file) is **not** caught.
- Reading `~/Library/Application Support/Code/User/settings.json` (VS Code settings) is **not** caught — only the storage paths that hold tokens.
- Linux `gnome-keyring` and KWallet are not file-readable; this rule has no patterns for them.
- A genuine debugging session that needs to inspect Chrome's `Login Data` will be denied. Approve one-shot if the operator is intentionally doing forensics.

## Test it

```bash
agentlock fake-hook --session <id> --tool Read \
  --path '/Users/me/Library/Application Support/Google/Chrome/Default/Cookies'
# expect: deny

agentlock fake-hook --session <id> --tool Read \
  --path '/Users/me/Library/Application Support/Code/User/settings.json'
# expect: allow
```

## Sources

- [Claude Code is leaking API keys into public package registries — TechTalks](https://bdtechtalks.com/2026/04/27/claude-code-api-token-leak/)
- [Shai-Hulud npm Supply Chain Attack — Wiz](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack)
- [From .env to Leakage — Knostic](https://www.knostic.ai/blog/claude-cursor-env-file-secret-leakage)
