-- Server-side enforcement of free-tier load limit (1 non-template job).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS truck_info text;

CREATE OR REPLACE FUNCTION enforce_free_tier_load_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
  active_load_count integer;
BEGIN
  IF NEW.is_template IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid()
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(pro_tier, 'free') INTO user_tier
  FROM users
  WHERE id = NEW.user_id;

  IF user_tier IN ('pro', 'waitlist') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer INTO active_load_count
  FROM jobs
  WHERE user_id = NEW.user_id
    AND is_template IS NOT TRUE;

  IF active_load_count >= 1 THEN
    RAISE EXCEPTION 'free_tier_load_limit'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_enforce_free_tier_load_limit ON jobs;

CREATE TRIGGER jobs_enforce_free_tier_load_limit
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_free_tier_load_limit();
