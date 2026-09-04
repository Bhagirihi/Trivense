# EAS production env (money path)

`eas.json` production `env` only sets `SENTRY_DISABLE_AUTO_UPLOAD`.
**RevenueCat + AdMob keys must live in EAS Environment Variables** (or a local `.env` synced up).

## Sync from local `.env`

1. Fill `.env` from `.env.example` (never commit `.env`).
2. Run:

```bash
node scripts/sync-eas-production-env.js
```

That upserts the keys listed in the script (Supabase, RevenueCat, AdMob, Sentry, Firebase).

## Minimum for live IAP + ads

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Play Billing via RevenueCat |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | App Store via RevenueCat (when shipping iOS) |
| `EXPO_PUBLIC_ADMOB_*` | Production ad units |
| `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Backend |

After sync, rebuild: `eas build --profile production --platform android`.

Confirm Play Console products match `STORE_PRODUCT_IDS` / RevenueCat offerings before calling Premium “live”.
