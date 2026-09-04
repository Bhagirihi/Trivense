# Firebase MCP

Uses the official [Firebase MCP server](https://firebase.google.com/docs/cli/mcp-server) (`firebase-tools experimental:mcp`) to manage Firebase projects, apps, FCM, Auth, Firestore, and more from Cursor.

## Setup

1. Log in once (uses the same credentials as Firebase CLI):

   ```bash
   npx firebase-tools login
   ```

2. Reload MCP in Cursor (Settings → Tools & MCP → refresh, or restart Cursor).

The server points at `rasoi_mobile/` (Rasoi Android / FCM). Default Firebase project: `rasoi-app-prod`.

## What you can do

- List/create Firebase projects and apps
- Download SDK config (`google-services.json`)
- Send FCM test messages
- Manage Auth users, Firestore, Remote Config, Crashlytics, etc.

See `rasoi_mobile/docs/PUSH_SETUP.md` for Rasoi-specific push setup.
