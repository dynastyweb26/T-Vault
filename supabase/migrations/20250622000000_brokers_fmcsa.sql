-- FMCSA-backed broker identity layer (shared reference data).

CREATE TABLE IF NOT EXISTS brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dot_number text,
  mc_number text,
  legal_name text NOT NULL,
  dba_name text,
  source text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brokers_source_check
    CHECK (source IN ('fmcsa_lookup', 'manual_entry')),
  CONSTRAINT brokers_legal_name_length_check
    CHECK (char_length(legal_name) <= 200),
  CONSTRAINT brokers_dba_name_length_check
    CHECK (dba_name IS NULL OR char_length(dba_name) <= 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS brokers_dot_number_unique
  ON brokers (dot_number)
  WHERE dot_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS brokers_mc_number_unique
  ON brokers (mc_number)
  WHERE mc_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS brokers_legal_name_lower_idx
  ON brokers (lower(legal_name));

CREATE INDEX IF NOT EXISTS brokers_dba_name_lower_idx
  ON brokers (lower(dba_name))
  WHERE dba_name IS NOT NULL;

ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

-- Shared lookup table: authenticated users may read; writes via service role in API routes.
DROP POLICY IF EXISTS "Authenticated read brokers" ON brokers;
CREATE POLICY "Authenticated read brokers"
  ON brokers FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE brokers FROM PUBLIC;
GRANT SELECT ON TABLE brokers TO authenticated;
GRANT ALL ON TABLE brokers TO service_role;
