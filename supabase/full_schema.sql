-- =============================================================================
-- Trivense / TripExpanse - Full Supabase schema
-- Run this in a NEW Supabase project (SQL Editor) to set up the database.
-- Do NOT run on an existing project without backing up first.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE shared_status AS ENUM ('accepted', 'pending', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLES (order respects FK dependencies)
-- =============================================================================

-- 1. Profiles (id = auth.users.id, created by trigger on signup)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email_address TEXT,
  mobile TEXT,
  avatar_url TEXT,
  has_notifications BOOLEAN DEFAULT false,
  is2FA BOOLEAN DEFAULT false,
  current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'premium', 'business')),
  is_google_connected BOOLEAN DEFAULT false,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  total_boards INTEGER DEFAULT 0,
  default_board_budget NUMERIC(10,2) DEFAULT 0,
  board_id UUID,
  referral_code TEXT,
  expo_push_token VARCHAR(255)
);

-- 2. Expense boards (created_by = profiles.id; board_id on profiles added later)
CREATE TABLE IF NOT EXISTS public.expense_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_budget NUMERIC(10,2) DEFAULT 0,
  total_expense NUMERIC(10,2) DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  board_color TEXT,
  board_icon TEXT,
  per_person_budget NUMERIC(10,2),
  share_code TEXT,
  is_default BOOLEAN DEFAULT false
);

-- Link profiles.default board to expense_boards
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_board_id
  FOREIGN KEY (board_id) REFERENCES public.expense_boards(id)
  DEFERRABLE INITIALLY DEFERRED;

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.expense_boards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  payment_method TEXT
);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  trip_name TEXT,
  read BOOLEAN DEFAULT false,
  icon TEXT,
  icon_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Shared users (board sharing)
CREATE TABLE IF NOT EXISTS public.shared_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with TEXT NOT NULL,
  board_id UUID NOT NULL REFERENCES public.expense_boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_expense NUMERIC(10,2) DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  status shared_status NOT NULL DEFAULT 'pending'
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email_address);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_board_id ON public.profiles(board_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_boards_created_by ON public.expense_boards(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_board_id ON public.expenses(board_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_users_board_id ON public.shared_users(board_id);
CREATE INDEX IF NOT EXISTS idx_shared_users_shared_by ON public.shared_users(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_users_user_id ON public.shared_users(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_users ENABLE ROW LEVEL SECURITY;

-- Profiles: own profile + allow read for shared board members
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Allow read if related via shared_users" ON public.profiles;
CREATE POLICY "Allow read if related via shared_users" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shared_users su
    WHERE su.user_id = profiles.id
    AND (su.shared_by = auth.uid() OR su.user_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Allow read board owner for shared members" ON public.profiles;
CREATE POLICY "Allow read board owner for shared members" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.expense_boards eb
    JOIN public.shared_users su ON su.board_id = eb.id
    WHERE eb.created_by = profiles.id
      AND su.user_id = auth.uid()
      AND su.is_accepted = true
  )
);
DROP POLICY IF EXISTS "Allow read co-members on shared boards" ON public.profiles;
CREATE POLICY "Allow read co-members on shared boards" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.shared_users su_self
    JOIN public.shared_users su_other ON su_other.board_id = su_self.board_id
    WHERE su_self.user_id = auth.uid()
      AND su_self.is_accepted = true
      AND su_other.user_id = profiles.id
      AND su_other.is_accepted = true
  )
);

-- Expense boards: owner + shared (accepted) users
DROP POLICY IF EXISTS "Allow owners to manage their boards" ON public.expense_boards;
CREATE POLICY "Allow owners to manage their boards" ON public.expense_boards FOR ALL
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Allow access to shared boards" ON public.expense_boards;
CREATE POLICY "Allow access to shared boards" ON public.expense_boards FOR SELECT USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.shared_users su
    WHERE su.board_id = expense_boards.id AND su.user_id = auth.uid() AND su.is_accepted = true
  )
);

-- Categories: own + default
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can view categories on accessible boards" ON public.categories;
CREATE POLICY "Users can view categories on accessible boards" ON public.categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.expense_boards eb ON eb.id = e.board_id
      WHERE e.category_id = categories.id
        AND (
          eb.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.shared_users su
            WHERE su.board_id = eb.id
              AND su.user_id = auth.uid()
              AND su.is_accepted = true
          )
        )
    )
  );
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
CREATE POLICY "Users can insert their own categories" ON public.categories FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;
CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING (user_id = auth.uid());

