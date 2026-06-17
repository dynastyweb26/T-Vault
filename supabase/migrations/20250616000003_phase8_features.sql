-- Phase 8: Retention, Voice Notes, Document Wallet, Notifications, Pro Waitlist

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS pro_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS upgrade_dismissed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_pro_tier_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_pro_tier_check
      CHECK (pro_tier IS NULL OR pro_tier IN ('free', 'waitlist', 'pro'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_theme_preference_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_theme_preference_check
      CHECK (theme_preference IS NULL OR theme_preference IN ('dark', 'light', 'system'));
  END IF;
END $$;

-- Voice notes
CREATE TABLE IF NOT EXISTS voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript text,
  category text NOT NULL DEFAULT 'general',
  suggested_action text,
  extracted_amount numeric(12, 2),
  extracted_category text,
  extracted_description text,
  audio_path text,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own voice_notes"
  ON voice_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own voice_notes"
  ON voice_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own voice_notes"
  ON voice_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own voice_notes"
  ON voice_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS voice_notes_user_created_idx
  ON voice_notes (user_id, created_at DESC);

-- Document wallet
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  custom_name text,
  file_path text,
  file_url text,
  expiry_date date,
  reminder_sent_60 boolean NOT NULL DEFAULT false,
  reminder_sent_30 boolean NOT NULL DEFAULT false,
  reminder_sent_7 boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_type, custom_name)
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own user_documents"
  ON user_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own user_documents"
  ON user_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own user_documents"
  ON user_documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own user_documents"
  ON user_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_documents_user_expiry_idx
  ON user_documents (user_id, expiry_date);

-- Pro waitlist
CREATE TABLE IF NOT EXISTS pro_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE pro_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pro_waitlist"
  ON pro_waitlist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pro_waitlist"
  ON pro_waitlist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  weekly_earnings boolean NOT NULL DEFAULT true,
  missing_docs boolean NOT NULL DEFAULT true,
  invoice_reminder boolean NOT NULL DEFAULT true,
  payment_overdue boolean NOT NULL DEFAULT true,
  streak_at_risk boolean NOT NULL DEFAULT true,
  document_expiry boolean NOT NULL DEFAULT true,
  welcome boolean NOT NULL DEFAULT true,
  push_subscription jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notification_preferences"
  ON notification_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own notification_preferences"
  ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own notification_preferences"
  ON notification_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- In-app / push notification queue
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_sent_idx
  ON notifications (user_id, sent_at DESC);

-- Account deletion cleanup queue
CREATE TABLE IF NOT EXISTS cleanup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cleanup_queue ENABLE ROW LEVEL SECURITY;

-- No user policies — service role only

-- Extend milestones for streak_30
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'milestones_milestone_type_check'
  ) THEN
    ALTER TABLE milestones DROP CONSTRAINT milestones_milestone_type_check;
  END IF;
END $$;

ALTER TABLE milestones
  ADD CONSTRAINT milestones_milestone_type_check
  CHECK (milestone_type IN (
    'first_load', 'loads_10', 'loads_50', 'loads_100',
    'first_10k_month', 'best_month', 'streak_30'
  ));

-- Storage policies for voice and wallet paths under game1-documents
DROP POLICY IF EXISTS "Users upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;

CREATE POLICY "Users upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
