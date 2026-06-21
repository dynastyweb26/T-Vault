-- Star-based broker ratings linked to shared broker identity records.
-- Renames the legacy aggregate-by-name table so the new model can use broker_ratings.

ALTER TABLE IF EXISTS broker_ratings RENAME TO broker_rating_aggregates;

ALTER INDEX IF EXISTS broker_ratings_user_broker_idx
  RENAME TO broker_rating_aggregates_user_broker_idx;

CREATE TABLE broker_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_on_time_stars smallint NOT NULL,
  ease_of_work_stars smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broker_ratings_paid_on_time_stars_check
    CHECK (paid_on_time_stars BETWEEN 1 AND 5),
  CONSTRAINT broker_ratings_ease_of_work_stars_check
    CHECK (ease_of_work_stars BETWEEN 1 AND 5),
  UNIQUE (broker_id, user_id)
);

CREATE INDEX broker_ratings_broker_id_idx
  ON broker_ratings (broker_id);

CREATE INDEX broker_ratings_user_id_idx
  ON broker_ratings (user_id);

ALTER TABLE broker_ratings ENABLE ROW LEVEL SECURITY;

-- Free and Pro users may rate brokers they have worked with.
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

-- Reading/searching ratings requires Pro; writing does not.
DROP POLICY IF EXISTS "Pro users read broker_ratings" ON broker_ratings;
CREATE POLICY "Pro users read broker_ratings"
  ON broker_ratings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND user_has_pro_access(auth.uid())
  );

REVOKE ALL ON TABLE broker_ratings FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE broker_ratings TO authenticated;
GRANT ALL ON TABLE broker_ratings TO service_role;
