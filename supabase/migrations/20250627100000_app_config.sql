-- Remote app config (read by mobile clients; written via admin service role)

CREATE TABLE IF NOT EXISTS public.app_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payments_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_config (id, payments_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_public_read"
  ON public.app_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.app_config IS 'Global app flags. payments_enabled=false hides paywall and unlocks premium features on mobile.';
