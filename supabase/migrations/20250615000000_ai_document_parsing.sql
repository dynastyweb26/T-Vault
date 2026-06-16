-- Phase 4: AI Document Parsing
-- Safe for databases where ai_usage (or related tables) already exist with a partial schema.

CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE ai_usage SET created_at = now() WHERE created_at IS NULL;
UPDATE ai_usage SET id = gen_random_uuid() WHERE id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ai_usage WHERE created_at IS NULL) THEN
    ALTER TABLE ai_usage ALTER COLUMN created_at SET DEFAULT now();
    ALTER TABLE ai_usage ALTER COLUMN created_at SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ai_usage WHERE user_id IS NULL) THEN
    ALTER TABLE ai_usage ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_user_id_fkey'
  ) THEN
    ALTER TABLE ai_usage
      ADD CONSTRAINT ai_usage_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'ai_usage_user_id_fkey not added: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_document_id_fkey'
  ) THEN
    ALTER TABLE ai_usage
      ADD CONSTRAINT ai_usage_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'ai_usage_document_id_fkey not added: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.ai_usage'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE ai_usage ADD PRIMARY KEY (id);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'ai_usage primary key not added: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx
  ON ai_usage (user_id, created_at DESC);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS parsed_data jsonb,
  ADD COLUMN IF NOT EXISTS parsing_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS parse_error text;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS ai_fields_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cross_validation_conflicts jsonb;

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ai_usage" ON ai_usage;
CREATE POLICY "Users can read own ai_usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);
