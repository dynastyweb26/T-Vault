-- Persist per-account dismissal of the dashboard App Tour hint banner.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_dismissed_tour_hint boolean NOT NULL DEFAULT false;
