# Full Supabase schema – Trivense

Use **`full_schema.sql`** when setting up a **new** Supabase project (e.g. after restoring from a paused project or starting fresh).

## How to run

1. **Create a new project** at [supabase.com](https://supabase.com) (or use an empty project).
2. Open **SQL Editor** in the dashboard.
3. Copy the entire contents of **`full_schema.sql`** and paste into a new query.
4. Click **Run**. Wait until it finishes without errors.
5. **Auth:** In **Authentication → URL Configuration**, add redirect URLs if you use deep links, e.g.:
   - `trivense://verify-email`
   - `trivense://reset-password`
6. **App:** In **Project Settings → API** copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
   Put these in your app’s `.env` (and EAS env for production).

## What the schema creates

- **Tables:** `profiles`, `expense_boards`, `categories`, `expenses`, `notifications`, `shared_users`
- **RLS:** Row Level Security and policies so users only see their own or shared data
- **Trigger:** On signup (`auth.users` insert), creates a profile, default “General Expenses” board, and default categories
- **Triggers:** Keep `expense_boards.total_expense` and `profiles.default_board_budget` in sync with data
- **Realtime:** Adds the listed tables to the `supabase_realtime` publication so the app can subscribe to changes

## Restoring from a backup

If you are **restoring from the paused TripExpenseTracker backup**:

1. Download the backup from the paused project (dashboard recovery options).
2. Create a **new** Supabase project.
3. Run **`full_schema.sql`** in the new project first (creates empty schema).
4. Then restore your **data** (e.g. run the backup SQL that contains `INSERT`/data, or use Supabase’s “Restore to new project” if offered).

If your backup is a full dump that already includes tables, run the backup **instead of** `full_schema.sql`, or run the backup and then run only the RLS/policies and triggers part of `full_schema.sql` if the backup didn’t include them.
