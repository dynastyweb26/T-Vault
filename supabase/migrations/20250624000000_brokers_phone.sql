-- Normalized US phone from FMCSA carrier.telephone (nullable).

ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE brokers
  DROP CONSTRAINT IF EXISTS brokers_phone_length_check;

ALTER TABLE brokers
  ADD CONSTRAINT brokers_phone_length_check
    CHECK (phone IS NULL OR phone ~ '^\d{10}$');

COMMENT ON COLUMN brokers.phone IS
  'Normalized 10-digit US phone from FMCSA carrier.telephone; null when unknown.';
