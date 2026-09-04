-- Secure subscription activation: only service role (webhooks) may grant premium plans.

REVOKE ALL ON FUNCTION public.activate_subscription(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.activate_subscription(TEXT) FROM anon;

CREATE OR REPLACE FUNCTION public.activate_subscription_from_store(
  p_user_id UUID,
  p_plan TEXT,
  p_store_product_id TEXT DEFAULT NULL,
  p_store_transaction_id TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_expires_at TIMESTAMPTZ;
  v_profile_plan TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  v_plan := lower(trim(p_plan));
  IF v_plan NOT IN ('free', 'monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END IF;

  IF v_plan = 'free' THEN
    v_expires_at := NULL;
    v_profile_plan := 'free';
  ELSIF v_plan = 'monthly' THEN
    v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '1 month');
    v_profile_plan := 'premium';
  ELSE
    v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '1 year');
    v_profile_plan := 'premium';
  END IF;

  INSERT INTO public.user_subscriptions (
    user_id,
    plan,
    status,
    started_at,
    expires_at,
    cancelled_at,
    store_product_id,
    store_transaction_id,
    updated_at
  )
  VALUES (
    p_user_id,
    v_plan,
    'active',
    NOW(),
    v_expires_at,
    NULL,
    p_store_product_id,
    p_store_transaction_id,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    started_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    cancelled_at = NULL,
    store_product_id = EXCLUDED.store_product_id,
    store_transaction_id = EXCLUDED.store_transaction_id,
    updated_at = NOW();

  UPDATE public.profiles
  SET current_plan = v_profile_plan, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'status', 'active',
    'expires_at', v_expires_at,
    'current_plan', v_profile_plan
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_subscription_from_store(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_subscription_from_store(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
