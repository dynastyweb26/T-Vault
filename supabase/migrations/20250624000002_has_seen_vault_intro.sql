-- One-time dashboard intro for Profile > My Documents (document vault).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_seen_vault_intro boolean NOT NULL DEFAULT false;
