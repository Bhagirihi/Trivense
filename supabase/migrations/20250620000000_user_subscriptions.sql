-- User subscriptions for Free / Monthly / Yearly plans

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  store_product_id TEXT,
  store_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activate or change plan (app purchase flow; replace with store webhook in production)
CREATE OR REPLACE FUNCTION public.activate_subscription(p_plan TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_plan TEXT;
  v_expires_at TIMESTAMPTZ;
  v_profile_plan TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_plan := lower(trim(p_plan));
  IF v_plan NOT IN ('free', 'monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END IF;

  IF v_plan = 'free' THEN
    v_expires_at := NULL;
    v_profile_plan := 'free';
  ELSIF v_plan = 'monthly' THEN
    v_expires_at := NOW() + INTERVAL '1 month';
    v_profile_plan := 'premium';
  ELSE
    v_expires_at := NOW() + INTERVAL '1 year';
    v_profile_plan := 'premium';
  END IF;

  INSERT INTO public.user_subscriptions (
    user_id, plan, status, started_at, expires_at, cancelled_at, updated_at
  )
  VALUES (
    v_user_id,
    v_plan,
    CASE WHEN v_plan = 'free' THEN 'active' ELSE 'active' END,
    NOW(),
    v_expires_at,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    started_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    cancelled_at = NULL,
    updated_at = NOW();

  UPDATE public.profiles
  SET current_plan = v_profile_plan, updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'status', 'active',
    'expires_at', v_expires_at,
    'current_plan', v_profile_plan
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_subscription(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_subscription(TEXT) TO authenticated;

-- Effective plan helper (handles expiry)
CREATE OR REPLACE FUNCTION public.get_effective_subscription(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.user_subscriptions%ROWTYPE;
  v_effective_plan TEXT := 'free';
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'status', 'active', 'is_premium', false);
  END IF;

  SELECT * INTO v_sub FROM public.user_subscriptions WHERE user_id = p_user_id;

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object(
      'plan', 'free',
      'status', 'active',
      'is_premium', false,
      'expires_at', NULL
    );
  END IF;

  IF v_sub.plan IN ('monthly', 'yearly')
     AND v_sub.status = 'active'
     AND (v_sub.expires_at IS NULL OR v_sub.expires_at > NOW()) THEN
    v_effective_plan := v_sub.plan;
  ELSE
    v_effective_plan := 'free';
  END IF;

  RETURN jsonb_build_object(
    'plan', v_effective_plan,
    'status', v_sub.status,
    'is_premium', v_effective_plan IN ('monthly', 'yearly'),
    'expires_at', v_sub.expires_at,
    'started_at', v_sub.started_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_subscription(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_subscription(UUID) TO authenticated;