-- Expenses: board owner or accepted shared user
DROP POLICY IF EXISTS "Allow access to board owner or accepted shared user" ON public.expenses;
CREATE POLICY "Allow access to board owner or accepted shared user" ON public.expenses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.expense_boards eb
    WHERE eb.id = expenses.board_id AND eb.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shared_users su
    WHERE su.board_id = expenses.board_id AND su.user_id = auth.uid() AND su.is_accepted = true
  )
);
DROP POLICY IF EXISTS "Users can insert expenses in their boards" ON public.expenses;
CREATE POLICY "Users can insert expenses in their boards" ON public.expenses FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expense_boards eb
    WHERE eb.id = expenses.board_id AND (eb.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.shared_users su
      WHERE su.board_id = eb.id AND su.user_id = auth.uid() AND su.is_accepted = true
    ))
  )
);
DROP POLICY IF EXISTS "Users can update expenses in their boards" ON public.expenses;
CREATE POLICY "Users can update expenses in their boards" ON public.expenses FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.expense_boards eb
    WHERE eb.id = expenses.board_id AND (eb.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.shared_users su
      WHERE su.board_id = eb.id AND su.user_id = auth.uid() AND su.is_accepted = true
    ))
  )
);
DROP POLICY IF EXISTS "Users can delete expenses in their boards" ON public.expenses;
CREATE POLICY "Users can delete expenses in their boards" ON public.expenses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.expense_boards eb
    WHERE eb.id = expenses.board_id AND (eb.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.shared_users su
      WHERE su.board_id = eb.id AND su.user_id = auth.uid() AND su.is_accepted = true
    ))
  )
);

