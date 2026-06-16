-- Manual document entry metadata (BOL/POD fields without file upload)

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS manual_fields jsonb;
