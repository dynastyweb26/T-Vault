-- TEMPORARY: Disable free-tier load cap during beta.
-- Original enforcement: supabase/migrations/20250617000002_free_tier_job_limit.sql
-- Trigger: jobs_enforce_free_tier_load_limit
-- Function: enforce_free_tier_load_limit()
--
-- To re-enable: ALTER TABLE jobs ENABLE TRIGGER jobs_enforce_free_tier_load_limit;
-- Also set FREE_TIER_LIMIT_ENABLED = true in lib/pro-tier.ts

ALTER TABLE jobs DISABLE TRIGGER jobs_enforce_free_tier_load_limit;
