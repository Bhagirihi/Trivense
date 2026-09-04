# Hostinger MCP

Uses [hostinger-api-mcp](https://www.npmjs.com/package/hostinger-api-mcp) to manage Hostinger websites, VPS, domains, DNS, and more from Cursor.

**Requires Node.js 24+** (`node -v`).

## Setup

1. Generate an API token in **hPanel → Account → API** (or use OAuth — see below).
2. Copy `.env.example` → `.env` and set `HOSTINGER_API_TOKEN`.
3. Reload MCP in Cursor (Settings → Tools & MCP → refresh, or restart Cursor).

**OAuth alternative** (no token file):

```bash
npx hostinger-api-mcp --login
```

## What you can do

- Manage websites, VPS, domains, DNS records
- Billing and subscription info
- Email marketing / Reach tools (if enabled in hPanel)

- Domain: **rasoiapplication.in** (Hostinger) → see [`docs/HOSTINGER.md`](../../docs/HOSTINGER.md)
