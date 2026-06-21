-- Shared API rate-limit counters for Next.js routes (serverless-safe stopgap).
-- Replace with Upstash Redis when added; this table avoids per-instance Map resets.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_rate_limits_attempt_count_check CHECK (attempt_count >= 0)
);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No authenticated/anon policies: only service_role (API routes via admin client).

CREATE OR REPLACE FUNCTION check_and_record_api_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window interval;
  v_count integer;
  v_window_start timestamptz;
  v_retry_after integer;
BEGIN
  IF p_bucket_key IS NULL
     OR length(trim(p_bucket_key)) = 0
     OR p_max_attempts IS NULL
     OR p_max_attempts < 1
     OR p_window_seconds IS NULL
     OR p_window_seconds < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after_ms', 60000);
  END IF;

  v_window := make_interval(secs => p_window_seconds);

  PERFORM pg_advisory_xact_lock(hashtext(p_bucket_key));

  SELECT attempt_count, window_start
  INTO v_count, v_window_start
  FROM api_rate_limits
  WHERE bucket_key = p_bucket_key;

  IF NOT FOUND OR v_window_start + v_window <= v_now THEN
    INSERT INTO api_rate_limits (bucket_key, attempt_count, window_start)
    VALUES (p_bucket_key, 1, v_now)
    ON CONFLICT (bucket_key) DO UPDATE
      SET attempt_count = 1,
          window_start = EXCLUDED.window_start;
    RETURN jsonb_build_object('allowed', true, 'retry_after_ms', 0);
  END IF;

  IF v_count >= p_max_attempts THEN
    v_retry_after := GREATEST(
      1,
      ceil(EXTRACT(EPOCH FROM (v_window_start + v_window - v_now)))::integer
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_ms', v_retry_after * 1000
    );
  END IF;

  UPDATE api_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE bucket_key = p_bucket_key;

  RETURN jsonb_build_object('allowed', true, 'retry_after_ms', 0);
END;
$$;

REVOKE ALL ON TABLE api_rate_limits FROM PUBLIC;
REVOKE ALL ON FUNCTION check_and_record_api_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT ALL ON TABLE api_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_and_record_api_rate_limit(text, integer, integer) TO service_role;
