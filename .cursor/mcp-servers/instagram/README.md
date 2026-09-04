# Instagram MCP (username/password)

Posts to `@rasoi_app` using [instagrapi](https://github.com/subzeroid/instagrapi) with credentials stored in a local `.env` file.

## Setup

1. Copy env template:
   ```bash
   cp .cursor/mcp-servers/instagram/.env.example .cursor/mcp-servers/instagram/.env
   ```
2. Set `INSTAGRAM_USERNAME` and `INSTAGRAM_PASSWORD` in `.env`.
3. Reload MCP in Cursor (Settings → MCP → refresh).

If Instagram asks for 2FA or a challenge, set `INSTAGRAM_VERIFICATION_CODE` in `.env` and retry once.

### GitHub Actions (scheduled posts)

CI cannot complete a fresh Instagram login (Meta flags datacenter IPs). Use a cached session:

```bash
# 1. Log in locally once (creates instagram_session.json)
.cursor/mcp-servers/instagram/run.sh

# 2. Upload session to GitHub secrets
.cursor/mcp-servers/instagram/export-instagram-session.sh
```

Re-run the export script if the workflow fails with "session expired" or login challenge.

## Tools

| Tool | Description |
|------|-------------|
| `instagram_account_status` | Verify login + account info |
| `instagram_publish_photo` | Post a local image now |
| `instagram_campaign_overview` | List 59 ad posts + schedule |
| `instagram_publish_campaign_post` | Publish one ad by id (1–59) |
| `instagram_publish_due_campaign_posts` | Auto-post due ads |
| `instagram_schedule_custom_post` | Queue a one-off post |
| `instagram_list_custom_schedule` | View custom queue |
| `instagram_publish_due_custom_posts` | Publish due custom posts |

Campaign images: `docs/marketing/ad-images/`  
Schedule starts **17 Jun 2026, 10 AM IST**, one post per day.

## CLI (cron)

```bash
.cursor/mcp-servers/instagram/run.sh run-due
.cursor/mcp-servers/instagram/run.sh run-due --dry-run
```

## Notes

- Uses unofficial Instagram login — may break if Meta changes auth.
- Session is cached in `instagram_session.json` (gitignored).
- Never commit `.env` or session files.
