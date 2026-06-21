-- Link loads to shared broker identity records.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS broker_id uuid REFERENCES brokers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jobs_broker_id_idx
  ON jobs (broker_id)
  WHERE broker_id IS NOT NULL;
