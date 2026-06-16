@AGENTS.md

# T-Vault Agent Rules

## Authorization model

T-Vault has **one user role: authenticated owner**.

An authenticated user can only read, write, update, and delete their own jobs, documents, expenses, and invoices. No user can access another user's data under any circumstance.

Unauthenticated requests must be rejected **before** touching any database or API.

### Implementation requirements

- Enforce ownership with Postgres RLS on every table in `public`.
- Add `.eq("user_id", userId)` (or equivalent) on all application mutations as defense in depth.
- Verify sessions with `supabase.auth.getUser()` on the server — never trust client-only guards or `getSession()` alone.
- Reject unauthenticated access in middleware and API route handlers before any query runs.

## File uploads

T-Vault accepts file uploads for **trucking documents only**.

### Accepted types

Strictly:

- `image/jpeg`
- `image/png`
- `application/pdf`

### Validation (mandatory, server-side)

Every upload must be validated by reading the **actual file buffer magic bytes** — not just the MIME type or file extension, because those can be faked.

Any file that does not match these exact types must be rejected **immediately**, before it touches Supabase Storage.

### Size limits

- **Max file size: 10 MB** before upload.
- **Compress images server-side to under 1 MB** after upload.

### Filename rules

- Reject any filename containing special characters, scripts, or executable patterns.
- File names must be **regenerated server-side** using the user's ID and a timestamp — never use the original filename from the user's device.

### Error handling

Any malformed, oversized, or suspicious payload must be rejected with a **generic error message**. Never reveal why it was rejected in detail.

### Storage layout

Store files under `{user_id}/{job_id}/{document_type}_{timestamp}.{ext}` in the `game1-documents` bucket. Storage RLS must scope access to `(storage.foldername(name))[1] = auth.uid()::text`.
