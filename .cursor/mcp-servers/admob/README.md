# AdMob MCP (Trivense)

Local MCP server for the [Google AdMob API](https://developers.google.com/admob/api). Use from Cursor to **list apps/ad units**, **create Trivense ad units**, and pull earnings reports.

- **Publisher:** `pub-4173581536398147`
- **Trivense console:** https://admob.google.com/v2/apps/5149530682/adunits/list
- **Package:** `com.trivense.app`
- **Google account:** `my.website.email2@gmail.com`

## One-time setup

1. **Google Cloud** — enable **AdMob API** on `trivense-app-prod`
2. **OAuth Desktop client** → download JSON →  
   `.cursor/mcp-servers/admob/credentials/client_secret.json`
3. **Auth** (browser opens):
   ```bash
   .cursor/mcp-servers/admob/run.sh auth
   ```

## Create Trivense ad units

Creates (or reuses) these units and writes IDs to `.env`:

| Unit | Format | Env var |
|------|--------|---------|
| Trivense Banner Home | BANNER | `EXPO_PUBLIC_ADMOB_ANDROID_BANNER` |
| Trivense Interstitial Expense | INTERSTITIAL | `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL` |
| Trivense App Open | APP_OPEN | `EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN` |

```bash
npm run create:admob-units
# or
.cursor/mcp-servers/admob/run.sh --create-trivense-units
```

If API returns **403** (limited create access), create units manually in the [AdMob console](https://admob.google.com/v2/apps/5149530682/adunits/list) then run `npm run admob:check`.

## MCP tools

| Tool | Purpose |
|------|---------|
| `admob_auth_status` | Credentials + publisher |
| `admob_list_apps` | All AdMob apps |
| `admob_find_trivense_app` | Find `com.trivense.app` |
| `admob_list_ad_units` | List units (filter by app ID) |
| `admob_create_ad_unit` | Create one unit via API |
| `admob_create_trivense_ad_units` | Create all 3 + optional `.env` |
| `admob_trivense_config` | Project file paths |
| `admob_network_report` | Earnings report |

Restart Cursor after changing this server.
