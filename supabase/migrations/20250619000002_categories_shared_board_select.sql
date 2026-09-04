-- Allow users to read categories used on expense boards they own or are shared on.
-- Without this, analytics joins return null categories for shared-board expenses.

DROP POLICY IF EXISTS "Users can view categories on accessible boards" ON public.categories;
CREATE POLICY "Users can view categories on accessible boards" ON public.categories
  FOR SELECT
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
