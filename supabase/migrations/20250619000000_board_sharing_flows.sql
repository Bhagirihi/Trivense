-- Board sharing: join RPC, RLS fixes for invite-by-email and delete

-- Allow invitees to read rows addressed to their email (pending invites)
DROP POLICY IF EXISTS "Can read shared items" ON public.shared_users;
CREATE POLICY "Can read shared items" ON public.shared_users FOR SELECT
  USING (
    shared_by = auth.uid()
    OR user_id = auth.uid()
    OR lower(shared_with) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Allow read for authenticated users shared" ON public.shared_users;

-- Allow inviter or invitee to remove a share link
DROP POLICY IF EXISTS "Shared users delete by inviter or invitee" ON public.shared_users;
CREATE POLICY "Shared users delete by inviter or invitee" ON public.shared_users FOR DELETE
  USING (shared_by = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Shared users update by inviter or invitee" ON public.shared_users;
CREATE POLICY "Shared users update by inviter or invitee" ON public.shared_users FOR UPDATE
  USING (
    shared_by = auth.uid()
    OR user_id = auth.uid()
    OR lower(shared_with) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

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
