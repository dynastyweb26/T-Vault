-- Store per-account dashboard tour banner dismissal (syncs across devices).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tour_banner_dismissed boolean NOT NULL DEFAULT false;

-- Backfill from legacy column when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'has_dismissed_tour_hint'
  ) THEN
    UPDATE users
    SET tour_banner_dismissed = true
    WHERE has_dismissed_tour_hint = true
      AND tour_banner_dismissed = false;
  END IF;
END $$;
