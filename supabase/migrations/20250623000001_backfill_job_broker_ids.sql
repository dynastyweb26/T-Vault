-- Link orphaned jobs (broker_name set, broker_id null) to manual_entry broker rows.

DO $$
DECLARE
  job_rec RECORD;
  broker_uuid uuid;
  normalized_name text;
BEGIN
  FOR job_rec IN
    SELECT id, btrim(broker_name) AS name
    FROM jobs
    WHERE deleted_at IS NULL
      AND broker_name IS NOT NULL
      AND btrim(broker_name) <> ''
      AND broker_id IS NULL
  LOOP
    normalized_name := job_rec.name;

    IF char_length(normalized_name) > 200 THEN
      CONTINUE;
    END IF;

    SELECT b.id
    INTO broker_uuid
    FROM brokers b
    WHERE lower(b.legal_name) = lower(normalized_name)
       OR (
         b.dba_name IS NOT NULL
         AND lower(b.dba_name) = lower(normalized_name)
       )
    ORDER BY b.verified DESC, b.created_at ASC
    LIMIT 1;

    IF broker_uuid IS NULL THEN
      INSERT INTO brokers (legal_name, source, verified)
      VALUES (normalized_name, 'manual_entry', false)
      RETURNING id INTO broker_uuid;
    END IF;

    UPDATE jobs
    SET
      broker_id = broker_uuid,
      updated_at = now()
    WHERE id = job_rec.id
      AND broker_id IS NULL;
  END LOOP;
END $$;
