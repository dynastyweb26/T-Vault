-- Ensure onboarding columns exist and users can read/update their own profile row.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_setup_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_setup_skipped boolean DEFAULT false;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON users;
CREATE POLICY "Users read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON users;
CREATE POLICY "Users update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
