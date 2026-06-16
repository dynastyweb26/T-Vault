-- Phase 7: Tax Summary, Cost Per Mile, Broker Ratings, My Loads

CREATE TABLE IF NOT EXISTS broker_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_name text NOT NULL,
  total_loads integer NOT NULL DEFAULT 0,
  on_time_count integer NOT NULL DEFAULT 0,
  late_count integer NOT NULL DEFAULT 0,
  problem_count integer NOT NULL DEFAULT 0,
  detention_unpaid_count integer NOT NULL DEFAULT 0,
  avg_days_to_pay numeric(6, 2),
  last_worked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, broker_name)
);

ALTER TABLE broker_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own broker_ratings" ON broker_ratings;
CREATE POLICY "Users read own broker_ratings"
  ON broker_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own broker_ratings" ON broker_ratings;
CREATE POLICY "Users insert own broker_ratings"
  ON broker_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own broker_ratings" ON broker_ratings;
CREATE POLICY "Users update own broker_ratings"
  ON broker_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own broker_ratings" ON broker_ratings;
CREATE POLICY "Users delete own broker_ratings"
  ON broker_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS broker_rating text,
  ADD COLUMN IF NOT EXISTS broker_rating_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_broker_rating_check'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_broker_rating_check
      CHECK (broker_rating IS NULL OR broker_rating IN ('on_time', 'late', 'problem'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS broker_ratings_user_broker_idx
  ON broker_ratings (user_id, broker_name);

CREATE INDEX IF NOT EXISTS jobs_user_status_idx
  ON jobs (user_id, status);
