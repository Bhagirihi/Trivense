-- Let shared board members read the profile of the board owner (for board list joins).

DROP POLICY IF EXISTS "Allow read board owner for shared members" ON public.profiles;
CREATE POLICY "Allow read board owner for shared members" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.expense_boards eb
      JOIN public.shared_users su ON su.board_id = eb.id
      WHERE eb.created_by = profiles.id
        AND su.user_id = auth.uid()
        AND su.is_accepted = true
    )
  );

-- Let shared board members read co-member profiles on the same board.

DROP POLICY IF EXISTS "Allow read co-members on shared boards" ON public.profiles;
CREATE POLICY "Allow read co-members on shared boards" ON public.profiles
  FOR SELECT
  USING (
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
