-- UPI VPA for one-tap settle (GPay / PhonePe / any UPI app).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS upi_id TEXT;

COMMENT ON COLUMN public.profiles.upi_id IS 'UPI VPA for board settlements, e.g. name@okicici';
