-- Referral rewards: track signups + grant 7-day premium trials

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  reward_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view referrals they made" ON public.referrals;
CREATE POLICY "Users can view referrals they made" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.grant_referral_premium(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.user_subscriptions%ROWTYPE;
  v_new_expires TIMESTAMPTZ;
  v_is_store_paid BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_days < 1 THEN
    RETURN;
  END IF;

  SELECT * INTO v_sub FROM public.user_subscriptions WHERE user_id = p_user_id;

  v_is_store_paid := v_sub.id IS NOT NULL
    AND v_sub.plan IN ('monthly', 'yearly')
    AND v_sub.status = 'active'
    AND (v_sub.expires_at IS NULL OR v_sub.expires_at > NOW())
    AND v_sub.store_product_id IS NOT NULL
    AND v_sub.store_product_id NOT LIKE 'referral_%';

  IF v_is_store_paid THEN
    v_new_expires := GREATEST(COALESCE(v_sub.expires_at, NOW()), NOW()) + (p_days || ' days')::interval;
    UPDATE public.user_subscriptions
    SET expires_at = v_new_expires, updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    v_new_expires := GREATEST(COALESCE(v_sub.expires_at, NOW()), NOW()) + (p_days || ' days')::interval;

    INSERT INTO public.user_subscriptions (
      user_id, plan, status, started_at, expires_at, store_product_id, updated_at
    )
    VALUES (
      p_user_id,
      'monthly',
      'active',
      NOW(),
      v_new_expires,
      'referral_reward',
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan = CASE
        WHEN user_subscriptions.store_product_id IS NOT NULL
          AND user_subscriptions.store_product_id NOT LIKE 'referral_%'
          AND user_subscriptions.status = 'active'
          AND (user_subscriptions.expires_at IS NULL OR user_subscriptions.expires_at > NOW())
        THEN user_subscriptions.plan
        ELSE 'monthly'
      END,
      status = 'active',
      expires_at = GREATEST(COALESCE(user_subscriptions.expires_at, NOW()), NOW()) + (p_days || ' days')::interval,
      store_product_id = CASE
        WHEN user_subscriptions.store_product_id IS NOT NULL
          AND user_subscriptions.store_product_id NOT LIKE 'referral_%'
        THEN user_subscriptions.store_product_id
        ELSE 'referral_reward'
      END,
      updated_at = NOW();
  END IF;

  UPDATE public.profiles
  SET current_plan = 'premium', updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_referral_premium(UUID, INTEGER) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_referrer public.profiles%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_reward_days INTEGER := 7;
  v_referral_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code = '' OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.referred_by IS NOT NULL THEN
    RAISE EXCEPTION 'You have already used a referral code';
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_user_id) THEN
    RAISE EXCEPTION 'You have already used a referral code';
  END IF;

  IF v_profile.created_at < NOW() - INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Referral codes can only be applied within 7 days of signup';
  END IF;

  SELECT * INTO v_referrer
  FROM public.profiles
  WHERE upper(trim(referral_code)) = v_code
  LIMIT 1;

  IF v_referrer.id IS NULL THEN
    RAISE EXCEPTION 'Referral code not found';
  END IF;

  IF v_referrer.id = v_user_id THEN
    RAISE EXCEPTION 'You cannot use your own referral code';
  END IF;

  INSERT INTO public.referrals (
    referrer_id,
    referred_user_id,
    referral_code_used,
    reward_days
  )
  VALUES (
    v_referrer.id,
    v_user_id,
    v_code,
    v_reward_days
  )
  RETURNING id INTO v_referral_id;

  UPDATE public.profiles
  SET referred_by = v_referrer.id, updated_at = NOW()
  WHERE id = v_user_id;

  PERFORM public.grant_referral_premium(v_user_id, v_reward_days);
  PERFORM public.grant_referral_premium(v_referrer.id, v_reward_days);

  RETURN jsonb_build_object(
    'referral_id', v_referral_id,
    'referrer_name', COALESCE(v_referrer.full_name, v_referrer.email_address),
    'reward_days', v_reward_days,
    'message', format('You and %s each received %s days of Premium!',
      COALESCE(v_referrer.full_name, 'your friend'), v_reward_days)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'full_name', COALESCE(p.full_name, 'New user'),
        'email', p.email_address,
        'joined_at', r.created_at,
        'reward_days', r.reward_days
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.referrals r
  JOIN public.profiles p ON p.id = r.referred_user_id
  WHERE r.referrer_id = v_user_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_referrals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