-- Notifications: own only
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Shared users: inviter or invitee
DROP POLICY IF EXISTS "Can read shared items" ON public.shared_users;
CREATE POLICY "Can read shared items" ON public.shared_users FOR SELECT
  USING (
    shared_by = auth.uid()
    OR user_id = auth.uid()
    OR lower(shared_with) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
DROP POLICY IF EXISTS "Allow read for authenticated users shared" ON public.shared_users;
DROP POLICY IF EXISTS "Shared users insert by inviter" ON public.shared_users;
CREATE POLICY "Shared users insert by inviter" ON public.shared_users FOR INSERT WITH CHECK (shared_by = auth.uid());
DROP POLICY IF EXISTS "Shared users update by inviter or invitee" ON public.shared_users;
CREATE POLICY "Shared users update by inviter or invitee" ON public.shared_users FOR UPDATE
  USING (
    shared_by = auth.uid()
    OR user_id = auth.uid()
    OR lower(shared_with) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
DROP POLICY IF EXISTS "Shared users delete by inviter or invitee" ON public.shared_users;
CREATE POLICY "Shared users delete by inviter or invitee" ON public.shared_users FOR DELETE
  USING (shared_by = auth.uid() OR user_id = auth.uid());

-- =============================================================================
-- FUNCTIONS (do not override auth.uid/role/email - Supabase provides them)
-- =============================================================================

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When expense_boards.total_budget changes, sync to profiles.default_board_budget
CREATE OR REPLACE FUNCTION public.update_profiles_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.total_budget IS DISTINCT FROM NEW.total_budget THEN
    UPDATE public.profiles SET default_board_budget = NEW.total_budget WHERE board_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- When profiles.board_id changes, sync default_board_budget from the new board
CREATE OR REPLACE FUNCTION public.sync_budget_on_board_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.board_id IS DISTINCT FROM NEW.board_id AND NEW.board_id IS NOT NULL THEN
    UPDATE public.profiles
    SET default_board_budget = (SELECT total_budget FROM public.expense_boards WHERE id = NEW.board_id)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep expense_boards.total_expense in sync with expenses
CREATE OR REPLACE FUNCTION public.update_board_total_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.expense_boards SET total_expense = total_expense - OLD.amount + NEW.amount WHERE id = NEW.board_id;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE public.expense_boards SET total_expense = total_expense + NEW.amount WHERE id = NEW.board_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.expense_boards SET total_expense = total_expense - OLD.amount WHERE id = OLD.board_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Notification helpers
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications SET "read" = true WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications SET "read" = true WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Single RETURN (subquery) — no DECLARE, so batch splitters in SQL Editor cannot break this.
-- Quote "read" — reserved word; qualify with table alias.
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(target_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications AS n
    WHERE n.user_id = target_user_id AND COALESCE(n."read", false) = false
  );
END;
$$ LANGUAGE plpgsql;

-- Join a board via share_code or board UUID (invite link flow)
CREATE OR REPLACE FUNCTION public.join_expense_board(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_board public.expense_boards%ROWTYPE;
  v_existing public.shared_users%ROWTYPE;
  v_code TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  v_code := upper(trim(p_code));

  SELECT * INTO v_board
  FROM public.expense_boards
  WHERE id::text = trim(p_code)
     OR upper(trim(share_code)) = v_code
  LIMIT 1;

  IF v_board.id IS NULL THEN
    RAISE EXCEPTION 'Board not found';
  END IF;

  IF v_board.created_by = v_user_id THEN
    RAISE EXCEPTION 'You already own this board';
  END IF;

  SELECT * INTO v_existing
  FROM public.shared_users
  WHERE board_id = v_board.id
    AND (user_id = v_user_id OR lower(shared_with) = lower(v_user_email))
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.is_accepted THEN
      RETURN jsonb_build_object(
        'board_id', v_board.id,
        'board_name', v_board.name,
        'already_member', true
      );
    END IF;

    UPDATE public.shared_users
    SET
      user_id = v_user_id,
      is_accepted = true,
      status = 'accepted',
      accepted_at = NOW()
    WHERE id = v_existing.id;

    RETURN jsonb_build_object(
      'board_id', v_board.id,
      'board_name', v_board.name,
      'accepted', true
    );
  END IF;

  INSERT INTO public.shared_users (
    shared_by,
    shared_with,
    board_id,
    user_id,
    is_accepted,
    status,
    accepted_at
  )
  VALUES (
    v_board.created_by,
    v_user_email,
    v_board.id,
    v_user_id,
    true,
    'accepted',
    NOW()
  );

  RETURN jsonb_build_object(
    'board_id', v_board.id,
    'board_name', v_board.name,
    'joined', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_expense_board(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_expense_board(TEXT) TO authenticated;

-- New user signup: create profile, default board, default categories
-- Order matters: expense_boards.created_by REFERENCES profiles(id), so create profile first (board_id NULL), then board, then update profile.board_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_board_id UUID;
  referral_code TEXT;
  share_code TEXT;
BEGIN
  referral_code := upper(substr(md5(NEW.id::text || gen_random_uuid()::text), 1, 8));
  share_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  default_board_id := gen_random_uuid();

  -- 1. Create profile first (board_id NULL) so expense_boards can reference profiles(id)
  INSERT INTO public.profiles (id, full_name, email_address, mobile, avatar_url, has_notifications, is2FA, current_plan, is_google_connected, account_status, total_boards, board_id, referral_code, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'has_notifications')::boolean, false),
    false,
    'free',
    COALESCE((NEW.raw_user_meta_data->>'is_google_connected')::boolean, false),
    'active',
    0,
    NULL,
    referral_code,
    NOW(),
    NOW()
  );

  -- 2. Create default board (created_by = NEW.id now exists in profiles)
  INSERT INTO public.expense_boards (id, name, description, total_budget, created_by, share_code, is_default, created_at, updated_at)
  VALUES (
    default_board_id,
    'General Expenses',
    'Default board for tracking general expenses',
    0,
    NEW.id,
    share_code,
    true,
    NOW(),
    NOW()
  );

  -- 3. Link profile to default board
  UPDATE public.profiles SET board_id = default_board_id, total_boards = 1 WHERE id = NEW.id;

  -- 4. Create default categories
  INSERT INTO public.categories (name, description, icon, color, user_id, is_default, created_at, updated_at)
  VALUES
    ('Food', 'Food and dining expenses', 'food', '#FF6B6B', NEW.id, true, NOW(), NOW()),
    ('Transport', 'Transportation costs', 'car', '#4ECDC4', NEW.id, true, NOW(), NOW()),
    ('Shopping', 'Shopping and retail', 'shopping', '#45B7D1', NEW.id, true, NOW(), NOW()),
    ('Entertainment', 'Entertainment and leisure', 'movie', '#96CEB4', NEW.id, true, NOW(), NOW()),
    ('Health', 'Health and medical expenses', 'heart', '#FFEEAD', NEW.id, true, NOW(), NOW()),
    ('Education', 'Education and learning', 'book', '#D4A5A5', NEW.id, true, NOW(), NOW()),
    ('Housing', 'Housing and utilities', 'home', '#9B59B6', NEW.id, true, NOW(), NOW()),
    ('Travel', 'Travel and tourism', 'airplane', '#3498DB', NEW.id, true, NOW(), NOW());

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_user: %', SQLERRM;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_update_profiles_budget ON public.expense_boards;
CREATE TRIGGER trg_update_profiles_budget
  AFTER UPDATE ON public.expense_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_budget();

DROP TRIGGER IF EXISTS trg_sync_budget_on_board_change ON public.profiles;
CREATE TRIGGER trg_sync_budget_on_board_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_budget_on_board_id_change();

DROP TRIGGER IF EXISTS trg_expense_insert ON public.expenses;
DROP TRIGGER IF EXISTS trg_expense_update ON public.expenses;
DROP TRIGGER IF EXISTS trg_expense_delete ON public.expenses;
CREATE TRIGGER trg_expense_insert AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_board_total_expense();
CREATE TRIGGER trg_expense_update AFTER UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_board_total_expense();
CREATE TRIGGER trg_expense_delete AFTER DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_board_total_expense();

-- =============================================================================
-- REALTIME (optional: run if you want live updates in the app)
-- =============================================================================
-- Skip this block if you prefer: Dashboard → Database → Replication → enable per table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_boards;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_users;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================
-- Next: In Authentication → URL Configuration add your app redirect URLs (e.g. trivense://verify-email, trivense://reset-password).
-- Then set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your app .env from Project Settings → API.

-- =============================================================================
-- USER SUBSCRIPTIONS (from migrations 20250620000000 + 20250621000000)
-- =============================================================================

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
    user_id, plan, status, started_at, expires_at, cancelled_at,
    store_product_id, store_transaction_id, updated_at
  )
  VALUES (
    p_user_id, v_plan, 'active', NOW(), v_expires_at, NULL,
    p_store_product_id, p_store_transaction_id, NOW()
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
