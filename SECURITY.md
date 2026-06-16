# T-Vault Security Policy

This document defines mandatory security rules for the T-Vault codebase. All code must comply before merge.

## Secrets and API Keys

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or any secret in client code.
- **Never** prefix secrets with `NEXT_PUBLIC_`.
- Service-role clients may only be instantiated in server-side code (`app/api/`, `lib/supabase/admin.ts`, Supabase Edge Functions with env secrets).
- Store third-party API keys in Supabase Edge Function secrets, not in the Next.js bundle.

## Authentication

- Use `supabase.auth.getUser()` (server-validated) for auth decisions — not `getSession()` alone.
- Client-side route guards are UX only; **middleware must enforce** session, profile existence, and onboarding state on protected routes.
- `users.onboarding_completed` in the database is the sole source of truth for onboarding — **never** use `localStorage` as an auth gate.
- Block app routes when a signed-in user has no `users` profile row; redirect to `/splash` for profile creation.
- Validate OAuth `next` redirect parameters: only same-origin relative paths (`/^\/[a-zA-Z0-9/_-]*$/`).

## Authorization (RLS and Defense in Depth)

- Enable RLS on every table in the `public` schema.
- All mutating Supabase queries from application code must filter by `user_id` (or equivalent ownership column) in addition to RLS.
- `ai_usage` is write-restricted: users may `SELECT` their own rows only; inserts/updates/deletes happen via service-role in Edge Functions.
- Storage objects in `game1-documents` must be scoped to `(storage.foldername(name))[1] = auth.uid()::text`.
- Never use `user_metadata` / `raw_user_meta_data` for authorization decisions.

## API Routes

- Every API route must verify the caller with `getUser()` before performing privileged operations.
- Validate and sanitize all inputs server-side (length limits, format checks).
- Return generic error messages to clients — never leak database error details.
- Rate-limit sensitive endpoints (signup, AI parsing) where feasible.

## Edge Functions

- `verify_jwt = true` on all user-facing functions.
- Restrict CORS to known app origins — no wildcard `*` in production.
- Fetch files only from the project's Supabase Storage bucket; never `fetch()` arbitrary URLs (SSRF).
- Log detailed errors server-side; return generic error codes to clients.

## File Uploads

- Validate MIME types and file sizes; do not trust client-provided `file.type` alone.
- Use short-lived signed URLs (≤ 24 hours); refresh on demand.
- Storage upsert requires INSERT + SELECT + UPDATE policies.

## HTTP Security Headers

Next.js must set: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a Content-Security-Policy appropriate for the app.

## Repository Hygiene

- `.env*` files (except `.env.example`) must not be committed.
- `supabase/.temp/` and other local CLI artifacts must be gitignored.
- Do not commit project refs or org metadata that aids targeted attacks.

## Reporting

Report vulnerabilities privately to the repository maintainers. Do not open public issues for undisclosed security flaws.
