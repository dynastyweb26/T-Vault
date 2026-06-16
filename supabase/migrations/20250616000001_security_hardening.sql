-- Security hardening: ai_usage write restrictions and storage policies

DROP POLICY IF EXISTS "Service role manages ai_usage" ON ai_usage;

-- Users may only read their own usage records; writes use service_role in edge functions.

INSERT INTO storage.buckets (id, name, public)
VALUES ('game1-documents', 'game1-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;

CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'game1-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
