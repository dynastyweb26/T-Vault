-- Fix 4 Part A: Replace broad ALL policy with granular UPDATE for upsert support.

CREATE POLICY "Users update own pro_waitlist" ON pro_waitlist
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own pro_waitlist" ON pro_waitlist;
