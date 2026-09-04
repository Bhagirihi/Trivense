-- Website waitlist signups (marketing site)
CREATE TABLE IF NOT EXISTS public.website_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  source text DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from the marketing site (anon key + this policy)
CREATE POLICY "Anyone can join waitlist"
  ON public.website_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role / admins should read waitlist rows (no public SELECT policy)
