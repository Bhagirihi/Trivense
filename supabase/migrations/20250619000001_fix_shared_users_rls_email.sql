-- Fix RLS policies: auth.users is not readable by authenticated role in policies

DROP POLICY IF EXISTS "Can read shared items" ON public.shared_users;
CREATE POLICY "Can read shared items" ON public.shared_users FOR SELECT
  USING (
    shared_by = auth.uid()
    OR user_id = auth.uid()
    OR lower(shared_with) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Shared users update by inviter or invitee" ON public.shared_users;
CREATE POLICY "Shared users update by inviter or invitee" ON public.shared_users FOR UPDATE
  USING (
    shared_by = auth.uid()
    OR user_id = auth.uid()
    OR lower(shared_with) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
