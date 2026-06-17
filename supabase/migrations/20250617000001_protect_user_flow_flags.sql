-- Prevent client-side tampering with onboarding/profile-setup flags.

CREATE OR REPLACE FUNCTION protect_user_flow_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND (
    OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed OR
    OLD.profile_setup_completed IS DISTINCT FROM NEW.profile_setup_completed OR
    OLD.profile_setup_skipped IS DISTINCT FROM NEW.profile_setup_skipped
  ) THEN
    NEW.onboarding_completed := OLD.onboarding_completed;
    NEW.profile_setup_completed := OLD.profile_setup_completed;
    NEW.profile_setup_skipped := OLD.profile_setup_skipped;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_flow_flags ON users;

CREATE TRIGGER users_protect_flow_flags
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_flow_flags();
