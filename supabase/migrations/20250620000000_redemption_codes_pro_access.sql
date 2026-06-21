-- Redemption-code Pro access: revocable, server-enforced.
-- Replaces client-writable pro_tier as the access gate.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  tier_granted text NOT NULL DEFAULT 'pro',
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT redemption_codes_code_unique UNIQUE (code),
  CONSTRAINT redemption_codes_status_check
    CHECK (status IN ('active', 'revoked')),
  CONSTRAINT redemption_codes_tier_granted_check
    CHECK (tier_granted IN ('pro'))
);

CREATE INDEX IF NOT EXISTS redemption_codes_code_idx
  ON redemption_codes (code);

CREATE TABLE IF NOT EXISTS code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id uuid NOT NULL REFERENCES redemption_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT code_redemptions_user_code_unique UNIQUE (user_id, code_id)
);

CREATE INDEX IF NOT EXISTS code_redemptions_user_id_idx
  ON code_redemptions (user_id);

CREATE INDEX IF NOT EXISTS code_redemptions_code_id_idx
  ON code_redemptions (code_id);

CREATE TABLE IF NOT EXISTS redemption_failed_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS redemption_failed_attempts_user_time_idx
  ON redemption_failed_attempts (user_id, attempted_at DESC);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_status_check
    CHECK (status IN ('active', 'inactive', 'canceled', 'past_due'))
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own code_redemptions" ON code_redemptions;
CREATE POLICY "Users read own code_redemptions"
  ON code_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own subscription" ON user_subscriptions;
CREATE POLICY "Users read own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Lock users.pro_tier from client writes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION protect_user_pro_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND OLD.pro_tier IS DISTINCT FROM NEW.pro_tier THEN
    NEW.pro_tier := OLD.pro_tier;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_pro_tier ON users;

CREATE TRIGGER users_protect_pro_tier
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_pro_tier();

-- ---------------------------------------------------------------------------
-- user_has_pro_access(user_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION user_has_pro_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM user_subscriptions us
      WHERE us.user_id = p_user_id
        AND us.status = 'active'
        AND (
          us.current_period_end IS NULL
          OR us.current_period_end > now()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM code_redemptions cr
      JOIN redemption_codes rc ON rc.id = cr.code_id
      WHERE cr.user_id = p_user_id
        AND rc.status = 'active'
        AND (
          rc.expires_at IS NULL
          OR rc.expires_at > now()
        )
    );
$$;

REVOKE ALL ON FUNCTION user_has_pro_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_has_pro_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_pro_access(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- redeem_code(code text)
-- Rate limit: max 5 failed attempts per user in any rolling 5-minute window.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION redeem_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_code_id uuid;
  v_already_redeemed boolean := false;
  v_failed_count integer;
  v_rate_window interval := interval '5 minutes';
  v_rate_limit integer := 5;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT COUNT(*)::integer
  INTO v_failed_count
  FROM redemption_failed_attempts rfa
  WHERE rfa.user_id = v_user_id
    AND rfa.attempted_at > now() - v_rate_window;

  IF v_failed_count >= v_rate_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) = 0 OR length(trim(p_code)) > 64 THEN
    INSERT INTO redemption_failed_attempts (user_id)
    VALUES (v_user_id);

    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT rc.id
  INTO v_code_id
  FROM redemption_codes rc
  WHERE rc.code = trim(p_code)
    AND rc.status = 'active'
    AND (rc.expires_at IS NULL OR rc.expires_at > now());

  IF v_code_id IS NULL THEN
    INSERT INTO redemption_failed_attempts (user_id)
    VALUES (v_user_id);

    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM code_redemptions cr
    WHERE cr.user_id = v_user_id
      AND cr.code_id = v_code_id
  )
  INTO v_already_redeemed;

  INSERT INTO code_redemptions (user_id, code_id)
  VALUES (v_user_id, v_code_id)
  ON CONFLICT (user_id, code_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'already_redeemed', v_already_redeemed,
    'has_pro_access', user_has_pro_access(v_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION redeem_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_code(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Free-tier load cap (1 active non-template load)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_free_tier_load_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  IF user_has_pro_access(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer INTO active_load_count
  FROM jobs
  WHERE user_id = NEW.user_id
    AND is_template IS NOT TRUE
    AND deleted_at IS NULL;

  IF active_load_count >= 1 THEN
    RAISE EXCEPTION 'free_tier_load_limit'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE jobs ENABLE TRIGGER jobs_enforce_free_tier_load_limit;

-- ---------------------------------------------------------------------------
-- Seed codes
-- ---------------------------------------------------------------------------

INSERT INTO redemption_codes (code, tier_granted, status, expires_at)
VALUES
  (
    'TVAULT-FOUNDER-K7M2X9',
    'pro',
    'active',
    NULL
  ),
  (
    'TVAULT-BETA-2026-Q4R8L3',
    'pro',
    'active',
    now() + interval '4 months'
  )
ON CONFLICT (code) DO NOTHING;
