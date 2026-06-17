-- Soft-delete for loads, job-backed detention timer, detention_sessions table

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS detention_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS detention_location_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_detention_location_type_check'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_detention_location_type_check
      CHECK (
        detention_location_type IS NULL
        OR detention_location_type IN ('pickup', 'delivery')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS jobs_user_not_deleted_idx
  ON jobs (user_id, updated_at DESC)
  WHERE deleted_at IS NULL AND (is_template IS NOT TRUE OR is_template IS NULL);

CREATE TABLE IF NOT EXISTS detention_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  location_type text NOT NULL CHECK (location_type IN ('pickup', 'delivery')),
  timer_start timestamptz NOT NULL,
  timer_end timestamptz,
  total_minutes integer,
  amount_owed numeric(12, 2),
  detention_invoice_url text,
  paid text CHECK (paid IS NULL OR paid IN ('yes', 'no', 'waiting')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE detention_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own detention_sessions" ON detention_sessions;
CREATE POLICY "Users read own detention_sessions"
  ON detention_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own detention_sessions" ON detention_sessions;
CREATE POLICY "Users insert own detention_sessions"
  ON detention_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own detention_sessions" ON detention_sessions;
CREATE POLICY "Users update own detention_sessions"
  ON detention_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own detention_sessions" ON detention_sessions;
CREATE POLICY "Users delete own detention_sessions"
  ON detention_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS detention_sessions_job_idx
  ON detention_sessions (job_id, timer_start DESC);
