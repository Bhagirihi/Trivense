# Google Play Console MCP

Local MCP server for the [Google Play Developer API](https://developers.google.com/android-publisher).

**Developer:** Bhagihiri Applications  
**App:** Rasoi APP · `com.bhagihiri.rasoiapp`

Manifest (listing + subscriptions from mobile code): `rasoi_mobile/store/play-console/manifest.json`

## Important limitation

**You cannot create a brand-new Play Store developer account or app via API.** Register **Bhagihiri Applications** and create **Rasoi APP** once in [Play Console](https://play.google.com/console). Then this MCP pushes listing copy and creates subscriptions.

Full guide: `rasoi_mobile/store/play-console/SETUP.md`

## One-time setup

### 1. Create the app in Play Console (manual, once)

1. Open [Play Console](https://play.google.com/console) → **Create app**
2. Package name: **`com.bhagihiri.rasoiapp`** (must match `rasoi_mobile/app.json`)
3. Complete policy declarations and upload an AAB to internal/closed testing

### 2. Enable the API + service account

1. [Google Cloud Console](https://console.cloud.google.com/) → enable **Google Play Android Developer API**
2. **IAM → Service accounts** → create a service account → download JSON key
3. Save as `.cursor/mcp-servers/google-play/credentials/service_account.json`
4. **Play Console → Users and permissions → Invite new users**
   - Paste the service account email (`...@....iam.gserviceaccount.com`)
   - Grant at minimum:
     - View app information
     - Manage store presence
     - View financial data, orders, and cancellation survey responses
     - **Manage orders and subscriptions**

### 3. Env file

```bash
cp .cursor/mcp-servers/google-play/.env.example .cursor/mcp-servers/google-play/.env
```

Set `PLAY_REGIONS_VERSION` from the dropdown at [supported locations](https://play.google.com/supported-locations/) (e.g. `2025/01`).

### 4. Reload MCP in Cursor

Settings → Tools & MCP → refresh.

## OAuth alternative

If you prefer acting as your Google user instead of a service account:

1. Set `PLAY_AUTH_MODE=oauth` in `.env`
2. Add OAuth desktop client JSON as `credentials/client_secret.json`
3. Run `.cursor/mcp-servers/google-play/run.sh auth`

## MCP tools

| Tool | Purpose |
|------|---------|
| `play_auth_status` | Credentials + Bhagihiri / Rasoi APP config |
| `play_get_manifest` | Load manifest.json (listing + subscriptions) |
| `play_push_listing` | Push title + descriptions to Play |
| `play_full_setup` | Verify app → listing → subscriptions |
| `play_setup_guide` | Manual app creation + API wiring steps |
| `play_verify_app` | Confirm `com.bhagihiri.rasoiapp` is reachable |
| `play_list_subscriptions` | List subscription catalog |
| `play_get_subscription` | Fetch one product |
| `play_create_subscription` | Create subscription + base plan |
| `play_activate_base_plan` | Activate draft base plan |
| `play_create_rasoi_subscriptions` | Create `rasoi_plus_monthly` + `rasoi_plus_yearly` |
| `play_convert_region_prices` | INR → regional price suggestions |
| `play_rasoi_config` | Product ids + codebase paths |

## Typical flow for Rasoi

1. `play_setup_guide` — confirm steps
2. Create app manually in Play Console
3. `play_verify_app`
4. `play_create_rasoi_subscriptions` — creates ₹49/mo and ₹499/yr, activates base plans
5. Link same product ids in RevenueCat (`rasoi_plus` entitlement)

Product ids match `rasoi_mobile/constants/payments.ts`.
