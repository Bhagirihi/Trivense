# Trivense Marketing Website

Next.js landing page for **Trivense** — expense tracking for trips and shared budgets.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (optional waitlist storage)

## Pages

| Section | Description |
|---------|-------------|
| Hero | Product pitch + app preview mockup |
| Features | Boards, sharing, analytics, budgets |
| How it works | 4-step onboarding flow |
| Pricing | Free / Premium / Yearly (matches mobile app) |
| FAQ | Common questions |
| Waitlist | Email capture → Supabase `website_waitlist` |

## Setup

```bash
cd website
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase waitlist

1. Apply migration in the parent project:

   ```bash
   # From repo root — or run SQL in Supabase Dashboard
   supabase db push
   ```

   Migration file: `supabase/migrations/20250620100000_website_waitlist.sql`

2. Add to `website/.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Without Supabase, the waitlist API still returns success and logs emails to the server console (dev only).

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Deploy

Deploy to [Vercel](https://vercel.com) with root directory `website` and the env vars above.

```bash
npm run build
```
