-- Fix 1: Remove permissive ALL policy on ai_usage so users cannot reset AI rate limits.
-- Writes remain service-role only (edge functions bypass RLS).

DROP POLICY IF EXISTS "Users can manage their own ai_usage" ON ai_usage;
