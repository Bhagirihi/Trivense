-- Let mobile clients pick up admin payment toggles without restart.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
