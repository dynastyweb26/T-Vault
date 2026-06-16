# T-Vault Deep Security Reference

Companion to [SECURITY.md](./SECURITY.md). This document explains *why* each rule exists and how to verify compliance.

## 1. Service Role Key Exposure

The Supabase service role bypasses RLS. If it reaches the browser (via `NEXT_PUBLIC_` or bundled server code imported by client components), any user can read/write all data.

**Verify:** `grep -r "SERVICE_ROLE" --include="*.ts" --include="*.tsx"` — only `lib/supabase/admin.ts`, `app/api/`, and edge functions should reference it. No `"use client"` file may import `admin.ts`.

## 2. getSession() vs getUser()

`getSession()` reads the JWT from cookies/local storage without contacting the auth server. A revoked or tampered token may still appear valid.

`getUser()` validates the JWT with Supabase Auth on every call.

**Applies to:** `auth-provider.tsx`, `splash/page.tsx`, and any boot-time auth check.

## 3. Client-Only Route Guards

`RouteGuard` runs in the browser. A determined user can render protected pages by disabling JavaScript or patching React state.

**Required server enforcement** in `lib/supabase/middleware.ts`:

| Condition | Redirect |
|-----------|----------|
| No session on protected route | `/splash` |
| Session but no `users` row | `/splash` |
| `onboarding_completed = false` on app route (except `/onboarding`, `/profile-setup`) | `/onboarding` |
| `onboarding_completed = true` on `/onboarding` | `/dashboard` |

## 4. localStorage Onboarding Bypass

`localStorage.setItem("tvault_onboarding_seen", userId)` lets any user skip onboarding without a database write.

**Fix:** Remove `markOnboardingComplete` / `hasCompletedOnboarding` localStorage fallback. Only read `profile.onboarding_completed`.

## 5. Open Redirect in OAuth Callback

`NextResponse.redirect(\`${origin}${next}\`)` with unvalidated `next` allows:

- `next=@evil.com` → `https://yourapp.com@evil.com` (phishing)
- `next=//evil.com` → protocol-relative escape

**Fix:** `validateRedirectPath()` in `lib/security.ts` — allow only `/path` matching `/^\/[a-zA-Z0-9/_-]*$/`.

## 6. ai_usage Rate Limit Bypass

If users have INSERT/UPDATE/DELETE on `ai_usage`, they can delete recent rows to reset the 10/hour AI parsing counter.

**Fix:**

```sql
DROP POLICY "Service role manages ai_usage";  -- misnamed; granted ALL to users
-- Keep SELECT-only policy for users
```

Edge function uses service-role client for `ai_usage` INSERT and rate-count queries.

## 7. SSRF in parse-document

`fetch(document.file_url)` follows any URL stored in the database. A malicious `file_url` could target internal metadata endpoints (`169.254.169.254`, etc.).

**Fix:** Extract the storage path from the URL, verify it starts with `{user_id}/`, and download via `supabase.storage.from(bucket).download(path)`.

## 8. IDOR via Missing user_id Filters

RLS is the backstop, not the only control. Application code must add `.eq("user_id", userId)` on every UPDATE/DELETE (and ownership-scoped INSERT).

**Tables:** `jobs`, `documents`, `expenses`, `payments`, `detention_sessions`, `broker_ratings`, `users`, `milestones`.

## 9. Signed URL TTL

Year-long signed URLs (`60 * 60 * 24 * 365`) mean a leaked URL grants access for 12 months. Freight documents (BOL, rate cons) are sensitive.

**Fix:** TTL ≤ 86400 seconds (24 hours). Regenerate on preview/download.

## 10. Error Information Disclosure

Returning `insertError.message` or Anthropic API error bodies to clients reveals schema details and internal service state.

**Fix:** Log server-side; return stable error codes (`parse_failed`, `profile_save_failed`).

## 11. complete-signup Hardening

- Validate `fullName` with `TEXT_LIMITS.fullName` and `sanitizeText()`.
- Validate `referredBy` with `validateReferralCode()`.
- Check API response in `sign-up/page.tsx` and `splash/page.tsx`.

## 12. Storage RLS

Bucket `game1-documents` path convention: `{user_id}/{job_id}/{filename}`.

Required policies (authenticated role):

- INSERT: `(storage.foldername(name))[1] = auth.uid()::text`
- SELECT, UPDATE, DELETE: same folder check

Upsert (`upload path with upsert: true`) requires INSERT + SELECT + UPDATE.

## 13. Security Headers

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | Restrict `default-src 'self'`; allow Supabase storage/img domains |

## 14. CORS on Edge Functions

`Access-Control-Allow-Origin: *` lets any website invoke the function with a stolen JWT from the user's browser session.

**Fix:** Set `ALLOWED_ORIGIN` secret; echo only matching `Origin` header.

## 15. Compliance Checklist (PR Review)

- [ ] No secrets in client bundle
- [ ] `getUser()` for auth gates
- [ ] Middleware enforces profile + onboarding
- [ ] No localStorage auth bypasses
- [ ] OAuth `next` validated
- [ ] Mutations include `user_id` filter
- [ ] Edge functions: storage-only fetch, service-role for privileged writes
- [ ] Generic client error messages
- [ ] Security headers in `next.config.ts`
- [ ] RLS policies committed in `supabase/migrations/`
- [ ] `supabase/.temp/` gitignored
